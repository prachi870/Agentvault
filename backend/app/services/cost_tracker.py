"""Model evaluation and cost tracking (Phase 7).

Tracks token usage, estimated cost per query, and model performance metrics. This enables:
- Per-query cost attribution (useful for chargebacks in multi-tenant setups)
- Model comparison (run the same queries against different providers and compare quality/cost)
- Budget monitoring and alerting
- Optimization opportunities (identifying expensive low-value queries)

Token counting is estimated (chars / 4 for English text) when tiktoken is not installed.
Cost estimates use published pricing from major providers as of 2025.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)

# --- Token estimation ---

_tokenizer = None
_tokenizer_model = None


def _estimate_tokens_tiktoken(text: str, model: str) -> int:
    """Use tiktoken for accurate token counting (OpenAI models)."""
    global _tokenizer, _tokenizer_model
    try:
        import tiktoken
        if _tokenizer is None or _tokenizer_model != model:
            try:
                _tokenizer = tiktoken.encoding_for_model(model)
            except KeyError:
                _tokenizer = tiktoken.get_encoding("cl100k_base")
            _tokenizer_model = model
        return len(_tokenizer.encode(text))
    except ImportError:
        return len(text) // 4  # rough estimate


def estimate_tokens(text: str, model: str = "") -> int:
    """Estimate the number of tokens in text. Uses tiktoken if available, else chars/4."""
    if not text:
        return 0
    if model and ("gpt" in model or "text-embedding" in model):
        return _estimate_tokens_tiktoken(text, model)
    return max(1, len(text) // 4)


# --- Cost tables (USD per 1M tokens, as of 2025) ---

COST_PER_MILLION_TOKENS: dict[str, dict[str, float]] = {
    # OpenAI
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00},
    "text-embedding-3-small": {"input": 0.02, "output": 0.0},
    "text-embedding-3-large": {"input": 0.13, "output": 0.0},
    # Anthropic
    "claude-sonnet-5": {"input": 3.00, "output": 15.00},
    "claude-haiku-3.5": {"input": 0.80, "output": 4.00},
    # Google
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
    "gemini-2.5-pro": {"input": 1.25, "output": 10.00},
    "models/text-embedding-004": {"input": 0.00, "output": 0.0},  # free tier
    # Fallback
    "local-extractive": {"input": 0.0, "output": 0.0},
    "hash": {"input": 0.0, "output": 0.0},
}


def _get_cost_rate(model: str) -> dict[str, float]:
    """Get cost per million tokens for a model. Returns zero for unknown models."""
    if model in COST_PER_MILLION_TOKENS:
        return COST_PER_MILLION_TOKENS[model]
    # Try partial match (e.g. "openai:gpt-4o-mini" -> "gpt-4o-mini")
    for key, rate in COST_PER_MILLION_TOKENS.items():
        if key in model:
            return rate
    return {"input": 0.0, "output": 0.0}


# --- Cost tracking data structures ---

@dataclass
class TokenUsage:
    """Token usage for a single operation."""
    input_tokens: int = 0
    output_tokens: int = 0
    model: str = ""
    operation: str = ""  # "embed", "plan", "generate", "rerank"

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class QueryCostBreakdown:
    """Complete cost breakdown for a single query."""
    query_id: str = ""
    total_cost_usd: float = 0.0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    operations: list[dict] = field(default_factory=list)
    model_name: str = ""
    embedding_model: str = ""
    timestamp: str = ""

    def add_operation(self, name: str, model: str, input_tokens: int, output_tokens: int = 0) -> None:
        rate = _get_cost_rate(model)
        input_cost = (input_tokens / 1_000_000) * rate["input"]
        output_cost = (output_tokens / 1_000_000) * rate["output"]
        op_cost = input_cost + output_cost

        self.operations.append({
            "operation": name,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": round(op_cost, 8),
        })
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        self.total_cost_usd += op_cost

    def to_dict(self) -> dict[str, Any]:
        return {
            "query_id": self.query_id,
            "total_cost_usd": round(self.total_cost_usd, 8),
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "model": self.model_name,
            "embedding_model": self.embedding_model,
            "operations": self.operations,
            "timestamp": self.timestamp,
        }


class CostTracker:
    """Tracks costs across queries. Thread-safe via append-only list."""

    def __init__(self, enabled: bool = True) -> None:
        self.enabled = enabled
        self._history: list[QueryCostBreakdown] = []
        self._total_cost: float = 0.0
        self._total_queries: int = 0

    def start_query(self, query_id: str, llm_model: str, embedding_model: str) -> QueryCostBreakdown:
        """Begin tracking costs for a new query."""
        breakdown = QueryCostBreakdown(
            query_id=query_id,
            model_name=llm_model,
            embedding_model=embedding_model,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        return breakdown

    def finish_query(self, breakdown: QueryCostBreakdown) -> None:
        """Record the completed query cost breakdown."""
        if not self.enabled:
            return
        self._history.append(breakdown)
        self._total_cost += breakdown.total_cost_usd
        self._total_queries += 1

    def track_embedding(self, breakdown: QueryCostBreakdown, texts: list[str], model: str) -> None:
        """Track embedding costs for a list of texts."""
        if not self.enabled:
            return
        total_tokens = sum(estimate_tokens(t, model) for t in texts)
        breakdown.add_operation("embed", model, total_tokens, 0)

    def track_llm_call(
        self, breakdown: QueryCostBreakdown, model: str,
        input_text: str, output_text: str, operation: str = "generate"
    ) -> None:
        """Track LLM call costs."""
        if not self.enabled:
            return
        input_tokens = estimate_tokens(input_text, model)
        output_tokens = estimate_tokens(output_text, model)
        breakdown.add_operation(operation, model, input_tokens, output_tokens)

    def get_summary(self, last_n: int = 100) -> dict[str, Any]:
        """Get a summary of tracked costs."""
        recent = self._history[-last_n:] if self._history else []
        if not recent:
            return {
                "total_queries": 0,
                "total_cost_usd": 0.0,
                "avg_cost_per_query_usd": 0.0,
                "total_input_tokens": 0,
                "total_output_tokens": 0,
            }

        return {
            "total_queries": self._total_queries,
            "total_cost_usd": round(self._total_cost, 6),
            "avg_cost_per_query_usd": round(self._total_cost / self._total_queries, 8) if self._total_queries else 0.0,
            "total_input_tokens": sum(q.total_input_tokens for q in recent),
            "total_output_tokens": sum(q.total_output_tokens for q in recent),
            "recent_queries": len(recent),
            "cost_by_model": self._cost_by_model(recent),
            "cost_by_operation": self._cost_by_operation(recent),
        }

    def _cost_by_model(self, queries: list[QueryCostBreakdown]) -> dict[str, float]:
        by_model: dict[str, float] = {}
        for q in queries:
            for op in q.operations:
                model = op["model"]
                by_model[model] = by_model.get(model, 0.0) + op["cost_usd"]
        return {k: round(v, 6) for k, v in sorted(by_model.items(), key=lambda x: -x[1])}

    def _cost_by_operation(self, queries: list[QueryCostBreakdown]) -> dict[str, float]:
        by_op: dict[str, float] = {}
        for q in queries:
            for op in q.operations:
                name = op["operation"]
                by_op[name] = by_op.get(name, 0.0) + op["cost_usd"]
        return {k: round(v, 6) for k, v in sorted(by_op.items(), key=lambda x: -x[1])}


# Module-level singleton
_tracker: CostTracker | None = None


def get_cost_tracker(enabled: bool = True) -> CostTracker:
    """Get or create the global cost tracker singleton."""
    global _tracker
    if _tracker is None:
        _tracker = CostTracker(enabled=enabled)
    return _tracker

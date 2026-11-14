"""Multi-agent collaboration system (Phase 7).

A supervisor agent that can spawn specialist sub-agents for complex queries that require
different types of reasoning or domain expertise. The supervisor:

1. Analyses the query complexity and decides if multi-agent is needed
2. Routes to specialist agents (research, synthesis, fact-check, comparison)
3. Merges results from multiple agents into a unified answer

This extends the existing LangGraph pipeline by wrapping the single-agent RAG graph
with a higher-level orchestration layer. When disabled (default), the original single-agent
pipeline runs as before.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from app.core.text import tokenize

log = logging.getLogger(__name__)


class AgentType(str, Enum):
    """Specialist agent types."""
    RESEARCH = "research"        # Deep multi-source retrieval
    SYNTHESIS = "synthesis"      # Combine information from multiple sources
    FACT_CHECK = "fact_check"    # Verify specific claims or numbers
    COMPARISON = "comparison"    # Compare/contrast information
    TEMPORAL = "temporal"        # Time-sensitive or historical queries


@dataclass
class AgentTask:
    """A task assigned to a specialist agent."""
    agent_type: AgentType
    sub_query: str
    context_hint: str = ""
    priority: int = 1  # 1 = highest


@dataclass
class AgentResult:
    """Result from a specialist agent."""
    agent_type: AgentType
    sub_query: str
    answer: str
    citations: list[dict] = field(default_factory=list)
    confidence: float = 0.0
    status: str = "completed"  # completed | failed | timeout


@dataclass
class SupervisorDecision:
    """The supervisor's routing decision."""
    needs_multi_agent: bool
    tasks: list[AgentTask] = field(default_factory=list)
    rationale: str = ""
    merge_strategy: str = "sequential"  # sequential | parallel | weighted


# --- Complexity analysis heuristics ---

_COMPARISON_PATTERNS = re.compile(
    r"\b(compar[eing]|versus|vs\.?|differ(?:ence|ent)|contrast|between\b.+\band\b|pros?\s+(?:and\s+)?cons?)\b", re.I
)
_TEMPORAL_PATTERNS = re.compile(
    r"\b(timeline|history|evolution|when did|changed? (?:since|over|from)|trends?|previously|before\s+and\s+after)\b", re.I
)
_MULTI_TOPIC_PATTERNS = re.compile(
    r"\b(and also|as well as|in addition|furthermore|moreover|plus|along with)\b", re.I
)
_VERIFICATION_PATTERNS = re.compile(
    r"\b(is it true|verify|fact[- ]check|confirm|accurate|correct that|really)\b", re.I
)


def analyse_complexity(question: str) -> SupervisorDecision:
    """Analyse a query to determine if multi-agent collaboration would help.

    Uses heuristic patterns to identify queries that benefit from specialist agents.
    This runs BEFORE the main RAG pipeline and is cheap (no LLM calls).
    """
    tokens = tokenize(question, drop_stopwords=False)
    word_count = len(tokens)

    tasks: list[AgentTask] = []
    rationale_parts: list[str] = []

    # Short simple questions don't need multi-agent
    if word_count < 8:
        return SupervisorDecision(needs_multi_agent=False, rationale="Simple short query")

    # Check for comparison queries
    if _COMPARISON_PATTERNS.search(question):
        # Split into the items being compared
        parts = re.split(r"\b(?:vs\.?|versus|compared?\s+(?:to|with)|and)\b", question, flags=re.I)
        if len(parts) >= 2:
            for i, part in enumerate(parts[:3]):
                part = part.strip().strip("?.,;")
                if len(part) > 5:
                    tasks.append(AgentTask(
                        agent_type=AgentType.COMPARISON,
                        sub_query=part,
                        context_hint=f"Part {i + 1} of comparison query",
                        priority=1,
                    ))
            rationale_parts.append("comparison query detected")

    # Check for temporal/historical queries
    if _TEMPORAL_PATTERNS.search(question):
        tasks.append(AgentTask(
            agent_type=AgentType.TEMPORAL,
            sub_query=question,
            context_hint="Focus on dates, timelines, and changes over time",
            priority=1,
        ))
        rationale_parts.append("temporal/historical analysis needed")

    # Check for fact-checking requests
    if _VERIFICATION_PATTERNS.search(question):
        tasks.append(AgentTask(
            agent_type=AgentType.FACT_CHECK,
            sub_query=question,
            context_hint="Verify claims against multiple sources",
            priority=1,
        ))
        rationale_parts.append("fact-checking requested")

    # Check for multi-topic queries
    if _MULTI_TOPIC_PATTERNS.search(question) or question.count("?") > 1:
        # Split into sub-topics
        sub_qs = re.split(r"[?;]\s*|\b(?:and also|as well as|in addition)\b", question, flags=re.I)
        sub_qs = [q.strip().strip("?.,; ") for q in sub_qs if len(q.strip()) > 10]
        if len(sub_qs) >= 2:
            for sq in sub_qs[:4]:
                tasks.append(AgentTask(
                    agent_type=AgentType.RESEARCH,
                    sub_query=sq,
                    context_hint="One sub-topic of a multi-topic question",
                    priority=2,
                ))
            rationale_parts.append(f"multi-topic query split into {len(sub_qs)} sub-queries")

    # Complex long queries get a synthesis agent
    if word_count > 25 and not tasks:
        tasks.append(AgentTask(
            agent_type=AgentType.SYNTHESIS,
            sub_query=question,
            context_hint="Complex query requiring synthesis from multiple sources",
            priority=1,
        ))
        rationale_parts.append("complex query benefits from synthesis")

    needs_multi = len(tasks) >= 2
    merge = "parallel" if all(t.agent_type == AgentType.RESEARCH for t in tasks) else "sequential"

    return SupervisorDecision(
        needs_multi_agent=needs_multi,
        tasks=tasks,
        rationale="; ".join(rationale_parts) if rationale_parts else "single-agent sufficient",
        merge_strategy=merge,
    )


def merge_agent_results(results: list[AgentResult], strategy: str = "sequential") -> dict[str, Any]:
    """Merge results from multiple specialist agents into a unified response.

    Strategies:
    - sequential: concatenate answers in order, dedup citations
    - parallel: pick the highest-confidence answer, include all citations
    - weighted: weighted combination based on confidence
    """
    if not results:
        return {"answer": "", "citations": [], "confidence": 0.0}

    successful = [r for r in results if r.status == "completed" and r.answer]
    if not successful:
        return {"answer": "", "citations": [], "confidence": 0.0}

    all_citations: list[dict] = []
    seen_chunks: set[str] = set()

    if strategy == "parallel":
        # Pick the best answer, merge all citations
        best = max(successful, key=lambda r: r.confidence)
        for r in successful:
            for c in r.citations:
                cid = c.get("chunk_id", "")
                if cid not in seen_chunks:
                    seen_chunks.add(cid)
                    all_citations.append(c)
        return {
            "answer": best.answer,
            "citations": all_citations,
            "confidence": best.confidence,
            "agents_used": [r.agent_type.value for r in successful],
        }

    elif strategy == "weighted":
        # Weighted combination
        total_conf = sum(r.confidence for r in successful) or 1.0
        parts: list[str] = []
        for r in successful:
            weight = r.confidence / total_conf
            if weight > 0.2:  # only include meaningful contributions
                parts.append(r.answer)
            for c in r.citations:
                cid = c.get("chunk_id", "")
                if cid not in seen_chunks:
                    seen_chunks.add(cid)
                    all_citations.append(c)
        avg_conf = sum(r.confidence for r in successful) / len(successful)
        return {
            "answer": "\n\n".join(parts),
            "citations": all_citations,
            "confidence": avg_conf,
            "agents_used": [r.agent_type.value for r in successful],
        }

    else:  # sequential
        parts: list[str] = []
        for r in successful:
            parts.append(r.answer)
            for c in r.citations:
                cid = c.get("chunk_id", "")
                if cid not in seen_chunks:
                    seen_chunks.add(cid)
                    all_citations.append(c)
        avg_conf = sum(r.confidence for r in successful) / len(successful)
        return {
            "answer": "\n\n".join(parts),
            "citations": all_citations,
            "confidence": avg_conf,
            "agents_used": [r.agent_type.value for r in successful],
        }


# --- Agent-specific prompt modifications ---

AGENT_PROMPTS: dict[AgentType, str] = {
    AgentType.RESEARCH: "Focus on thorough, deep retrieval from all available sources. Cite every source used.",
    AgentType.SYNTHESIS: "Synthesize information from multiple context blocks into a coherent, comprehensive answer. "
                        "Identify connections and patterns across sources.",
    AgentType.FACT_CHECK: "Carefully verify each claim against the provided evidence. Flag any inconsistencies "
                         "between sources. Report confidence level for each verified fact.",
    AgentType.COMPARISON: "Compare and contrast the items mentioned. Use a structured format (similarities, "
                         "differences, key distinctions). Cite specific sources for each point.",
    AgentType.TEMPORAL: "Focus on chronological ordering and temporal relationships. Note dates, sequences of "
                       "events, and changes over time. Flag if any sources may be outdated.",
}


def get_agent_prompt_modifier(agent_type: AgentType) -> str:
    """Get additional prompt instructions for a specialist agent type."""
    return AGENT_PROMPTS.get(agent_type, "")

"""The agentic RAG pipeline as a LangGraph state machine.

  guard_input -> plan -> retrieve -> grade --(enough evidence)--> engineer_context -> generate -> verify -> finalize
       |                     ^         |
       | (blocked)           |         +--(weak, retries left)--> rewrite --+
       +---------------------+---------+--(weak, no retries)--> finalize (abstain)
"""
from __future__ import annotations

import logging
import operator
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import wraps
from typing import Annotated, Any, Callable, TypedDict

from app.core.tracing import span as otel_span, set_attribute

from langgraph.graph import END, START, StateGraph

from app.core.config import Settings
from app.rag.context import build_context
from app.rag.grader import grade_hits
from app.rag.planner import heuristic_plan, keyword_rewrite, sanitize_llm_plan
from app.rag.prompts import INSUFFICIENT
from app.rag.reranker import rerank_hits
from app.rag.types import ContextBlock, Evidence, Plan
from app.rag.verifier import verify_answer
from app.services.embeddings import Embedder
from app.services.injection import scan_text
from app.services.llm import LLM
from app.services.rbac import Principal, can_access
from app.services.vector_store import VectorStore

log = logging.getLogger(__name__)

MESSAGES = {
    "no_evidence": "I couldn't find enough evidence in the knowledge sources you have access to in order to answer this reliably.",
    "low_confidence": "I found related material, but I can't verify an answer well enough to state it with confidence.",
    "ungrounded": "I found related material, but none of the draft answer could be verified against the sources, so I'm not showing it.",
    "prompt_injection": "This request was blocked by security policy because it appears to instruct the assistant to bypass its rules.",
    "llm_error": "The answer service is temporarily unavailable. Please try again.",
}


def _merge(a: dict, b: dict) -> dict:
    return {**(a or {}), **(b or {})}


class RAGState(TypedDict, total=False):
    question: str
    answer_mode: str
    principal: Principal
    plan: Plan
    active_queries: list[str]
    title_doc_ids: list[str]
    excluded_chunk_ids: list[str]
    top_k: int
    attempt: int
    hits: dict[str, dict]
    evidence: list[Evidence]
    dropped: list[dict]
    sufficient: bool
    blocks: list[ContextBlock]
    context_stats: dict
    raw_answer: str
    verification: dict
    answer: str
    status: str
    abstain_reason: str | None
    cited: list[int]
    confidence: float
    grounding: float
    warnings: list[str]
    events: Annotated[list[dict], operator.add]
    timings: Annotated[dict, _merge]


@dataclass
class RAGDeps:
    settings: Settings
    embedder: Embedder
    vectors: VectorStore
    llm: LLM


def confidence_label(c: float) -> str:
    return "high" if c >= 0.75 else "medium" if c >= 0.5 else "low"


def _timed(name: str, fn: Callable[[RAGState], dict[str, Any]]):
    @wraps(fn)
    def wrapper(state: RAGState) -> dict[str, Any]:
        with otel_span(f"rag.{name}", {"rag.node": name}) as s:
            t0 = time.perf_counter()
            out = fn(state)
            out = dict(out)
            elapsed = round((time.perf_counter() - t0) * 1000, 2)
            out["timings"] = {name: elapsed}
            s.set_attribute("rag.duration_ms", elapsed)
            if "status" in out:
                s.set_attribute("rag.status", out["status"])
            return out

    return wrapper


def build_graph(deps: RAGDeps):
    s = deps.settings

    def guard_input(state: RAGState) -> dict:
        res = scan_text(state["question"])
        if res.flagged(s.injection_block_threshold):
            return {
                "status": "blocked", "abstain_reason": "prompt_injection", "answer": MESSAGES["prompt_injection"],
                "events": [{"type": "prompt_injection_blocked", "stage": "query", "score": res.score, "rules": res.matches}],
            }
        events = [{"type": "prompt_injection_suspected", "stage": "query", "score": res.score, "rules": res.matches}] if res.score > 0 else []
        return {"events": events}

    def plan(state: RAGState) -> dict:
        data = deps.llm.plan(state["question"])
        p = sanitize_llm_plan(state["question"], data) if data else heuristic_plan(state["question"])
        return {"plan": p, "active_queries": p.sub_queries, "attempt": 0, "top_k": s.retrieval_top_k, "hits": {}, "dropped": []}

    def retrieve(state: RAGState) -> dict:
        principal, p, top_k = state["principal"], state["plan"], state["top_k"]
        merged = dict(state.get("hits", {}))
        excluded = set(state.get("excluded_chunk_ids", []))
        events: list[dict] = []
        for q in state["active_queries"]:
            vec = deps.embedder.embed_query(q)
            results = deps.vectors.search(vec, principal, top_k, query_text=q)
            results += deps.vectors.search_document_chunks(
                vec, principal, state.get("title_doc_ids", []), top_k
            )
            for hint in p.source_hints:
                results += deps.vectors.search(vec, principal, max(3, top_k // 2), [hint], query_text=q)
            for hit in results:
                if hit.chunk_id in excluded:
                    continue
                pl = hit.payload
                if not can_access(principal, pl["allowed_roles"], pl["clearance_level"]):  # defence in depth
                    events.append({"type": "rbac_post_filter_removed", "chunk_id": hit.chunk_id})
                    continue
                prev = merged.get(hit.chunk_id)
                if prev is None or hit.score > prev["score"]:
                    merged[hit.chunk_id] = {"chunk_id": hit.chunk_id, "score": hit.score, "payload": pl, "matched_query": q}
        return {"hits": merged, "events": events}

    def rerank(state: RAGState) -> dict:
        """Phase 4: optional cross-encoder rerank of the fused candidate set, before grading. No-op
        (returns hits unchanged) when disabled or when sentence-transformers isn't installed - grading
        already blends lexical + semantic signals, so this is additive precision, not a dependency."""
        if not s.reranker_enabled or not state["hits"]:
            return {}
        ranked = rerank_hits(state["question"], list(state["hits"].values()), s.reranker_model, s.rerank_top_n)
        return {"hits": {h["chunk_id"]: h for h in ranked}}

    def grade(state: RAGState) -> dict:
        queries = list(dict.fromkeys(state["plan"].sub_queries + state["active_queries"]))
        kept, dropped, sanitized = grade_hits(
            list(state["hits"].values()), queries, s, title_doc_ids=state.get("title_doc_ids", [])
        )
        events = [
            {"type": "prompt_injection_quarantined", "stage": "retrieved_chunk", "chunk_id": d["chunk_id"], "rules": d.get("rules", [])}
            for d in dropped if d["reason"] == "injection_quarantined"
        ] + [
            {"type": "prompt_injection_sanitized", "stage": "retrieved_chunk", "chunk_id": d["chunk_id"], "rules": d["rules"]}
            for d in sanitized
        ]
        return {"evidence": kept, "dropped": dropped, "sufficient": bool(kept), "events": events}

    def route_after_grade(state: RAGState) -> str:
        if state["sufficient"]:
            return "engineer_context"
        return "rewrite" if state["attempt"] < s.max_retrieval_retries else "finalize"

    def rewrite(state: RAGState) -> dict:
        rewritten = keyword_rewrite(state["question"])
        return {
            "attempt": state["attempt"] + 1, "active_queries": [rewritten], "top_k": state["top_k"] * 2,
            "events": [{"type": "query_rewritten", "attempt": state["attempt"] + 1, "query": rewritten}],
        }

    def engineer_context(state: RAGState) -> dict:
        blocks, stats = build_context(state["evidence"], s)
        return {"blocks": blocks, "context_stats": stats}

    def generate(state: RAGState) -> dict:
        try:
            raw = deps.llm.generate_answer(
                state["question"], state["blocks"], state.get("answer_mode", "detailed")
            )
        except Exception as exc:
            log.exception("LLM call failed")
            return {"raw_answer": "", "status": "abstained", "abstain_reason": "llm_error",
                    "events": [{"type": "llm_error", "error": type(exc).__name__}]}
        return {"raw_answer": raw}

    def route_after_generate(state: RAGState) -> str:
        return "finalize" if state.get("abstain_reason") == "llm_error" else "verify"

    def verify(state: RAGState) -> dict:
        raw = state["raw_answer"].strip()
        if not raw or raw.startswith(INSUFFICIENT):
            return {"status": "abstained", "abstain_reason": "no_evidence", "grounding": 0.0}
        v = verify_answer(raw, state["blocks"], s.claim_support_threshold)
        info = {
            "grounding": v.grounding, "claims_total": v.claims_total, "claims_supported": v.claims_supported,
            "removed_claims": v.removed, "invalid_citations": v.invalid_citations,
        }
        if not v.answer:
            return {"status": "abstained", "abstain_reason": "ungrounded", "grounding": 0.0, "verification": info}
        cited_blocks = [b for b in state["blocks"] if b.n in v.cited] or state["blocks"]
        top = sorted((b.relevance for b in cited_blocks), reverse=True)[:3]
        strength = sum(top) / len(top)
        fresh = sum(b.freshness for b in cited_blocks) / len(cited_blocks)
        confidence = round(min(1.0, max(0.0, 0.4 * strength + 0.4 * v.grounding + 0.2 * fresh)), 3)
        warnings = []
        if v.removed:
            warnings.append(f"{len(v.removed)} unsupported statement(s) were removed from the draft answer.")
        if any(b.stale for b in cited_blocks):
            warnings.append(f"Some sources have not been updated in over {s.stale_after_days // 365} years and may be outdated.")
        if confidence < s.min_confidence:
            return {"status": "abstained", "abstain_reason": "low_confidence", "confidence": confidence,
                    "grounding": v.grounding, "verification": info}
        return {"status": "answered", "answer": v.answer, "cited": v.cited, "confidence": confidence,
                "grounding": v.grounding, "verification": info, "warnings": warnings}

    def finalize(state: RAGState) -> dict:
        if state.get("status") in (None, ""):
            return {"status": "abstained", "abstain_reason": "no_evidence", "answer": MESSAGES["no_evidence"]}
        if state["status"] == "abstained":
            return {"answer": MESSAGES.get(state.get("abstain_reason") or "no_evidence", MESSAGES["no_evidence"])}
        return {}

    g = StateGraph(RAGState)
    for name, fn in (("guard_input", guard_input), ("plan", plan), ("retrieve", retrieve), ("rerank", rerank),
                     ("grade", grade), ("rewrite", rewrite), ("engineer_context", engineer_context),
                     ("generate", generate), ("verify", verify), ("finalize", finalize)):
        g.add_node(name, _timed(name, fn))
    g.add_edge(START, "guard_input")
    g.add_conditional_edges("guard_input", lambda st: "finalize" if st.get("status") == "blocked" else "plan",
                            {"finalize": "finalize", "plan": "plan"})
    g.add_edge("plan", "retrieve")
    g.add_edge("retrieve", "rerank")
    g.add_edge("rerank", "grade")
    g.add_conditional_edges("grade", route_after_grade,
                            {"engineer_context": "engineer_context", "rewrite": "rewrite", "finalize": "finalize"})
    g.add_edge("rewrite", "retrieve")
    g.add_edge("engineer_context", "generate")
    g.add_conditional_edges("generate", route_after_generate, {"verify": "verify", "finalize": "finalize"})
    g.add_edge("verify", "finalize")
    g.add_edge("finalize", END)
    return g.compile()

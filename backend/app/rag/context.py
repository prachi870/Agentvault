"""Context engineering: dedupe, diversify, budget, order and sanitise evidence before it reaches the LLM."""
from __future__ import annotations

from collections import Counter

from app.core.config import Settings
from app.core.text import estimate_tokens, jaccard, tokenize
from app.rag.types import ContextBlock, Evidence
from app.services.injection import neutralize_for_context


def build_context(evidence: list[Evidence], settings: Settings) -> tuple[list[ContextBlock], dict]:
    selected: list[Evidence] = []
    selected_tokens: list[set[str]] = []
    per_doc: Counter[str] = Counter()
    used_chars = 0
    stats = {"candidates": len(evidence), "duplicates_removed": 0, "doc_cap_skipped": 0, "budget_truncated": 0}
    for ev in sorted(evidence, key=lambda e: e.score, reverse=True):
        toks = set(tokenize(ev.text))
        if any(jaccard(toks, t) > 0.8 for t in selected_tokens):
            stats["duplicates_removed"] += 1
            continue
        if per_doc[ev.doc_id] >= settings.max_chunks_per_doc:
            stats["doc_cap_skipped"] += 1
            continue
        if used_chars + len(ev.text) > settings.max_context_chars and selected:
            stats["budget_truncated"] += 1
            continue
        selected.append(ev)
        selected_tokens.append(toks)
        per_doc[ev.doc_id] += 1
        used_chars += len(ev.text)
    blocks = [
        ContextBlock(
            n=i, chunk_id=ev.chunk_id, doc_id=ev.doc_id, title=ev.title, source_type=ev.source_type,
            text=neutralize_for_context(ev.text), updated_at=ev.updated_at, score=ev.score,
            relevance=ev.relevance, freshness=ev.freshness, stale=ev.stale, lexical=ev.lexical,
        )
        for i, ev in enumerate(selected, start=1)
    ]
    stats.update(blocks=len(blocks), approx_tokens=sum(estimate_tokens(b.text) for b in blocks))
    return blocks, stats

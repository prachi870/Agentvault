"""Evidence verification: score retrieved chunks for relevance + freshness, quarantine injected content."""
from __future__ import annotations

import math
from datetime import datetime, timezone

from app.core.config import Settings
from app.core.text import tokenize
from app.rag.types import Evidence
from app.services.injection import InjectionResult, sanitize_chunk, scan_text


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def freshness_factor(updated_at: datetime, now: datetime, half_life_days: int) -> tuple[float, int]:
    age_days = max(0, (now - updated_at).days)
    return max(0.1, 0.5 ** (age_days / max(1, half_life_days))), age_days


def parse_dt(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def lexical_coverage(query_tokens: set[str], chunk_tokens: set[str]) -> float:
    return len(query_tokens & chunk_tokens) / len(query_tokens) if query_tokens else 0.0


def grade_hits(
    hits: list[dict], queries: list[str], settings: Settings, now: datetime | None = None,
    title_doc_ids: list[str] | None = None,
) -> tuple[list[Evidence], list[dict], list[dict]]:
    """`hits` are dicts: {chunk_id, score, payload, matched_query}. Returns (kept, dropped, sanitized).
    `sanitized` lists chunks that were partially cleaned (one or more sentences removed) but kept -
    for the security event log, distinct from `dropped` (chunks excluded entirely)."""
    now = now or datetime.now(timezone.utc)
    q_token_sets = [set(tokenize(q)) for q in queries]
    focused_doc_ids = set(title_doc_ids or [])
    kept: list[Evidence] = []
    dropped: list[dict] = []
    sanitized: list[dict] = []
    for h in hits:
        p = h["payload"]
        inj = scan_text(p["text"])
        if inj.flagged(settings.injection_block_threshold) or p.get("injection_score", 0) >= settings.injection_block_threshold:
            # Sentence-level quarantine (Phase 4): don't discard the whole chunk over one bad
            # sentence - strip just the injected sentence(s) and keep any legitimate content.
            cleaned, removed_rules, any_removed = sanitize_chunk(p["text"], settings.injection_block_threshold)
            if not cleaned or len(cleaned) < 20 or scan_text(cleaned).flagged(settings.injection_block_threshold):
                dropped.append({"chunk_id": h["chunk_id"], "doc_id": p["doc_id"], "reason": "injection_quarantined", "rules": inj.matches})
                continue
            sanitized.append({"chunk_id": h["chunk_id"], "doc_id": p["doc_id"], "rules": removed_rules})
            p = {**p, "text": cleaned}
            inj = InjectionResult(score=0.0, matches=[])
            h = {**h, "payload": p}
        chunk_tokens = set(tokenize(p["text"]))
        title_tokens = set(tokenize(p.get("title", "")))
        lexical = max(
            (
                max(lexical_coverage(qs, chunk_tokens), lexical_coverage(qs, title_tokens))
                for qs in q_token_sets
            ),
            default=0.0,
        )
        if p["doc_id"] in focused_doc_ids:
            lexical = max(lexical, min(1.0, settings.min_evidence_score * 2))
        semantic = clamp((h["score"] - 0.10) / 0.45)
        relevance = 0.5 * lexical + 0.5 * semantic
        updated = parse_dt(p["updated_at"])
        fresh, age_days = freshness_factor(updated, now, settings.freshness_half_life_days)
        ev = Evidence(
            chunk_id=h["chunk_id"], doc_id=p["doc_id"], title=p["title"], source_type=p["source_type"], text=p["text"],
            updated_at=updated, cosine=round(h["score"], 4), lexical=round(lexical, 4), relevance=round(relevance, 4),
            freshness=round(fresh, 4), score=round(relevance * (0.75 + 0.25 * fresh), 4),
            stale=age_days > settings.stale_after_days, injection_score=inj.score, matched_query=h.get("matched_query", ""),
        )
        if relevance < settings.min_evidence_score:
            dropped.append({"chunk_id": ev.chunk_id, "doc_id": ev.doc_id, "reason": "low_relevance", "relevance": ev.relevance})
            continue
        kept.append(ev)
    kept.sort(key=lambda e: e.score, reverse=True)
    return kept, dropped, sanitized

"""Knowledge-gap tracking and the AI health dashboard aggregates."""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import sha256_hex
from app.core.text import tokenize
from app.db.base import as_utc, utcnow
from app.db.models import Connector, Document, KnowledgeGap, KnowledgeGapFollowUp, Receipt


def query_key(question: str) -> str:
    return sha256_hex(" ".join(sorted(set(tokenize(question)))) or question.lower())[:32]


def record_gap(db: Session, question: str, reason: str, receipt_id: str) -> None:
    key = query_key(question)
    gap = db.scalars(select(KnowledgeGap).where(KnowledgeGap.query_key == key)).first()
    if gap:
        gap.occurrences += 1
        gap.last_seen = utcnow()
        gap.last_receipt_id = receipt_id
        gap.reason = reason
        if gap.status == "resolved":
            gap.status = "open"  # it came back
            follow_up = db.scalars(
                select(KnowledgeGapFollowUp).where(KnowledgeGapFollowUp.gap_id == gap.id)
            ).first()
            if follow_up:
                follow_up.status = "open"
                follow_up.verification_receipt_id = None
                follow_up.updated_at = utcnow()
    else:
        db.add(KnowledgeGap(query_key=key, sample_query=question[:500], reason=reason, last_receipt_id=receipt_id))


def resolve_gaps_for_answered(db: Session, question: str, receipt_id: str | None = None) -> None:
    gap = db.scalars(select(KnowledgeGap).where(KnowledgeGap.query_key == query_key(question))).first()
    if gap and gap.status == "open":
        gap.status = "resolved"
        follow_up = db.scalars(
            select(KnowledgeGapFollowUp).where(KnowledgeGapFollowUp.gap_id == gap.id)
        ).first()
        if follow_up:
            follow_up.status = "resolved"
            follow_up.verification_receipt_id = receipt_id
            follow_up.updated_at = utcnow()


def _pct(values: list[int], p: float) -> int:
    if not values:
        return 0
    values = sorted(values)
    return values[min(len(values) - 1, max(0, math.ceil(p * len(values)) - 1))]


def health_summary(db: Session, settings: Settings, days: int, components: dict) -> dict:
    since = utcnow() - timedelta(days=days)
    rows = db.execute(
        select(Receipt.status, Receipt.confidence, Receipt.grounding, Receipt.latency_ms, Receipt.injection_events, Receipt.used_stale_source)
        .where(Receipt.created_at >= since)
    ).all()
    total = len(rows)
    answered = [r for r in rows if r.status == "answered"]
    abstained = [r for r in rows if r.status == "abstained"]
    blocked = [r for r in rows if r.status == "blocked"]
    lat = [r.latency_ms for r in rows]
    avg = lambda xs: round(sum(xs) / len(xs), 3) if xs else 0.0  # noqa: E731
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(days=settings.stale_after_days)
    doc_rows = db.execute(select(Document.source_updated_at, Document.flagged_chunks, Document.chunk_count)).all()
    open_gaps = db.scalar(select(func.count()).select_from(KnowledgeGap).where(KnowledgeGap.status == "open")) or 0
    connectors = db.scalars(select(Connector)).all()
    return {
        "window_days": days,
        "queries": {"total": total, "answered": len(answered), "abstained": len(abstained), "blocked": len(blocked),
                    "abstain_rate": round(len(abstained) / total, 3) if total else 0.0},
        "quality": {"avg_confidence": avg([r.confidence for r in answered]), "avg_grounding": avg([r.grounding for r in answered]),
                    "stale_source_rate": round(sum(r.used_stale_source for r in answered) / len(answered), 3) if answered else 0.0,
                    "low_confidence_answers": sum(r.confidence < 0.5 for r in answered)},
        "latency_ms": {"p50": _pct(lat, 0.5), "p95": _pct(lat, 0.95), "max": max(lat) if lat else 0},
        "security": {"injection_events": sum(r.injection_events for r in rows), "blocked_queries": len(blocked),
                     "flagged_chunks_indexed": sum(d.flagged_chunks for d in doc_rows)},
        "knowledge": {"documents": len(doc_rows), "chunks": sum(d.chunk_count for d in doc_rows),
                      "stale_documents": sum(as_utc(d.source_updated_at) < stale_cutoff for d in doc_rows),
                      "open_knowledge_gaps": open_gaps,
                      "connectors": {c.name: c.status for c in connectors}},
        "components": components,
    }

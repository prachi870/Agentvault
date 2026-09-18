"""
Context Receipts: for every answer, record exactly which chunks were
retrieved, which were actually used in the final context, which were
dropped (and why), and what the verifier concluded. This is what makes an
answer auditable after the fact — a compliance/security requirement for
enterprise deployments, not just a nice-to-have.
"""

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone

from app.connectors.base import RetrievedChunk


@dataclass
class ContextReceipt:
    receipt_id: str
    query: str
    user_id: str
    timestamp: str
    sources_queried: list[str]
    sources_denied_by_rbac: list[str]
    chunks_retrieved: int
    chunks_used: int
    chunks_flagged_injection: int
    citations: list[dict] = field(default_factory=list)
    confidence: float = 0.0
    unsupported_claims: list[str] = field(default_factory=list)


def build_receipt(
    query: str,
    user_id: str,
    sources_queried: list[str],
    sources_denied: list[str],
    all_chunks: list[RetrievedChunk],
    used_chunks: list[RetrievedChunk],
    confidence: float,
    unsupported_claims: list[str],
) -> ContextReceipt:
    return ContextReceipt(
        receipt_id=str(uuid.uuid4()),
        query=query,
        user_id=user_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        sources_queried=sources_queried,
        sources_denied_by_rbac=sources_denied,
        chunks_retrieved=len(all_chunks),
        chunks_used=len(used_chunks),
        chunks_flagged_injection=sum(1 for c in all_chunks if c.metadata.get("injection_suspected")),
        citations=[
            {
                "source": c.source,
                "title": c.title,
                "url": c.url,
                "source_id": c.source_id,
            }
            for c in used_chunks
        ],
        confidence=confidence,
        unsupported_claims=unsupported_claims,
    )


# TODO: persist receipts to Postgres (see app/models/schemas.py for the
# proposed table) so they survive restarts and can back the AI Health
# Dashboard and Knowledge Gap Analytics with real history rather than
# in-memory-only data.
_receipt_store: dict[str, ContextReceipt] = {}


def save_receipt(receipt: ContextReceipt) -> None:
    _receipt_store[receipt.receipt_id] = receipt


def get_receipt(receipt_id: str) -> dict | None:
    receipt = _receipt_store.get(receipt_id)
    return asdict(receipt) if receipt else None


def all_receipts() -> list[ContextReceipt]:
    return list(_receipt_store.values())

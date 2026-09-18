"""
Knowledge Gap Analytics: aggregates receipts to surface where the
knowledge base is thin — questions with low confidence, no retrieved
evidence, or repeated RBAC denials (which may mean content exists but the
requesting team can't see it, or genuinely doesn't exist and should be
written).

This is intentionally a read model over receipts rather than its own
write path — it stays correct for free as the pipeline runs.
"""

from collections import Counter

from app.services.receipts import all_receipts

LOW_CONFIDENCE_THRESHOLD = 0.5


def compute_gap_report() -> dict:
    receipts = all_receipts()
    if not receipts:
        return {
            "total_queries": 0,
            "low_confidence_queries": [],
            "zero_evidence_queries": [],
            "frequently_denied_sources": [],
        }

    low_confidence = [r.query for r in receipts if r.confidence < LOW_CONFIDENCE_THRESHOLD]
    zero_evidence = [r.query for r in receipts if r.chunks_used == 0]

    denied_counter: Counter[str] = Counter()
    for r in receipts:
        denied_counter.update(r.sources_denied_by_rbac)

    return {
        "total_queries": len(receipts),
        "low_confidence_queries": low_confidence,
        "zero_evidence_queries": zero_evidence,
        "frequently_denied_sources": denied_counter.most_common(10),
    }

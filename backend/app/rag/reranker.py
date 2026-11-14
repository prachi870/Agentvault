"""Cross-encoder rerank of the fused (dense+sparse) candidate set, before grading (Phase 4).

Optional: needs `sentence-transformers` (requirements-llm.txt). Falls back to a lexical overlap
rerank when it isn't installed, so REranker_ENABLED=true still does *something* useful without the
extra dependency - just a weaker signal than a real cross-encoder.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from app.core.text import tokenize

log = logging.getLogger(__name__)


@lru_cache(maxsize=4)
def _load_cross_encoder(model_name: str):
    from sentence_transformers import CrossEncoder  # optional dependency (requirements-ml.txt)

    return CrossEncoder(model_name)


def rerank_hits(question: str, hits: list[dict], model_name: str, top_n: int) -> list[dict]:
    """`hits` are the same dicts retrieve() produces: {chunk_id, score, payload, matched_query}.
    Returns the reordered, truncated (to top_n) list with `score` overwritten by the rerank score."""
    candidates = hits[:top_n]
    rest = hits[top_n:]
    try:
        model = _load_cross_encoder(model_name)
        pairs = [(question, h["payload"]["text"]) for h in candidates]
        scores = model.predict(pairs)
        for h, sc in zip(candidates, scores):
            h["score"] = float(sc)
    except ImportError:
        log.info("sentence-transformers not installed; falling back to lexical rerank (pip install -r requirements-llm.txt)")
        q_tokens = set(tokenize(question))
        for h in candidates:
            chunk_tokens = set(tokenize(h["payload"]["text"]))
            h["score"] = len(q_tokens & chunk_tokens) / len(q_tokens) if q_tokens else 0.0
    except Exception:
        log.exception("reranker inference failed; keeping original retrieval order/scores")
        return hits
    candidates.sort(key=lambda h: h["score"], reverse=True)
    return candidates + rest

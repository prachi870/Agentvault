"""Lexical sparse vectors for hybrid retrieval (Phase 4: "hybrid retrieval (dense + BM25 sparse)").

This is deliberately a simple, dependency-free scheme rather than corpus-level Okapi BM25: term
frequency with log-saturation, hashed into a fixed-width index space (same hashing trick as the
`hash` embedder). A true BM25 needs corpus-wide IDF/avgdl statistics that would have to be recomputed
as the corpus changes; this gives the same practical benefit in a hybrid-search setup - exact lexical
matches that a dense embedder can miss - without that bookkeeping. Fused with the dense vector via
Qdrant's built-in RRF (see VectorStore.search), not treated as authoritative on its own.
"""
from __future__ import annotations

import math
import zlib

from app.core.text import tokenize

SPARSE_DIM = 1 << 20  # hash space; collisions are rare enough at typical chunk-corpus sizes


def _h(token: str) -> int:
    return zlib.crc32(token.encode("utf-8")) % SPARSE_DIM


def sparse_vector(text: str) -> tuple[list[int], list[float]]:
    """Returns (indices, values) ready for qdrant_client.models.SparseVector."""
    tokens = tokenize(text)
    if not tokens:
        return [], []
    counts: dict[int, int] = {}
    for t in tokens:
        idx = _h(t)
        counts[idx] = counts.get(idx, 0) + 1
    indices = list(counts.keys())
    values = [1.0 + math.log(c) for c in counts.values()]  # TF with log-saturation, no length norm
    return indices, values

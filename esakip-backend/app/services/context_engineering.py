from app.connectors.base import RetrievedChunk

# Rough heuristic: ~4 chars/token. Swap for a real tokenizer (tiktoken or
# your model provider's counter) once a specific LLM is locked in.
_CHARS_PER_TOKEN = 4


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // _CHARS_PER_TOKEN)


def deduplicate(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    seen: set[tuple[str, str]] = set()
    deduped = []
    for c in chunks:
        key = (c.source, c.source_id)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(c)
    return deduped


def build_context(chunks: list[RetrievedChunk], max_tokens: int) -> tuple[str, list[RetrievedChunk]]:
    """
    Greedily fills the context budget with the highest-scoring, freshest
    chunks first, dropping duplicates. Returns the assembled context string
    plus the ordered list of chunks actually used (this list becomes the
    citation set and the basis of the Context Receipt).
    """
    deduped = deduplicate(chunks)
    # Freshness-aware ranking: score dominates, recency breaks near-ties.
    ranked = sorted(
        deduped,
        key=lambda c: (round(c.score, 2), c.last_modified or 0),
        reverse=True,
    )

    used: list[RetrievedChunk] = []
    budget = max_tokens
    parts = []
    for i, chunk in enumerate(ranked):
        block = f"[Source {i + 1}: {chunk.title} ({chunk.source})]\n{chunk.text}\n"
        tokens = _estimate_tokens(block)
        if tokens > budget:
            continue
        parts.append(block)
        used.append(chunk)
        budget -= tokens

    return "\n---\n".join(parts), used

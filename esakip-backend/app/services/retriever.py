import asyncio
import logging

from app.connectors.base import RetrievedChunk, SourceConnector
from app.core.prompt_injection import sanitize_chunk
from app.core.security import Principal, filter_sources_by_permission

logger = logging.getLogger("esakip.retriever")


class Retriever:
    """Fans a query out across every permitted connector in parallel, then
    sanitizes and permission-filters the combined results."""

    def __init__(self, connectors: dict[str, SourceConnector]):
        self.connectors = connectors
        # Last error per source, surfaced by /dashboard/connectors so a
        # silent embed()/auth failure is visible instead of just showing up
        # as "no results" downstream.
        self.last_errors: dict[str, str] = {}

    async def retrieve(
        self,
        query: str,
        principal: Principal,
        requested_sources: list[str],
        top_k_per_source: int = 5,
    ) -> tuple[list[RetrievedChunk], list[str]]:
        """
        Returns (chunks, denied_sources). denied_sources feeds Knowledge Gap
        Analytics — "the user asked about X but couldn't see the source that
        likely has the answer" is itself a signal worth tracking.
        """
        permitted = filter_sources_by_permission(principal, requested_sources)
        denied = [s for s in requested_sources if s not in permitted]

        available = [s for s in permitted if s in self.connectors]

        results = await asyncio.gather(
            *[self.connectors[s].search(query, top_k_per_source) for s in available],
            return_exceptions=True,
        )

        chunks: list[RetrievedChunk] = []
        for source_name, result in zip(available, results):
            if isinstance(result, Exception):
                # A connector failing shouldn't take down the whole query,
                # but it must not fail silently either — log it and remember
                # it so the health dashboard can show *why* a source is down.
                logger.warning("Connector '%s' failed: %s", source_name, result)
                self.last_errors[source_name] = str(result)
                continue
            self.last_errors.pop(source_name, None)
            for chunk in result:
                sanitized_text, flagged = sanitize_chunk(chunk.text)
                chunk.text = sanitized_text
                if flagged:
                    chunk.metadata["injection_suspected"] = True
                # Second RBAC gate: drop anything whose stored tags don't
                # actually clear this principal, even if the source-level
                # check passed (defense in depth against stale tags).
                if principal.allowed_sources != ["*"] and chunk.permission_tags:
                    if not set(chunk.permission_tags) & set(principal.allowed_sources):
                        continue
                chunks.append(chunk)

        chunks.sort(key=lambda c: c.score, reverse=True)
        return chunks, denied

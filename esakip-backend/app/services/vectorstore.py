from qdrant_client import AsyncQdrantClient, models

from app.core.config import get_settings


class VectorStoreClient:
    """Thin async wrapper around Qdrant so the rest of the app never imports
    qdrant_client directly — makes swapping vector DBs a one-file change."""

    def __init__(self):
        settings = get_settings()
        self._client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key or None,
        )
        self._collection = settings.qdrant_collection

    async def ensure_collection(self, vector_size: int = 1536):
        collections = await self._client.get_collections()
        existing = {c.name for c in collections.collections}
        if self._collection not in existing:
            await self._client.create_collection(
                collection_name=self._collection,
                vectors_config=models.VectorParams(
                    size=vector_size, distance=models.Distance.COSINE
                ),
            )

    async def upsert(self, points: list[dict]):
        """points: [{id, vector, payload: {text, title, url, source, permission_tags, metadata}}]"""
        await self._client.upsert(
            collection_name=self._collection,
            points=[
                models.PointStruct(id=p["id"], vector=p["vector"], payload=p["payload"])
                for p in points
            ],
        )

    async def search(self, query: str, top_k: int, filter_source: str | None = None) -> list[dict]:
        # TODO: replace with a real embedding call (e.g. via LangChain's
        # embedding wrapper for your chosen provider) before encoding `query`.
        query_vector = await self._embed(query)

        qfilter = None
        if filter_source:
            qfilter = models.Filter(
                must=[models.FieldCondition(key="source", match=models.MatchValue(value=filter_source))]
            )

        hits = await self._client.search(
            collection_name=self._collection,
            query_vector=query_vector,
            query_filter=qfilter,
            limit=top_k,
        )
        return [
            {
                "id": str(h.id),
                "score": h.score,
                "text": h.payload.get("text", ""),
                "title": h.payload.get("title", ""),
                "url": h.payload.get("url"),
                "permission_tags": h.payload.get("permission_tags", []),
                "metadata": h.payload.get("metadata", {}),
            }
            for h in hits
        ]

    async def _embed(self, text: str) -> list[float]:
        raise NotImplementedError(
            "Wire an embedding model here (e.g. LangChain's embeddings interface "
            "for OpenAI/Voyage/Cohere/etc.) — kept out of this scaffold so you "
            "can pick the provider that fits your enterprise's data residency needs."
        )

    async def ping(self) -> bool:
        try:
            await self._client.get_collections()
            return True
        except Exception:
            return False

"""
Reference connector implementation, backed by the Qdrant vector store rather
than a live enterprise API. Use this to validate the end-to-end pipeline
before wiring real connectors (SharePoint, Confluence, Jira, Notion, SQL,
email).

This is the pattern every future connector follows:
1. Embed the query.
2. Search the vector store, filtered to this connector's namespace.
3. Map hits into RetrievedChunk with permission_tags set from stored metadata.
"""

from app.connectors.base import RetrievedChunk, SourceConnector
from app.services.vectorstore import VectorStoreClient


class LocalFilesConnector(SourceConnector):
    name = "local_files"

    def __init__(self, vector_store: VectorStoreClient):
        self.vector_store = vector_store

    async def search(self, query: str, top_k: int) -> list[RetrievedChunk]:
        hits = await self.vector_store.search(
            query=query,
            top_k=top_k,
            filter_source=self.name,
        )
        return [
            RetrievedChunk(
                source=self.name,
                source_id=hit.get("id", ""),
                title=hit.get("title", "Untitled"),
                text=hit.get("text", ""),
                url=hit.get("url"),
                score=hit.get("score", 0.0),
                permission_tags=hit.get("permission_tags", ["local_files"]),
                metadata=hit.get("metadata", {}),
            )
            for hit in hits
        ]

    async def health_check(self) -> bool:
        return await self.vector_store.ping()

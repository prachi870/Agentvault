"""
Every enterprise source (SharePoint, Confluence, Jira, Notion, SQL, email,
cloud drives...) implements this interface. The retriever only ever talks
to `SourceConnector`, so adding a new enterprise system means writing one
new file in this folder and registering it in `app/connectors/registry.py`
— nothing else in the pipeline changes.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class RetrievedChunk:
    source: str                 # connector name, e.g. "confluence"
    source_id: str              # stable id within that source (page id, ticket id, file path...)
    title: str
    text: str
    url: Optional[str] = None
    last_modified: Optional[datetime] = None
    score: float = 0.0
    permission_tags: list[str] = field(default_factory=list)  # who/what can see this
    metadata: dict = field(default_factory=dict)


class SourceConnector(ABC):
    name: str

    @abstractmethod
    async def search(self, query: str, top_k: int) -> list[RetrievedChunk]:
        """Return the top_k most relevant chunks for query from this source."""
        raise NotImplementedError

    async def health_check(self) -> bool:
        """Cheap liveness check, used by the AI Health Dashboard."""
        return True

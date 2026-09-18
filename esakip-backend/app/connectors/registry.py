"""
Central place that knows which connectors exist. Add a real SharePoint /
Confluence / Jira / Notion / SQL / email connector by:
  1. Creating app/connectors/<name>.py implementing SourceConnector
  2. Registering it below

LangChain ships document loaders for most of these
(langchain_community.document_loaders) which can sit behind the same
`search()` interface — either pre-index their output into Qdrant (recommended,
keeps latency predictable) or query them live.
"""

from app.connectors.base import SourceConnector
from app.connectors.local_files import LocalFilesConnector
from app.services.vectorstore import VectorStoreClient


def build_connector_registry(vector_store: VectorStoreClient) -> dict[str, SourceConnector]:
    registry: dict[str, SourceConnector] = {
        "local_files": LocalFilesConnector(vector_store),
        # "sharepoint": SharePointConnector(...),   # TODO
        # "confluence": ConfluenceConnector(...),   # TODO
        # "jira": JiraConnector(...),                 # TODO
        # "notion": NotionConnector(...),             # TODO
        # "sql": SQLConnector(...),                   # TODO
        # "email": EmailConnector(...),               # TODO
    }
    return registry

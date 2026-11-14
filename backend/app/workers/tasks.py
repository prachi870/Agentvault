"""RQ task entrypoints. Each task builds its own Container - workers run in a separate process
(scripts/worker.py) from the API, so app.state.container is not available to them."""
from __future__ import annotations

import logging

from app.core.config import get_settings
from app.db.models import Connector
from app.services.connectors.registry import sync_connector
from app.services.container import build_container

log = logging.getLogger(__name__)


def sync_connector_job(connector_id: str) -> dict:
    settings = get_settings()
    container = build_container(settings)
    db = container.session_factory()
    try:
        conn = db.get(Connector, connector_id)
        if not conn:
            log.warning("sync_connector_job: connector %s not found", connector_id)
            return {"error": "connector not found"}
        return sync_connector(db, conn, container.ingestion, container.settings)
    finally:
        db.close()
        container.engine.dispose()


def reindex_document_job(doc_id: str) -> dict:
    from app.db.models import Document

    settings = get_settings()
    container = build_container(settings)
    db = container.session_factory()
    try:
        doc = db.get(Document, doc_id)
        if not doc:
            return {"error": "document not found"}
        ok = container.ingestion.reindex(db, doc)
        return {"reindexed": ok}
    finally:
        db.close()
        container.engine.dispose()

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.db.models import Connector, Document
from app.services.connectors.confluence import ConfluenceConnector
from app.services.connectors.directory import DirectoryConnector
from app.services.connectors.email_imap import EmailIMAPConnector
from app.services.connectors.gdrive import GoogleDriveConnector
from app.services.connectors.jira import JiraConnector
from app.services.connectors.notion import NotionConnector
from app.services.connectors.sharepoint import SharePointConnector
from app.services.connectors.sql import SQLConnector
from app.services.ingestion import IngestionService

log = logging.getLogger(__name__)

IMPLEMENTED_KINDS = ("directory", "sql", "confluence", "jira", "notion", "sharepoint", "drive", "email")
# Kept for the dashboard's "not yet built" messaging; empty now that Phase 3 native connectors landed.
PLANNED_SOURCES: tuple[str, ...] = ()

_BUILDERS = {
    "confluence": lambda config, settings: ConfluenceConnector(config),
    "jira": lambda config, settings: JiraConnector(config),
    "notion": lambda config, settings: NotionConnector(config),
    "sharepoint": lambda config, settings: SharePointConnector(config),
    "drive": lambda config, settings: GoogleDriveConnector(config),
    "email": lambda config, settings: EmailIMAPConnector(config),
    "sql": lambda config, settings: SQLConnector(config),
    "directory": lambda config, settings: DirectoryConnector(config, settings.connector_allowed_root),
}


def build_connector(kind: str, config: dict, settings: Settings):
    builder = _BUILDERS.get(kind)
    if not builder:
        raise AppError(f"connector kind '{kind}' is not implemented", 501)
    return builder(config, settings)


def sync_connector(db: Session, connector: Connector, ingestion: IngestionService, settings: Settings) -> dict:
    impl = build_connector(connector.kind, connector.config, settings)
    impl.validate()
    connector.status, connector.last_error = "syncing", None
    db.commit()
    stats = {"created": 0, "updated": 0, "unchanged": 0, "failed": 0, "removed": 0}
    seen: set[str] = set()
    completed = False
    try:
        for item in impl.fetch():
            seen.add(item.external_id)
            existing = db.scalars(
                select(Document).where(Document.connector_id == connector.id, Document.external_id == item.external_id)
            ).first()
            try:
                # ACL mirroring: an item that resolved source-side permissions overrides the
                # connector's static defaults (Phase 3 - the mapping itself lives in each connector).
                classification = item.classification or connector.default_classification
                roles = item.allowed_roles if item.allowed_roles is not None else (connector.default_allowed_roles or None)
                _, changed = ingestion.ingest(
                    db,
                    title=item.title,
                    source_type=connector.source_type,
                    classification=classification,
                    allowed_roles=roles,
                    owner_id=None,
                    filename=item.filename,
                    data=item.data,
                    text=item.text,
                    source_uri=item.source_uri,
                    connector_id=connector.id,
                    external_id=item.external_id,
                    source_updated_at=item.updated_at,
                )
                stats["unchanged" if not changed else ("updated" if existing else "created")] += 1
            except Exception as exc:
                db.rollback()
                stats["failed"] += 1
                log.warning("connector %s: failed to ingest %s: %s", connector.name, item.external_id, exc)
        completed = True
    except Exception as exc:
        db.rollback()
        connector.status, connector.last_error = "error", str(exc)[:500]
        db.commit()
        raise AppError(f"sync failed: {exc}", 502) from exc
    if completed:  # remove documents deleted at the source so revoked/removed content stops being retrievable
        gone = db.scalars(select(Document).where(Document.connector_id == connector.id)).all()
        for doc in gone:
            if doc.external_id not in seen:
                ingestion.delete(db, doc)
                stats["removed"] += 1
    connector.doc_count = len(db.scalars(select(Document.id).where(Document.connector_id == connector.id)).all())
    connector.last_sync_at = datetime.now(timezone.utc)
    connector.status = "ok" if stats["failed"] == 0 else "error"
    connector.last_error = f"{stats['failed']} item(s) failed to ingest" if stats["failed"] else None
    db.commit()
    return stats

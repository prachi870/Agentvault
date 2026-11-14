"""Document ingestion: parse -> chunk -> injection scan -> embed -> index (Qdrant) -> record (PostgreSQL)."""
from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import sha256_hex
from app.db.base import utcnow
from app.db.models import Document, DocumentRevision, new_id
from app.services.chunker import Chunker
from app.services.embeddings import Embedder
from app.services.injection import scan_text
from app.services.parsers import UnsupportedFile, extract_text
from app.services.rbac import clearance_level, default_allowed_roles
from app.services.storage import Storage, safe_filename
from app.services.vector_store import ChunkRecord, VectorStore

log = logging.getLogger(__name__)


class IngestionService:
    def __init__(self, settings: Settings, embedder: Embedder, vectors: VectorStore, storage: Storage) -> None:
        self.settings, self.embedder, self.vectors, self.storage = settings, embedder, vectors, storage
        self.chunker = Chunker(settings.chunk_size, settings.chunk_overlap)

    def ingest(
        self,
        db: Session,
        *,
        title: str,
        source_type: str,
        classification: str,
        owner_id: str | None,
        filename: str | None = None,
        data: bytes | None = None,
        text: str | None = None,
        allowed_roles: list[str] | None = None,
        source_uri: str | None = None,
        connector_id: str | None = None,
        external_id: str | None = None,
        source_updated_at: datetime | None = None,
    ) -> tuple[Document, bool]:
        """Returns (document, changed). `changed` is False when identical content was already indexed."""
        if text is None:
            if data is None or not filename:
                raise AppError("Either text or (filename + data) is required")
            try:
                text = extract_text(filename, data)
            except UnsupportedFile as exc:
                raise AppError(str(exc), 422) from exc
        roles = allowed_roles or default_allowed_roles(classification)
        sha = sha256_hex(text)

        doc: Document | None = None
        if connector_id and external_id:
            doc = db.scalars(
                select(Document).where(Document.connector_id == connector_id, Document.external_id == external_id)
            ).first()
            if doc and doc.content_sha256 == sha and doc.classification == classification and doc.allowed_roles == roles:
                return doc, False
            if doc:
                self.vectors.delete_document(doc.id)

        chunks = self.chunker.split(text)
        if not chunks:
            raise AppError("Document has no indexable content", 422)

        existing_doc = doc
        content_changed = existing_doc is not None and existing_doc.content_sha256 != sha
        if content_changed:
            latest_version = db.scalar(
                select(func.max(DocumentRevision.version)).where(DocumentRevision.document_id == existing_doc.id)
            )
            if latest_version is None:
                self._record_revision(db, existing_doc)
                db.flush()

        if doc is None:
            doc = Document(id=new_id(), source_type=source_type, connector_id=connector_id, external_id=external_id)
            db.add(doc)
        doc.title = title[:512]
        doc.source_type = source_type
        doc.source_uri = source_uri
        doc.classification = classification
        doc.allowed_roles = roles
        doc.content_sha256 = sha
        doc.owner_id = owner_id
        doc.source_updated_at = source_updated_at or utcnow()
        doc.indexed_at = utcnow()
        doc.status = "indexed"
        db.flush()
        if existing_doc is None or content_changed:
            self._record_revision(db, doc)

        try:
            doc.chunk_count, doc.flagged_chunks = self._index(doc, chunks)
            if data is not None and filename:
                doc.storage_key = f"documents/{doc.id}/{safe_filename(filename)}"
                self.storage.put(doc.storage_key, data)
            db.commit()
        except Exception:
            db.rollback()
            self.vectors.delete_document(doc.id)
            raise
        return doc, True

    @staticmethod
    def _record_revision(db: Session, doc: Document) -> None:
        latest_version = db.scalar(
            select(func.max(DocumentRevision.version)).where(DocumentRevision.document_id == doc.id)
        )
        version = (latest_version or 0) + 1
        db.add(
            DocumentRevision(
                document_id=doc.id,
                version=version,
                title=doc.title,
                source_type=doc.source_type,
                content_sha256=doc.content_sha256,
                source_updated_at=doc.source_updated_at,
                indexed_at=doc.indexed_at,
                tenant_id=doc.tenant_id,
            )
        )

    def _index(self, doc: Document, chunks: list[str]) -> tuple[int, int]:
        """Embed + upsert chunks for `doc`. Returns (chunk_count, flagged_chunks)."""
        vectors = self.embedder.embed_documents(chunks)
        level = clearance_level(doc.classification)
        records, flagged = [], 0
        for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
            inj = scan_text(chunk)
            flagged += inj.flagged(self.settings.injection_block_threshold)
            records.append(
                ChunkRecord(
                    chunk_id=f"{doc.id}:{i}",
                    vector=vec,
                    payload={
                        "doc_id": doc.id,
                        "title": doc.title,
                        "source_type": doc.source_type,
                        "text": chunk,
                        "chunk_index": i,
                        "updated_at": doc.source_updated_at.isoformat(),
                        "allowed_roles": doc.allowed_roles,
                        "clearance_level": level,
                        "injection_score": inj.score,
                    },
                )
            )
        self.vectors.upsert(records)
        return len(records), flagged

    def reindex(self, db: Session, doc: Document) -> bool:
        """Rebuild a document's vectors from its stored original (e.g. after a Qdrant restart or embedding change).
        Returns False for documents without a stored file (connector rows: re-sync the connector instead)."""
        if not doc.storage_key:
            return False
        text = extract_text(doc.storage_key.rsplit("/", 1)[-1], self.storage.get(doc.storage_key))
        chunks = self.chunker.split(text)
        self.vectors.delete_document(doc.id)
        doc.chunk_count, doc.flagged_chunks = self._index(doc, chunks)
        doc.indexed_at = utcnow()
        db.commit()
        return True

    def update_access(self, db: Session, doc: Document, classification: str | None, allowed_roles: list[str] | None) -> Document:
        """Change a document's classification/roles without re-embedding (Phase 4). Updates Qdrant
        payloads in place, which is why this is cheap - the alternative (reindex) would re-run
        embeddings for no reason since the content itself hasn't changed."""
        if classification is not None:
            doc.classification = classification
        if allowed_roles is not None:
            doc.allowed_roles = allowed_roles
        level = clearance_level(doc.classification)
        self.vectors.set_payload_for_document(doc.id, {"allowed_roles": doc.allowed_roles, "clearance_level": level})
        db.commit()
        return doc

    def delete(self, db: Session, doc: Document) -> None:
        self.vectors.delete_document(doc.id)
        if doc.storage_key:
            try:
                self.storage.delete(doc.storage_key)
            except Exception:
                log.warning("could not delete stored file %s", doc.storage_key)
        db.delete(doc)
        db.commit()

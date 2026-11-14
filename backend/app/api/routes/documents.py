from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_current_user, get_db, require_roles, to_principal
from app.core.errors import AppError
from app.db.models import Document, DocumentRevision, ReceiptEvidence, User
from app.schemas.documents import DocumentAccessUpdate, DocumentOut, KnowledgeUpdateOut, SamplePackOut
from app.services.container import Container
from app.services.rbac import (
    CLASSIFICATION_LEVEL,
    ROLES,
    SOURCE_TYPES,
    can_access,
    can_ingest_at,
    clearance_level,
    default_allowed_roles,
)
from app.services.sample_documents import SAMPLE_DOCUMENTS, SAMPLE_LIBRARY_VERSION

router = APIRouter(prefix="/documents", tags=["documents"])


def _visible(doc: Document, user: User) -> bool:
    return can_access(to_principal(user), doc.allowed_roles, clearance_level(doc.classification))


@router.post("", response_model=DocumentOut, status_code=201)
def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    source_type: str = Form("upload"),
    classification: str = Form("internal"),
    allowed_roles: str | None = Form(None, description="Comma-separated roles; '*' = everyone with sufficient clearance"),
    source_updated_at: str | None = Form(None, description="ISO-8601; defaults to now. Drives freshness scoring."),
    user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    if source_type not in SOURCE_TYPES:
        raise HTTPException(422, f"source_type must be one of {', '.join(SOURCE_TYPES)}")
    if classification not in CLASSIFICATION_LEVEL:
        raise HTTPException(422, f"classification must be one of {', '.join(CLASSIFICATION_LEVEL)}")
    if not can_ingest_at(to_principal(user), classification):
        raise HTTPException(403, "You cannot publish documents above your own clearance")
    roles = [r.strip() for r in allowed_roles.split(",") if r.strip()] if allowed_roles else None
    if roles and any(r != "*" and r not in ROLES for r in roles):
        raise HTTPException(422, f"allowed_roles entries must be '*' or one of {', '.join(ROLES)}")
    updated = None
    if source_updated_at:
        try:
            updated = datetime.fromisoformat(source_updated_at)
            updated = updated if updated.tzinfo else updated.replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(422, "source_updated_at must be ISO-8601")
    limit = container.settings.max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"File exceeds {container.settings.max_upload_mb} MB")
    filename = file.filename or "upload"
    try:
        doc, _ = container.ingestion.ingest(
            db, title=(title or filename.rsplit(".", 1)[0])[:512], source_type=source_type, classification=classification,
            owner_id=user.id, filename=filename, data=data, allowed_roles=roles, source_updated_at=updated,
        )
    except AppError as exc:
        raise HTTPException(exc.status_code, exc.message)
    return doc


@router.post("/sample-pack", response_model=SamplePackOut)
def add_sample_pack(
    user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    if not can_ingest_at(to_principal(user), "internal"):
        raise HTTPException(403, "You cannot publish sample documents at this classification")

    documents = []
    added = 0
    for sample in SAMPLE_DOCUMENTS:
        source_uri = f"agentvault://sample-library/{SAMPLE_LIBRARY_VERSION}/{sample.slug}"
        statement = select(Document).where(Document.source_uri == source_uri)
        if container.settings.multi_tenant_enabled:
            statement = statement.where(Document.tenant_id == user.tenant_id)
        document = db.scalars(statement).first()
        if document:
            documents.append(document)
            continue

        try:
            document, _ = container.ingestion.ingest(
                db,
                title=sample.title,
                source_type="upload",
                classification="internal",
                owner_id=user.id,
                filename=f"{sample.slug}.txt",
                data=sample.content.encode("utf-8"),
                allowed_roles=default_allowed_roles("internal"),
                source_uri=source_uri,
            )
        except AppError as exc:
            raise HTTPException(exc.status_code, exc.message) from exc
        if container.settings.multi_tenant_enabled:
            document.tenant_id = user.tenant_id
            db.commit()
        documents.append(document)
        added += 1

    return SamplePackOut(documents=documents, added=added, total=len(SAMPLE_DOCUMENTS))


@router.post("/reindex")
def reindex_documents(user: User = Depends(require_roles("admin")), db: Session = Depends(get_db),
                      container: Container = Depends(get_container)):
    """Rebuild vectors from stored originals (after a Qdrant reset or embedding-model change)."""
    done, skipped = 0, []
    for doc in db.scalars(select(Document)).all():
        try:
            if container.ingestion.reindex(db, doc):
                done += 1
            else:
                skipped.append(doc.id)  # connector-sourced: re-sync the connector
        except Exception as exc:
            db.rollback()
            skipped.append(doc.id)
    return {"reindexed": done, "skipped": skipped}


@router.patch("/{doc_id}", response_model=DocumentOut)
def update_document_access(
    doc_id: str,
    body: DocumentAccessUpdate,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    """Change a document's classification/roles in place (Phase 4) - updates Qdrant payloads without
    re-embedding, so access changes take effect immediately without a reindex."""
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    if body.classification is not None and body.classification not in CLASSIFICATION_LEVEL:
        raise HTTPException(422, f"classification must be one of {', '.join(CLASSIFICATION_LEVEL)}")
    if body.allowed_roles is not None and any(r != "*" and r not in ROLES for r in body.allowed_roles):
        raise HTTPException(422, f"allowed_roles entries must be '*' or one of {', '.join(ROLES)}")
    return container.ingestion.update_access(db, doc, body.classification, body.allowed_roles)


@router.get("", response_model=list[DocumentOut])
def list_documents(limit: int = 50, offset: int = 0, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    docs = db.scalars(select(Document).order_by(Document.indexed_at.desc())).all()
    visible = [d for d in docs if _visible(d, user)]
    return visible[offset : offset + max(1, min(limit, 200))]


@router.get("/updates", response_model=list[KnowledgeUpdateOut])
def list_knowledge_updates(
    days: int = 30,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    window_days = max(1, min(days, 90))
    result_limit = max(1, min(limit, 100))
    since = datetime.now(timezone.utc) - timedelta(days=window_days)
    statement = (
        select(DocumentRevision, Document)
        .join(Document, Document.id == DocumentRevision.document_id)
        .where(
            DocumentRevision.created_at >= since,
            Document.status == "indexed",
            Document.chunk_count > 0,
        )
        .order_by(DocumentRevision.created_at.desc())
        .limit(1000)
    )
    if container.settings.multi_tenant_enabled:
        statement = statement.where(
            Document.tenant_id == user.tenant_id,
            DocumentRevision.tenant_id == user.tenant_id,
        )

    updates = []
    for revision, document in db.execute(statement).all():
        if not _visible(document, user):
            continue

        impacted_answers = 0
        if revision.version == 1:
            change_type = "added"
            summary = f"New source indexed with {document.chunk_count} searchable text chunks."
        else:
            change_type = "updated"
            previous = db.scalars(
                select(DocumentRevision).where(
                    DocumentRevision.document_id == document.id,
                    DocumentRevision.version == revision.version - 1,
                )
            ).first()
            if previous:
                impact_statement = (
                    select(func.count())
                    .select_from(ReceiptEvidence)
                    .where(
                        ReceiptEvidence.document_id == document.id,
                        ReceiptEvidence.created_at >= previous.indexed_at,
                        ReceiptEvidence.created_at < revision.indexed_at,
                    )
                )
                if container.settings.multi_tenant_enabled:
                    impact_statement = impact_statement.where(ReceiptEvidence.tenant_id == user.tenant_id)
                impacted_answers = db.scalar(impact_statement) or 0
                cited_label = "answer" if impacted_answers == 1 else "answers"
                summary = (
                    f"Updated from version {previous.version} to {revision.version}; "
                    f"{impacted_answers} earlier {cited_label} cited the previous version."
                )
            else:
                summary = f"Content updated to version {revision.version}."

        updates.append(
            KnowledgeUpdateOut(
                document_id=document.id,
                title=document.title,
                source_type=document.source_type,
                classification=document.classification,
                version=revision.version,
                change_type=change_type,
                changed_at=revision.created_at,
                summary=summary,
                impacted_answers=impacted_answers,
            )
        )
        if len(updates) >= result_limit:
            break
    return updates


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc or not _visible(doc, user):  # 404, not 403: don't reveal that restricted documents exist
        raise HTTPException(404, "Document not found")
    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: str, user: User = Depends(require_roles("manager", "admin")), db: Session = Depends(get_db),
                    container: Container = Depends(get_container)):
    doc = db.get(Document, doc_id)
    if not doc or not _visible(doc, user):
        raise HTTPException(404, "Document not found")
    if user.role != "admin" and doc.owner_id != user.id:
        raise HTTPException(403, "Only the owner or an admin can delete this document")
    container.ingestion.delete(db, doc)

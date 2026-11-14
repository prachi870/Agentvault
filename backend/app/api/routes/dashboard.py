from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_current_user, get_db, require_roles
from app.db.base import utcnow
from app.db.models import (
    Connector,
    Document,
    DocumentRevision,
    KnowledgeGap,
    KnowledgeGapFollowUp,
    ReceiptEvidence,
    User,
)
from app.schemas.dashboard import (
    EvidenceChangeOut,
    HealthDashboard,
    KnowledgeGapFollowUpOut,
    KnowledgeGapFollowUpUpdate,
    KnowledgeGapOut,
)
from app.services.analytics import health_summary
from app.services.connectors.registry import IMPLEMENTED_KINDS, PLANNED_SOURCES
from app.services.container import Container
from app.services.rbac import Principal, can_access, clearance_level, same_tenant

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_roles("manager", "admin"))])


def component_status(db: Session, container: Container) -> dict:
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "postgres" if not container.settings.database_url.startswith("sqlite") else "sqlite": db_ok,
        "qdrant": container.vectors.ping(),
        f"cache_{container.cache.backend}": container.cache.ping(),
        f"storage_{container.storage.backend}": container.storage.ping(),
        "llm": container.llm.name,
        "embeddings": container.embedder.name,
    }


@router.get("/health", response_model=HealthDashboard)
def health(days: int = 7, db: Session = Depends(get_db), container: Container = Depends(get_container)):
    return health_summary(db, container.settings, max(1, min(days, 90)), component_status(db, container))


@router.get("/knowledge-gaps", response_model=list[KnowledgeGapOut])
def knowledge_gaps(
    status: str = "open",
    limit: int = 50,
    user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db),
):
    stmt = select(KnowledgeGap).order_by(KnowledgeGap.occurrences.desc(), KnowledgeGap.last_seen.desc())
    stmt = stmt.where(KnowledgeGap.tenant_id == user.tenant_id)
    if status in ("open", "resolved"):
        stmt = stmt.where(KnowledgeGap.status == status)
    elif status == "in_progress":
        stmt = stmt.where(
            KnowledgeGap.id.in_(
                select(KnowledgeGapFollowUp.gap_id).where(KnowledgeGapFollowUp.status == "in_progress")
            )
        )
    elif status != "all":
        raise HTTPException(422, "status must be open, in_progress, resolved, or all")
    gaps = db.scalars(stmt.limit(max(1, min(limit, 200)))).all()
    follow_ups = {
        follow_up.gap_id: follow_up
        for follow_up in db.scalars(
            select(KnowledgeGapFollowUp).where(KnowledgeGapFollowUp.gap_id.in_([gap.id for gap in gaps]))
        ).all()
    } if gaps else {}
    return [_gap_out(gap, follow_ups.get(gap.id)) for gap in gaps]


def _gap_out(gap: KnowledgeGap, follow_up: KnowledgeGapFollowUp | None = None) -> KnowledgeGapOut:
    return KnowledgeGapOut(
        id=gap.id,
        sample_query=gap.sample_query,
        reason=gap.reason,
        occurrences=gap.occurrences,
        status=gap.status,
        first_seen=gap.first_seen,
        last_seen=gap.last_seen,
        last_receipt_id=gap.last_receipt_id,
        follow_up=(
            KnowledgeGapFollowUpOut(
                assigned_to=follow_up.assigned_to,
                next_step=follow_up.next_step,
                status=follow_up.status,
                verification_receipt_id=follow_up.verification_receipt_id,
                updated_at=follow_up.updated_at,
            )
            if follow_up else None
        ),
    )


@router.patch("/knowledge-gaps/{gap_id}/follow-up", response_model=KnowledgeGapOut)
def update_knowledge_gap_follow_up(
    gap_id: str,
    body: KnowledgeGapFollowUpUpdate,
    user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db),
):
    if not body.model_fields_set:
        raise HTTPException(422, "At least one follow-up field must be provided")
    gap = db.scalars(
        select(KnowledgeGap).where(KnowledgeGap.id == gap_id, KnowledgeGap.tenant_id == user.tenant_id)
    ).first()
    if not gap:
        raise HTTPException(404, "Knowledge gap not found")
    follow_up = db.scalars(
        select(KnowledgeGapFollowUp).where(KnowledgeGapFollowUp.gap_id == gap.id)
    ).first()
    if not follow_up:
        follow_up = KnowledgeGapFollowUp(gap_id=gap.id)
        db.add(follow_up)
    fields = body.model_fields_set
    if "assigned_to" in fields:
        follow_up.assigned_to = body.assigned_to.strip() or None if body.assigned_to else None
    if "next_step" in fields:
        follow_up.next_step = body.next_step.strip() or None if body.next_step else None
    if body.status is not None:
        follow_up.status = body.status
        follow_up.verification_receipt_id = None
        gap.status = "resolved" if body.status == "resolved" else "open"
    follow_up.updated_at = utcnow()
    db.commit()
    db.refresh(follow_up)
    return _gap_out(gap, follow_up)


@router.patch("/knowledge-gaps/{gap_id}/resolve", response_model=KnowledgeGapOut)
def resolve_gap(
    gap_id: str,
    user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db),
):
    g = db.scalars(
        select(KnowledgeGap).where(KnowledgeGap.id == gap_id, KnowledgeGap.tenant_id == user.tenant_id)
    ).first()
    if not g:
        raise HTTPException(404, "Gap not found")
    g.status = "resolved"
    follow_up = db.scalars(
        select(KnowledgeGapFollowUp).where(KnowledgeGapFollowUp.gap_id == g.id)
    ).first()
    if follow_up:
        follow_up.status = "resolved"
        follow_up.verification_receipt_id = None
        follow_up.updated_at = utcnow()
    db.commit()
    return _gap_out(g, follow_up)


@router.get("/evidence-changes", response_model=list[EvidenceChangeOut])
def evidence_changes(
    limit: int = 50,
    user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db),
):
    principal = Principal(
        user_id=user.id,
        email=user.email,
        role=user.role,
        department=user.department,
        clearance=user.clearance,
        tenant_id=user.tenant_id,
    )
    revisions = db.execute(
        select(DocumentRevision, Document)
        .join(Document, Document.id == DocumentRevision.document_id)
        .where(DocumentRevision.version > 1)
        .order_by(DocumentRevision.indexed_at.desc())
        .limit(1000)
    ).all()
    changes = []
    for revision, document in revisions:
        if not same_tenant(principal, document.tenant_id):
            continue
        if not can_access(principal, document.allowed_roles, clearance_level(document.classification)):
            continue
        previous = db.scalars(
            select(DocumentRevision).where(
                DocumentRevision.document_id == revision.document_id,
                DocumentRevision.version == revision.version - 1,
            )
        ).first()
        if not previous:
            continue
        impacted_answers = db.scalar(
            select(func.count())
            .select_from(ReceiptEvidence)
            .where(
                ReceiptEvidence.document_id == revision.document_id,
                ReceiptEvidence.tenant_id == user.tenant_id,
                ReceiptEvidence.created_at >= previous.indexed_at,
                ReceiptEvidence.created_at < revision.indexed_at,
            )
        ) or 0
        changes.append(
            EvidenceChangeOut(
                document_id=revision.document_id,
                title=revision.title,
                source_type=revision.source_type,
                previous_version=previous.version,
                version=revision.version,
                changed_at=revision.created_at,
                source_updated_at=revision.source_updated_at,
                impacted_answers=impacted_answers,
            )
        )
        if len(changes) >= max(1, min(limit, 200)):
            break
    return changes


@router.get("/connectors")
def connector_overview(db: Session = Depends(get_db)):
    configured = db.scalars(select(Connector).order_by(Connector.name)).all()
    return {
        "configured": [{"name": c.name, "kind": c.kind, "source_type": c.source_type, "status": c.status,
                        "doc_count": c.doc_count, "last_sync_at": c.last_sync_at, "last_error": c.last_error} for c in configured],
        "available_kinds": list(IMPLEMENTED_KINDS),
        "planned_sources": list(PLANNED_SOURCES),
    }

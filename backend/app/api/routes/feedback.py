from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_current_user, get_db, require_roles, to_principal
from app.db.base import utcnow
from app.db.models import AnswerFeedback, Document, Receipt, User, new_id
from app.schemas.feedback import (
    AnswerFeedbackCreate,
    AnswerFeedbackOut,
    FeedbackReviewOut,
    FeedbackStatusUpdate,
)
from app.services.container import Container
from app.services.rbac import can_access, clearance_level

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _owned_receipt(db: Session, receipt_id: str, user: User, container: Container) -> Receipt:
    statement = select(Receipt).where(Receipt.id == receipt_id, Receipt.user_id == user.id)
    if container.settings.multi_tenant_enabled:
        statement = statement.where(Receipt.tenant_id == user.tenant_id)
    receipt = db.scalar(statement)
    if not receipt:
        raise HTTPException(404, "Answer receipt not found.")
    if receipt.status not in ("answered", "abstained"):
        raise HTTPException(422, "Feedback is only available for completed answers.")
    return receipt


def _feedback_out(feedback: AnswerFeedback) -> AnswerFeedbackOut:
    return AnswerFeedbackOut(
        id=feedback.id,
        receipt_id=feedback.receipt_id,
        helpful=feedback.helpful,
        reason=feedback.reason,
        comment=feedback.comment,
        status=feedback.status,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
    )


def _manager_can_review(
    db: Session, feedback: AnswerFeedback, receipt: Receipt, user: User, submitter: User
) -> bool:
    if submitter.department != user.department:
        return False
    citation_ids = {
        citation.get("doc_id")
        for citation in (receipt.payload or {}).get("citations", [])
        if citation.get("doc_id")
    }
    if not citation_ids:
        return True
    documents = db.scalars(select(Document).where(Document.id.in_(citation_ids))).all()
    principal = to_principal(user)
    return len(documents) == len(citation_ids) and all(
        can_access(principal, document.allowed_roles or [], clearance_level(document.classification))
        for document in documents
    )


@router.get("", response_model=list[FeedbackReviewOut])
def list_feedback(
    status: Literal["open", "reviewed", "all"] = "open",
    limit: int = Query(default=100, ge=1, le=200),
    user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    statement = (
        select(AnswerFeedback, Receipt, User)
        .join(Receipt, Receipt.id == AnswerFeedback.receipt_id)
        .join(User, User.id == AnswerFeedback.user_id)
        .order_by(AnswerFeedback.created_at.desc())
    )
    if status != "all":
        statement = statement.where(AnswerFeedback.status == status)
    if container.settings.multi_tenant_enabled:
        statement = statement.where(AnswerFeedback.tenant_id == user.tenant_id)
    if user.role == "manager":
        statement = statement.where(User.department == user.department)
    rows = db.execute(statement.limit(limit)).all()
    result = []
    for feedback, receipt, submitter in rows:
        if user.role == "manager" and not _manager_can_review(db, feedback, receipt, user, submitter):
            continue
        payload = receipt.payload or {}
        outcome = payload.get("outcome") or {}
        citations = payload.get("citations") or []
        result.append(FeedbackReviewOut(
            **_feedback_out(feedback).model_dump(),
            query=receipt.query,
            answer=outcome.get("answer", ""),
            citation_titles=list(dict.fromkeys(
                item.get("title", "") for item in citations if item.get("title")
            )),
            confidence=receipt.confidence,
            grounding=receipt.grounding,
        ))
    return result


@router.get("/receipt/{receipt_id}", response_model=AnswerFeedbackOut | None)
def get_my_feedback(
    receipt_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    _owned_receipt(db, receipt_id, user, container)
    feedback = db.scalar(select(AnswerFeedback).where(
        AnswerFeedback.receipt_id == receipt_id,
        AnswerFeedback.user_id == user.id,
    ))
    return _feedback_out(feedback) if feedback else None


@router.post("", response_model=AnswerFeedbackOut)
def submit_feedback(
    body: AnswerFeedbackCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    _owned_receipt(db, body.receipt_id, user, container)
    feedback = db.scalar(select(AnswerFeedback).where(
        AnswerFeedback.receipt_id == body.receipt_id,
        AnswerFeedback.user_id == user.id,
    ))
    if feedback:
        feedback.helpful = body.helpful
        feedback.reason = body.reason
        feedback.comment = body.comment
        feedback.status = "open"
        feedback.updated_at = utcnow()
    else:
        feedback = AnswerFeedback(
            id=new_id(),
            receipt_id=body.receipt_id,
            user_id=user.id,
            tenant_id=user.tenant_id if container.settings.multi_tenant_enabled else None,
            helpful=body.helpful,
            reason=body.reason,
            comment=body.comment,
            status="open",
        )
        db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return _feedback_out(feedback)


@router.patch("/{feedback_id}/status", response_model=AnswerFeedbackOut)
def update_feedback_status(
    feedback_id: str,
    body: FeedbackStatusUpdate,
    user: User = Depends(require_roles("manager", "admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    feedback = db.get(AnswerFeedback, feedback_id)
    if not feedback or (
        container.settings.multi_tenant_enabled and feedback.tenant_id != user.tenant_id
    ):
        raise HTTPException(404, "Feedback item not found.")
    if user.role == "manager":
        receipt = db.get(Receipt, feedback.receipt_id)
        submitter = db.get(User, feedback.user_id)
        if not receipt or not submitter or not _manager_can_review(db, feedback, receipt, user, submitter):
            raise HTTPException(404, "Feedback item not found.")
    feedback.status = body.status
    feedback.updated_at = utcnow()
    db.commit()
    db.refresh(feedback)
    return _feedback_out(feedback)

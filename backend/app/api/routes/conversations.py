from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models import Conversation, Receipt, User, new_id
from app.schemas.query import (
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    ConversationTurn,
    ConversationUpdate,
    QueryResponse,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _get_owned(db: Session, conversation_id: str, user: User) -> Conversation:
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    if not conversation:
        raise HTTPException(404, "Conversation not found")
    return conversation


def _summary(conversation: Conversation, turn_count: int) -> ConversationSummary:
    return ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        turn_count=turn_count,
    )


@router.post("", response_model=ConversationSummary, status_code=201)
def create_conversation(
    body: ConversationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = body.title.strip()
    if not title:
        raise HTTPException(422, "Conversation title cannot be blank")
    conversation = Conversation(
        id=new_id(),
        user_id=user.id,
        tenant_id=user.tenant_id,
        title=title,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return _summary(conversation, 0)


@router.get("", response_model=list[ConversationSummary])
def list_conversations(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = (
        select(Conversation, func.count(Receipt.id))
        .outerjoin(Receipt, Receipt.conversation_id == Conversation.id)
        .where(Conversation.user_id == user.id)
        .group_by(Conversation.id)
        .order_by(Conversation.updated_at.desc())
        .limit(max(1, min(limit, 100)))
        .offset(max(0, offset))
    )
    return [_summary(conversation, count) for conversation, count in db.execute(statement)]


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = _get_owned(db, conversation_id, user)
    receipts = db.scalars(
        select(Receipt)
        .where(
            Receipt.conversation_id == conversation.id,
            Receipt.user_id == user.id,
        )
        .order_by(Receipt.created_at.asc())
    ).all()
    turns = []
    for receipt in receipts:
        payload = receipt.payload or {}
        outcome = payload.get("outcome", {})
        response = QueryResponse(
            receipt_id=receipt.id,
            status=receipt.status,
            answer_mode=outcome.get("answer_mode", payload.get("answer_mode", "detailed")),
            answer=outcome.get("answer", ""),
            confidence=outcome.get("confidence", receipt.confidence),
            confidence_label=outcome.get("confidence_label", "low"),
            grounding=outcome.get("grounding", receipt.grounding),
            abstain_reason=outcome.get("abstain_reason"),
            citations=payload.get("citations", []),
            warnings=outcome.get("warnings", []),
            plan=payload.get("plan", {}),
            latency_ms=receipt.latency_ms,
        )
        turns.append(ConversationTurn(question=receipt.query, response=response, created_at=receipt.created_at))
    return ConversationDetail(
        **_summary(conversation, len(turns)).model_dump(),
        turns=turns,
    )


@router.patch("/{conversation_id}", response_model=ConversationSummary)
def rename_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = body.title.strip()
    if not title:
        raise HTTPException(422, "Conversation title cannot be blank")
    conversation = _get_owned(db, conversation_id, user)
    conversation.title = title
    db.commit()
    db.refresh(conversation)
    count = db.scalar(select(func.count(Receipt.id)).where(Receipt.conversation_id == conversation.id)) or 0
    return _summary(conversation, count)


@router.delete("/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = _get_owned(db, conversation_id, user)
    db.execute(
        update(Receipt)
        .where(Receipt.conversation_id == conversation.id)
        .values(conversation_id=None)
    )
    db.delete(conversation)
    db.commit()
    return Response(status_code=204)

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_current_user, get_db
from app.db.models import Receipt, User
from app.schemas.query import ReceiptDetail, ReceiptSummary, ReceiptVerification
from app.services.container import Container
from app.services.receipts import verify_receipt

router = APIRouter(prefix="/receipts", tags=["receipts"])


def _get_owned(db: Session, receipt_id: str, user: User) -> Receipt:
    r = db.get(Receipt, receipt_id)
    if not r or (user.role != "admin" and r.user_id != user.id):
        raise HTTPException(404, "Receipt not found")
    return r


@router.get("", response_model=list[ReceiptSummary])
def list_receipts(status: str | None = None, limit: int = 50, offset: int = 0, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    stmt = select(Receipt).order_by(Receipt.created_at.desc())
    if user.role != "admin":
        stmt = stmt.where(Receipt.user_id == user.id)
    if status:
        stmt = stmt.where(Receipt.status == status)
    rows = db.scalars(stmt.limit(max(1, min(limit, 200))).offset(max(0, offset))).all()
    return [ReceiptSummary(id=r.id, query=r.query, status=r.status, confidence=r.confidence, grounding=r.grounding,
                           latency_ms=r.latency_ms, created_at=r.created_at) for r in rows]


@router.get("/{receipt_id}", response_model=ReceiptDetail)
def get_receipt(receipt_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _get_owned(db, receipt_id, user)
    return ReceiptDetail(id=r.id, query=r.query, status=r.status, confidence=r.confidence, grounding=r.grounding,
                         latency_ms=r.latency_ms, created_at=r.created_at, payload=r.payload, signature=r.signature)


@router.get("/{receipt_id}/verify", response_model=ReceiptVerification)
def verify(receipt_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db),
           container: Container = Depends(get_container)):
    r = _get_owned(db, receipt_id, user)
    return ReceiptVerification(receipt_id=r.id, valid=verify_receipt(r, container.settings.receipt_signing_key))

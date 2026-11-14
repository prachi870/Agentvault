from __future__ import annotations

from app.core.security import sign_payload, verify_signature
from app.db.models import Receipt


def sign_receipt(payload: dict, key: str) -> str:
    return sign_payload(payload, key)


def verify_receipt(receipt: Receipt, key: str) -> bool:
    return verify_signature(receipt.payload, receipt.signature, key)

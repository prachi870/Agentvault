from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.services.receipts import all_receipts, get_receipt

router = APIRouter(prefix="/receipts", tags=["receipts"])


@router.get("")
async def list_receipts(limit: int = 20):
    """Most recent receipts first — what the dashboard's query feed polls."""
    receipts = all_receipts()
    ordered = sorted(receipts, key=lambda r: r.timestamp, reverse=True)
    return [asdict(r) for r in ordered[:limit]]


@router.get("/{receipt_id}")
async def read_receipt(receipt_id: str):
    receipt = get_receipt(receipt_id)
    if receipt is None:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt

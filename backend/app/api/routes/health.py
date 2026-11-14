from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_db
from app.services.container import Container

router = APIRouter(tags=["ops"])


@router.get("/health")
def liveness():
    return {"status": "ok"}


@router.get("/ready")
def readiness(response: Response, db: Session = Depends(get_db), container: Container = Depends(get_container)):
    checks = {}
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        checks["database"] = False
    checks["vector_store"] = container.vectors.ping()
    checks["cache"] = container.cache.ping()
    checks["storage"] = container.storage.ping()
    ok = all(checks.values())
    if not ok:
        response.status_code = 503
    return {"status": "ready" if ok else "degraded", "checks": checks}

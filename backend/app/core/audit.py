"""Best-effort audit logging for mutating requests (Phase 4). Runs off the event loop via
asyncio.to_thread since the rest of the app is synchronous SQLAlchemy - never blocks or fails a
request if the write itself fails.
"""
from __future__ import annotations

import logging

from fastapi import Request, Response

from app.core.security import decode_access_token
from app.db.models import AuditLog, User, new_id

log = logging.getLogger(__name__)

AUDITED_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
SKIP_PATH_SUFFIXES = ("/auth/login", "/auth/bootstrap")


def should_audit(request: Request) -> bool:
    return request.method in AUDITED_METHODS and not any(request.url.path.endswith(s) for s in SKIP_PATH_SUFFIXES)


def write_audit_log(app_state, request: Request, response: Response, request_id: str, duration_ms: int) -> None:
    container = app_state.container
    if not container.settings.audit_log_enabled:
        return
    user_id: str | None = None
    user_email: str | None = None
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        try:
            claims = decode_access_token(auth[7:], container.settings.secret_key)
            user_id = claims.get("sub")
        except Exception:
            user_id = None
    db = container.session_factory()
    try:
        if user_id:
            user = db.get(User, user_id)
            user_email = user.email if user else None
        db.add(AuditLog(
            id=new_id(), user_id=user_id, user_email=user_email, method=request.method,
            path=request.url.path, status_code=response.status_code,
            ip=request.client.host if request.client else None, request_id=request_id, duration_ms=duration_ms,
        ))
        db.commit()
    except Exception:
        log.exception("failed to write audit log entry")
    finally:
        db.close()

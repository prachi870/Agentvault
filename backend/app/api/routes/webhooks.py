"""Push-based sync triggers for connectors (Phase 3: "webhooks for freshness").

Deliberately outside the admin-only /connectors router: these are called by external services
(Microsoft Graph, Confluence, etc.), not by logged-in users, so auth is a per-connector shared secret
instead of a JWT. Enqueues a background sync job (falls back to inline sync if no worker queue is
configured) rather than blocking the webhook call, since source systems expect a fast 200/202.
"""
from __future__ import annotations

import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_db
from app.db.models import Connector
from app.services.container import Container
from app.workers.queue import enqueue_sync

log = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/connectors/{connector_id}")
async def connector_webhook(
    connector_id: str,
    request: Request,
    response: Response,
    validationToken: str | None = None,
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    # Microsoft Graph subscription validation handshake: echo the token back as plain text.
    if validationToken is not None:
        return Response(content=validationToken, media_type="text/plain")

    conn = db.get(Connector, connector_id)
    if not conn:
        raise HTTPException(404, "Connector not found")

    secret = (conn.config or {}).get("webhook_secret")
    if secret:
        provided = request.headers.get("x-webhook-secret") or request.query_params.get("secret", "")
        if not hmac.compare_digest(provided, secret):
            raise HTTPException(401, "Invalid webhook secret")

    job_id = enqueue_sync(container, connector_id)
    log.info("webhook triggered sync for connector %s (job=%s)", conn.name, job_id)
    return {"connector": conn.name, "queued": bool(job_id), "job_id": job_id}

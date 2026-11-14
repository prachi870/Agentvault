"""Periodic connector sync (Phase 3). Runs an in-process tick every minute checking which connectors
are due (by `sync_interval_minutes`) and enqueues a sync job for each - via Redis/RQ if configured,
inline otherwise (see app.workers.queue). Opt-in via SCHEDULER_ENABLED, off by default so tests and
quick local runs are not surprised by background network calls to connector sources.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.base import as_utc
from app.db.models import Connector
from app.services.container import Container
from app.workers.queue import enqueue_sync

log = logging.getLogger(__name__)


def _tick(container: Container) -> None:
    db = container.session_factory()
    try:
        now = datetime.now(timezone.utc)
        due = db.scalars(select(Connector).where(Connector.sync_interval_minutes.isnot(None))).all()
        for conn in due:
            if conn.status == "syncing":
                continue
            last = as_utc(conn.last_sync_at)
            if last is not None and (now - last).total_seconds() < conn.sync_interval_minutes * 60:
                continue
            log.info("scheduler: connector %s is due for sync", conn.name)
            try:
                enqueue_sync(container, conn.id)
            except Exception:
                log.exception("scheduler: failed to enqueue sync for connector %s", conn.name)
    finally:
        db.close()


def start_scheduler(container: Container):
    if not container.settings.scheduler_enabled:
        return None
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(_tick, "interval", minutes=1, args=[container], id="connector_sync_tick",
                      max_instances=1, coalesce=True, next_run_time=datetime.now(timezone.utc))
    scheduler.start()
    log.info("connector sync scheduler started (tick=1m)")
    return scheduler

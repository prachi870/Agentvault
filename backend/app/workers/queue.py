"""Redis-backed job queue (RQ). Falls back to running the job inline when no Redis is configured -
so dev/tests (which default to the in-process MemoryCache) keep working without a worker running.

RQ needs its own connection with decode_responses=False (it stores pickled bytes), so this does not
reuse Cache.raw - it opens a dedicated connection from settings.redis_url.
"""
from __future__ import annotations

import logging

from app.services.container import Container

log = logging.getLogger(__name__)

QUEUE_NAME = "esakip-sync"


def _queue():
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.redis_url:
        return None
    try:
        import redis
        from rq import Queue
    except ImportError:
        log.warning("REDIS_URL is set but rq is not installed (pip install -r requirements-workers.txt); running inline")
        return None
    conn = redis.Redis.from_url(settings.redis_url, decode_responses=False, socket_timeout=5)
    return Queue(QUEUE_NAME, connection=conn)


def enqueue_sync(container: Container, connector_id: str) -> str | None:
    q = _queue()
    if q is not None:
        job = q.enqueue("app.workers.tasks.sync_connector_job", connector_id, job_timeout=1800)
        return job.id
    from app.workers.tasks import sync_connector_job

    sync_connector_job(connector_id)
    return None


def enqueue_reindex(container: Container, doc_id: str) -> str | None:
    q = _queue()
    if q is not None:
        job = q.enqueue("app.workers.tasks.reindex_document_job", doc_id, job_timeout=600)
        return job.id
    from app.workers.tasks import reindex_document_job

    reindex_document_job(doc_id)
    return None

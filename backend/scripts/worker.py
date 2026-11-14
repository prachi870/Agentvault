#!/usr/bin/env python
"""RQ worker process for background jobs (connector sync, reindex).

Run from backend/:
    python scripts/worker.py
Needs REDIS_URL set (otherwise there is nothing to consume - jobs run inline in the API process instead).
"""
from __future__ import annotations

import logging
import sys

from app.core.config import get_settings
from app.core.logging import configure_logging

log = logging.getLogger("esakip.worker")


def main() -> None:
    settings = get_settings()
    configure_logging(settings.env)
    if not settings.redis_url:
        log.error("REDIS_URL is not set - nothing to consume. Jobs run inline in the API process without a queue.")
        sys.exit(1)
    import redis
    from rq import Queue, Worker

    conn = redis.Redis.from_url(settings.redis_url, decode_responses=False, socket_timeout=5)
    queue = Queue("esakip-sync", connection=conn)
    log.info("esakip worker starting, listening on queue '%s'", queue.name)
    Worker([queue], connection=conn).work()


if __name__ == "__main__":
    main()

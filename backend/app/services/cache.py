"""Redis-backed cache/counters with an in-process fallback for dev and tests."""
from __future__ import annotations

import threading
import time
from typing import Protocol


class Cache(Protocol):
    backend: str
    raw: object | None  # underlying redis.Redis, when backend == "redis" (used by app.workers.queue)

    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str, ttl: int | None = None) -> None: ...
    def incr(self, key: str, ttl: int) -> int: ...
    def ping(self) -> bool: ...


class MemoryCache:
    backend = "memory"
    raw = None

    def __init__(self) -> None:
        self._data: dict[str, tuple[str, float | None]] = {}
        self._lock = threading.Lock()

    def _alive(self, key: str) -> str | None:
        item = self._data.get(key)
        if not item:
            return None
        value, exp = item
        if exp is not None and exp < time.time():
            self._data.pop(key, None)
            return None
        return value

    def get(self, key: str) -> str | None:
        with self._lock:
            return self._alive(key)

    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        with self._lock:
            self._data[key] = (value, time.time() + ttl if ttl else None)

    def incr(self, key: str, ttl: int) -> int:
        with self._lock:
            current = self._alive(key)
            exp = self._data[key][1] if current is not None else time.time() + ttl
            new = int(current or 0) + 1
            self._data[key] = (str(new), exp)
            return new

    def ping(self) -> bool:
        return True


class RedisCache:
    backend = "redis"

    def __init__(self, url: str) -> None:
        import redis

        self._r = redis.Redis.from_url(url, decode_responses=True, socket_timeout=2)
        self.raw = self._r

    def get(self, key: str) -> str | None:
        return self._r.get(key)

    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        self._r.set(key, value, ex=ttl)

    def incr(self, key: str, ttl: int) -> int:
        pipe = self._r.pipeline()
        pipe.incr(key)
        pipe.expire(key, ttl, nx=True)
        return int(pipe.execute()[0])

    def ping(self) -> bool:
        try:
            return bool(self._r.ping())
        except Exception:
            return False


def build_cache(redis_url: str | None) -> Cache:
    return RedisCache(redis_url) if redis_url else MemoryCache()

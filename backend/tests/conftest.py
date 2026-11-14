from __future__ import annotations

import contextlib
import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

from tests.corpus import CORPUS


def make_settings(tmp_path, **overrides) -> Settings:
    base = dict(
        env="test", database_url=os.getenv("TEST_DATABASE_URL", "sqlite://"), redis_url=os.getenv("TEST_REDIS_URL") or None,
        qdrant_url=os.getenv("TEST_QDRANT_URL") or None, qdrant_path=None, local_storage_dir=str(tmp_path / "uploads"),
        connector_allowed_root=str(tmp_path / "connector_root"),
        secret_key="test-secret-key-0123456789-abcdefghijklmnop", receipt_signing_key="test-receipt-key-0123456789-abcdefghij",
        rate_limit_per_minute=1000, bcrypt_rounds=4,
    )
    base.update(overrides)
    return Settings(**base)


@pytest.fixture
def settings(tmp_path):
    (tmp_path / "connector_root").mkdir()
    return make_settings(tmp_path)


@contextlib.contextmanager
def running_app(settings):
    """Runs the app; when tests target real Postgres/Redis (TEST_DATABASE_URL/TEST_REDIS_URL) start and end clean."""
    if settings.redis_url:
        import redis
        redis.Redis.from_url(settings.redis_url).flushdb()
    if settings.qdrant_url:
        from qdrant_client import QdrantClient
        QdrantClient(url=settings.qdrant_url).delete_collection(settings.qdrant_collection)
    app = create_app(settings)
    with TestClient(app) as c:
        try:
            yield c
        finally:
            if not settings.database_url.startswith("sqlite"):
                from app.db.base import Base
                Base.metadata.drop_all(app.state.container.engine)


@pytest.fixture
def client(settings):
    with running_app(settings) as c:
        yield c


def _login(client, email, password="Passw0rd!x"):
    r = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def users(client):
    """Bootstrap an admin and create one user per role. Returns {role: auth_headers}."""
    pw = "Passw0rd!x"
    r = client.post("/api/v1/auth/bootstrap", json={"email": "admin@corp.test", "password": pw, "full_name": "Admin"})
    assert r.status_code == 201, r.text
    admin = _login(client, "admin@corp.test")
    out = {"admin": admin}
    for role in ("manager", "employee", "viewer"):
        r = client.post("/api/v1/users", headers=admin, json={"email": f"{role}@corp.test", "password": pw, "role": role, "department": "eng"})
        assert r.status_code == 201, r.text
        out[role] = _login(client, f"{role}@corp.test")
    return out


@pytest.fixture
def loaded(client, users):
    """Client with the sample corpus indexed by the admin."""
    ids = {}
    for doc in CORPUS:
        r = client.post(
            "/api/v1/documents", headers=users["admin"],
            files={"file": (doc["filename"], doc["text"].encode(), "text/plain")},
            data={k: v for k, v in doc.items() if k in ("title", "source_type", "classification", "allowed_roles", "source_updated_at")},
        )
        assert r.status_code == 201, r.text
        ids[doc["title"]] = r.json()["id"]
    return ids


def ask(client, headers, question):
    r = client.post("/api/v1/query", headers=headers, json={"question": question})
    assert r.status_code == 200, r.text
    return r.json()

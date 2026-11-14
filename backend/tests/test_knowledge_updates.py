from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select

from app.db.base import utcnow
from app.db.models import Document, DocumentRevision, Receipt, ReceiptEvidence, User


def _add_document_history(client, users):
    container = client.app.state.container
    with container.session_factory() as db:
        admin = db.scalars(select(User).where(User.email == "admin@corp.test")).first()
        now = utcnow()
        doc_id = uuid4().hex
        first_indexed = now - timedelta(days=3)
        second_indexed = now - timedelta(days=1)
        internal = Document(
            id=doc_id,
            title="Demo Leave Policy",
            source_type="upload",
            classification="internal",
            allowed_roles=["employee", "manager", "admin"],
            content_sha256="1" * 64,
            chunk_count=2,
            status="indexed",
            owner_id=admin.id,
            source_updated_at=second_indexed,
            created_at=first_indexed,
            indexed_at=second_indexed,
        )
        confidential = Document(
            id=uuid4().hex,
            title="Confidential Planning Memo",
            source_type="upload",
            classification="confidential",
            allowed_roles=["manager", "admin"],
            content_sha256="2" * 64,
            chunk_count=1,
            status="indexed",
            owner_id=admin.id,
            source_updated_at=now,
            created_at=now,
            indexed_at=now,
        )
        db.add_all([internal, confidential])
        db.flush()
        receipt_id = uuid4().hex
        evidence_created_at = now - timedelta(days=2)
        db.add(
            Receipt(
                id=receipt_id,
                user_id=admin.id,
                query="What changed in the leave policy?",
                status="answered",
                payload={},
                signature="a" * 64,
                created_at=evidence_created_at,
            )
        )
        db.flush()
        db.add_all([
            DocumentRevision(
                document_id=internal.id,
                version=1,
                title=internal.title,
                source_type=internal.source_type,
                content_sha256="3" * 64,
                source_updated_at=first_indexed,
                indexed_at=first_indexed,
                created_at=first_indexed,
            ),
            DocumentRevision(
                document_id=internal.id,
                version=2,
                title=internal.title,
                source_type=internal.source_type,
                content_sha256=internal.content_sha256,
                source_updated_at=second_indexed,
                indexed_at=second_indexed,
                created_at=second_indexed,
            ),
            DocumentRevision(
                document_id=confidential.id,
                version=1,
                title=confidential.title,
                source_type=confidential.source_type,
                content_sha256=confidential.content_sha256,
                source_updated_at=now,
                indexed_at=now,
                created_at=now,
            ),
            ReceiptEvidence(
                receipt_id=receipt_id,
                document_id=internal.id,
                created_at=evidence_created_at,
            ),
        ])
        db.commit()
        return internal.id, confidential.id


def test_knowledge_updates_are_recent_and_role_filtered(client, users):
    internal_id, confidential_id = _add_document_history(client, users)

    assert client.get("/api/v1/documents/updates").status_code == 401

    employee = client.get("/api/v1/documents/updates?days=30", headers=users["employee"])
    assert employee.status_code == 200, employee.text
    employee_updates = employee.json()
    assert {item["document_id"] for item in employee_updates} == {internal_id}
    revised = next(item for item in employee_updates if item["version"] == 2)
    assert revised["change_type"] == "updated"
    assert revised["impacted_answers"] == 1
    assert "1 earlier answer cited the previous version" in revised["summary"]

    manager = client.get("/api/v1/documents/updates?days=30", headers=users["manager"])
    assert manager.status_code == 200, manager.text
    assert confidential_id in {item["document_id"] for item in manager.json()}

    viewer = client.get("/api/v1/documents/updates?days=30", headers=users["viewer"])
    assert viewer.status_code == 200, viewer.text
    assert viewer.json() == []

    admin = client.get("/api/v1/documents/updates?days=30", headers=users["admin"])
    assert admin.status_code == 200, admin.text
    assert {item["document_id"] for item in admin.json()} == {internal_id, confidential_id}

from __future__ import annotations

from sqlalchemy import func, select

from app.db.models import AnswerFeedback
from tests.conftest import ask


def test_feedback_is_owned_upserted_and_reviewed_privately(client, users, loaded):
    question = "How many days of annual leave do employees get?"
    answer = ask(client, users["employee"], question)
    receipt_id = answer["receipt_id"]
    feedback_body = {
        "receipt_id": receipt_id,
        "helpful": False,
        "reason": "wrong_source",
        "comment": "The answer needs a more direct policy citation.",
    }

    other_answer = ask(client, users["admin"], question)
    unauthorized = client.post(
        "/api/v1/feedback",
        headers=users["employee"],
        json={**feedback_body, "receipt_id": other_answer["receipt_id"]},
    )
    assert unauthorized.status_code == 404

    saved = client.post("/api/v1/feedback", headers=users["employee"], json=feedback_body)
    assert saved.status_code == 200, saved.text
    feedback_id = saved.json()["id"]
    mine = client.get(f"/api/v1/feedback/receipt/{receipt_id}", headers=users["employee"])
    assert mine.status_code == 200
    assert mine.json()["reason"] == "wrong_source"
    assert mine.json()["status"] == "open"

    manager_review = client.get("/api/v1/feedback?status=open", headers=users["manager"])
    assert manager_review.status_code == 200
    assert len(manager_review.json()) == 1
    assert manager_review.json()[0]["id"] == feedback_id
    assert "employee@corp.test" not in manager_review.json()[0]
    assert client.get("/api/v1/feedback", headers=users["viewer"]).status_code == 403

    access_update = client.patch(
        f"/api/v1/documents/{loaded['Leave Policy']}",
        headers=users["admin"],
        json={"allowed_roles": ["employee"]},
    )
    assert access_update.status_code == 200, access_update.text
    assert client.get("/api/v1/feedback?status=open", headers=users["manager"]).json() == []
    hidden_from_manager = client.patch(
        f"/api/v1/feedback/{feedback_id}/status",
        headers=users["manager"],
        json={"status": "reviewed"},
    )
    assert hidden_from_manager.status_code == 404

    review = client.get("/api/v1/feedback?status=open", headers=users["admin"])
    assert review.status_code == 200, review.text
    entry = next(item for item in review.json() if item["id"] == feedback_id)
    assert entry["query"] == question
    assert "The answer needs a more direct policy citation." == entry["comment"]
    assert "employee@corp.test" not in entry
    assert entry["citation_titles"] == ["Leave Policy"]

    marked = client.patch(
        f"/api/v1/feedback/{feedback_id}/status",
        headers=users["admin"],
        json={"status": "reviewed"},
    )
    assert marked.status_code == 200
    assert marked.json()["status"] == "reviewed"
    assert client.get("/api/v1/feedback?status=open", headers=users["admin"]).json() == []

    updated = client.post(
        "/api/v1/feedback",
        headers=users["employee"],
        json={"receipt_id": receipt_id, "helpful": True, "comment": "Updated after review."},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["id"] == feedback_id
    assert updated.json()["status"] == "open"
    with client.app.state.container.session_factory() as db:
        assert db.scalar(select(func.count()).select_from(AnswerFeedback)) == 1


def test_unhelpful_feedback_requires_a_reason_and_receipt(client, users, loaded):
    answer = ask(client, users["employee"], "How many days of annual leave do employees get?")
    missing_reason = client.post(
        "/api/v1/feedback",
        headers=users["employee"],
        json={"receipt_id": answer["receipt_id"], "helpful": False},
    )
    assert missing_reason.status_code == 422

    missing_receipt = client.post(
        "/api/v1/feedback",
        headers=users["employee"],
        json={"receipt_id": "0" * 32, "helpful": True},
    )
    assert missing_receipt.status_code == 404

from __future__ import annotations

from sqlalchemy import func, select

from app.db.models import EvaluationCase, KnowledgeGap, Receipt, ReceiptEvidence


def _side_effect_counts(client):
    container = client.app.state.container
    with container.session_factory() as db:
        return {
            "receipts": db.scalar(select(func.count()).select_from(Receipt)),
            "evidence": db.scalar(select(func.count()).select_from(ReceiptEvidence)),
            "gaps": db.scalar(select(func.count()).select_from(KnowledgeGap)),
        }


def test_evaluation_is_admin_only_and_does_not_create_query_side_effects(client, users, loaded):
    source_id = loaded["Leave Policy"]
    body = {
        "title": "Annual leave answer",
        "question": "How many days of paid annual leave do employees receive?",
        "expected_document_ids": [source_id],
        "required_phrases": ["24 days"],
    }

    assert client.get("/api/v1/evaluation/cases", headers=users["employee"]).status_code == 403
    assert client.post("/api/v1/evaluation/cases", headers=users["employee"], json=body).status_code == 403

    conversation = client.post("/api/v1/conversations", headers=users["admin"], json={"title": "Keep unchanged"})
    assert conversation.status_code == 201, conversation.text
    conversation_id = conversation.json()["id"]
    initial_conversation = client.get(
        f"/api/v1/conversations/{conversation_id}", headers=users["admin"]
    ).json()
    before = _side_effect_counts(client)

    created = client.post("/api/v1/evaluation/cases", headers=users["admin"], json=body)
    assert created.status_code == 201, created.text
    case_id = created.json()["id"]

    run = client.post("/api/v1/evaluation/run", headers=users["admin"], json={"case_ids": [case_id]})
    assert run.status_code == 200, run.text
    result = run.json()["results"][0]
    assert result["status"] == "answered"
    assert result["sources"] == [{"id": source_id, "title": "Leave Policy", "matched": True}]
    assert result["phrases"] == [{"phrase": "24 days", "matched": True}]
    assert result["passed"] is True
    assert _side_effect_counts(client) == before

    after_conversation = client.get(
        f"/api/v1/conversations/{conversation_id}", headers=users["admin"]
    ).json()
    assert after_conversation["updated_at"] == initial_conversation["updated_at"]
    cases = client.get("/api/v1/evaluation/cases", headers=users["admin"])
    assert cases.status_code == 200
    assert cases.json()[0]["last_result"]["passed"] is True


def test_evaluation_rejects_sources_outside_the_indexed_library(client, users):
    invalid = {
        "title": "Invalid source",
        "question": "Where is the source?",
        "expected_document_ids": ["0" * 32],
        "required_phrases": [],
    }
    response = client.post("/api/v1/evaluation/cases", headers=users["admin"], json=invalid)
    assert response.status_code == 422
    with client.app.state.container.session_factory() as db:
        assert db.scalar(select(func.count()).select_from(EvaluationCase)) == 0

from __future__ import annotations

from tests.conftest import ask


def test_sample_library_is_restricted_idempotent_and_searchable(client, users):
    denied = client.post("/api/v1/documents/sample-pack", headers=users["employee"])
    assert denied.status_code == 403

    first = client.post("/api/v1/documents/sample-pack", headers=users["manager"])
    assert first.status_code == 200, first.text
    result = first.json()
    assert result["added"] == 4
    assert result["total"] == 4
    assert {doc["classification"] for doc in result["documents"]} == {"internal"}
    assert {doc["title"] for doc in result["documents"]} == {
        "Demo: Employee Leave and Remote Work",
        "Demo: Travel and Expense Policy",
        "Demo: Security and Incident Response",
        "Demo: Customer Support Escalation Guide",
    }

    second = client.post("/api/v1/documents/sample-pack", headers=users["manager"])
    assert second.status_code == 200, second.text
    assert second.json()["added"] == 0
    assert {doc["id"] for doc in second.json()["documents"]} == {doc["id"] for doc in result["documents"]}

    visible_to_employee = client.get("/api/v1/documents?limit=50", headers=users["employee"])
    assert visible_to_employee.status_code == 200
    assert len(visible_to_employee.json()) == 4

    answer = ask(client, users["employee"], "How many paid time-off days does Northstar Demo Company provide each year?")
    assert answer["status"] == "answered", answer
    assert any(citation["title"] == "Demo: Employee Leave and Remote Work" for citation in answer["citations"])

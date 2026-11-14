import json


def test_conversation_history_is_private_restorable_and_deletable(client, users, loaded):
    created = client.post(
        "/api/v1/conversations",
        headers=users["employee"],
        json={"title": "Annual leave"},
    )
    assert created.status_code == 201, created.text
    conversation_id = created.json()["id"]

    streamed = client.post(
        "/api/v1/query/stream",
        headers=users["employee"],
        json={
            "question": "How many days of annual leave do employees get?",
            "conversation_id": conversation_id,
        },
    )
    assert streamed.status_code == 200, streamed.text
    result_events = [
        json.loads(line[6:])
        for line in streamed.text.splitlines()
        if line.startswith("data: ") and '"type": "result"' in line
    ]
    assert result_events, streamed.text
    response = result_events[-1]["response"]
    assert response["status"] == "answered"
    assert response["citations"]

    detail = client.get(f"/api/v1/conversations/{conversation_id}", headers=users["employee"])
    assert detail.status_code == 200, detail.text
    saved = detail.json()
    assert saved["title"] == "Annual leave"
    assert saved["turn_count"] == 1
    assert saved["turns"][0]["question"] == "How many days of annual leave do employees get?"
    assert saved["turns"][0]["response"]["answer"] == response["answer"]
    assert saved["turns"][0]["response"]["citations"] == response["citations"]

    history = client.get("/api/v1/conversations", headers=users["employee"])
    assert history.status_code == 200
    assert history.json()[0]["id"] == conversation_id
    assert history.json()[0]["turn_count"] == 1
    assert client.get(f"/api/v1/conversations/{conversation_id}", headers=users["viewer"]).status_code == 404
    assert client.get("/api/v1/conversations", headers=users["viewer"]).json() == []
    assert client.post(
        "/api/v1/query",
        headers=users["viewer"],
        json={"question": "What is in this conversation?", "conversation_id": conversation_id},
    ).status_code == 404

    renamed = client.patch(
        f"/api/v1/conversations/{conversation_id}",
        headers=users["employee"],
        json={"title": "Leave entitlement"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "Leave entitlement"

    receipt_id = response["receipt_id"]
    removed = client.delete(f"/api/v1/conversations/{conversation_id}", headers=users["employee"])
    assert removed.status_code == 204
    assert client.get(f"/api/v1/conversations/{conversation_id}", headers=users["employee"]).status_code == 404
    assert client.get(f"/api/v1/receipts/{receipt_id}", headers=users["employee"]).status_code == 200

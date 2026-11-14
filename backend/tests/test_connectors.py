import sqlite3

from tests.conftest import ask


def _create(client, users, **body):
    return client.post("/api/v1/connectors", headers=users["admin"], json=body)


def test_directory_connector_sync_update_and_removal(client, users, settings):
    from pathlib import Path
    root = Path(settings.connector_allowed_root)
    (root / "hr").mkdir()
    (root / "hr" / "onboarding.md").write_text("New hires must complete security training within 7 days of joining the company.")
    (root / "hr" / "parking.txt").write_text("Parking permits are issued by the facilities office every Monday morning.")
    r = _create(client, users, name="HR share", kind="directory", source_type="sharepoint", config={"path": "hr"})
    assert r.status_code == 201, r.text
    cid = r.json()["id"]

    s = client.post(f"/api/v1/connectors/{cid}/sync", headers=users["admin"]).json()["stats"]
    assert s["created"] == 2 and s["failed"] == 0
    assert ask(client, users["employee"], "Within how many days must new hires complete security training?")["status"] == "answered"

    assert client.post(f"/api/v1/connectors/{cid}/sync", headers=users["admin"]).json()["stats"]["unchanged"] == 2

    (root / "hr" / "onboarding.md").write_text("New hires must complete security training within 14 days of joining the company.")
    (root / "hr" / "parking.txt").unlink()
    s = client.post(f"/api/v1/connectors/{cid}/sync", headers=users["admin"]).json()["stats"]
    assert s["updated"] == 1 and s["removed"] == 1
    res = ask(client, users["employee"], "Within how many days must new hires complete security training?")
    assert "14" in res["answer"] and "7 days" not in res["answer"]
    changes = client.get("/api/v1/dashboard/evidence-changes", headers=users["manager"])
    assert changes.status_code == 200, changes.text
    onboarding_change = next(item for item in changes.json() if item["title"] == "onboarding")
    assert onboarding_change["previous_version"] == 1
    assert onboarding_change["version"] == 2
    assert onboarding_change["impacted_answers"] == 1
    assert ask(client, users["employee"], "When are parking permits issued by facilities?")["status"] == "abstained"

    ov = client.get("/api/v1/dashboard/connectors", headers=users["manager"]).json()
    assert ov["configured"][0]["status"] == "ok" and ov["configured"][0]["doc_count"] == 1
    assert "confluence" in ov["available_kinds"]  # Phase 3: native connectors are implemented now, not just planned


def test_directory_connector_blocks_path_traversal_and_non_admins(client, users):
    assert _create(client, users, name="evil", kind="directory", config={"path": "../.."}).status_code == 422
    r = client.post("/api/v1/connectors", headers=users["manager"], json={"name": "x", "kind": "directory", "config": {"path": "."}})
    assert r.status_code == 403


def test_connector_default_classification_applies(client, users, settings):
    from pathlib import Path
    root = Path(settings.connector_allowed_root)
    (root / "fin").mkdir()
    (root / "fin" / "budget.txt").write_text("The departmental travel budget for next year is 90000 dollars in total.")
    cid = _create(client, users, name="Finance", kind="directory", config={"path": "fin"},
                  default_classification="confidential").json()["id"]
    client.post(f"/api/v1/connectors/{cid}/sync", headers=users["admin"])
    q = "What is the departmental travel budget for next year?"
    assert ask(client, users["employee"], q)["status"] == "abstained"
    assert ask(client, users["manager"], q)["status"] == "answered"


def test_sql_connector(client, users, tmp_path):
    db = tmp_path / "crm.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE customers (id INTEGER, name TEXT, notes TEXT, updated_at TEXT)")
    con.execute("INSERT INTO customers VALUES (1, 'Acme Corp', 'Acme renewed the enterprise contract for 3 years with a 15 percent discount.', '2026-08-01T00:00:00')")
    con.execute("INSERT INTO customers VALUES (2, 'Globex', 'Globex requested a security review before signing the annual agreement.', '2026-08-02T00:00:00')")
    con.commit(); con.close()
    cfg = {"url": f"sqlite:///{db}", "query": "SELECT id, name, notes, updated_at FROM customers", "id_column": "id",
           "title_column": "name", "text_columns": ["name", "notes"], "updated_at_column": "updated_at", "table_label": "customer"}
    cid = _create(client, users, name="CRM", kind="sql", source_type="sql", config=cfg).json()["id"]
    assert client.post(f"/api/v1/connectors/{cid}/sync", headers=users["admin"]).json()["stats"]["created"] == 2
    res = ask(client, users["employee"], "What discount did Acme get on the enterprise contract renewal?")
    assert res["status"] == "answered" and "15" in res["answer"] and res["citations"][0]["source_type"] == "sql"


def test_sql_connector_rejects_writes_and_hides_password(client, users):
    base = {"url": "sqlite:///x.db", "id_column": "id", "text_columns": ["a"]}
    for bad in ("DELETE FROM t", "SELECT 1; DROP TABLE t", "SELECT * INTO backup FROM t", "UPDATE t SET a=1"):
        assert _create(client, users, name=f"bad-{abs(hash(bad))}", kind="sql", source_type="sql", config={**base, "query": bad}).status_code == 422, bad
    ok = _create(client, users, name="pg", kind="sql", source_type="sql",
                 config={**base, "url": "postgresql://reader:s3cret@db.internal/crm", "query": "SELECT id, a FROM t"})
    assert ok.status_code == 201 and "s3cret" not in ok.text

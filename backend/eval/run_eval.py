#!/usr/bin/env python
"""Phase 4 evaluation harness: golden Q&A set, answer accuracy, citation precision, abstention
correctness, RBAC leak tests. Spins up the app in-process against a throwaway SQLite DB and the
`local`/`hash` offline providers by default, so it runs with zero external services - the same
sample corpus the unit tests use (tests/corpus.py), for one source of truth.

    python eval/run_eval.py                     # human-readable report
    python eval/run_eval.py --json report.json   # also write a machine-readable report
    python eval/run_eval.py --fail-under 1.0      # exit 1 if any case fails (default; CI gate)

This intentionally re-tests the whole retrieve -> grade -> generate -> verify pipeline through the
real HTTP API (not internal function calls), so a regression anywhere in that chain shows up here.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(BACKEND_ROOT / "tests"))

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402
from tests.corpus import CORPUS  # noqa: E402

GOLDEN_PATH = Path(__file__).with_name("golden.jsonl")
PASSWORD = "Passw0rd!x"


def load_golden(path: Path = GOLDEN_PATH) -> list[dict]:
    cases = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            cases.append(json.loads(line))
    return cases


def build_client(tmp_dir: str) -> TestClient:
    settings = Settings(
        env="test", database_url="sqlite://", redis_url=None, qdrant_url=None,
        local_storage_dir=f"{tmp_dir}/uploads", connector_allowed_root=f"{tmp_dir}/connector_root",
        secret_key="eval-secret-key-0123456789-abcdefghijklmnop", receipt_signing_key="eval-receipt-key-0123456789-abcdefghij",
        rate_limit_per_minute=100_000, bcrypt_rounds=4,
    )
    Path(settings.connector_allowed_root).mkdir(parents=True, exist_ok=True)
    app = create_app(settings)
    client = TestClient(app)
    client.__enter__()  # triggers lifespan startup; caller is responsible for __exit__
    return client


def seed(client: TestClient) -> dict[str, dict]:
    """Bootstraps an admin + one user per role, and indexes the shared sample corpus. Returns
    {role: auth_headers}."""
    r = client.post("/api/v1/auth/bootstrap", json={"email": "admin@corp.test", "password": PASSWORD, "full_name": "Admin"})
    assert r.status_code == 201, r.text
    headers = {"admin": _login(client, "admin@corp.test")}
    for role in ("manager", "employee", "viewer"):
        r = client.post("/api/v1/users", headers=headers["admin"],
                        json={"email": f"{role}@corp.test", "password": PASSWORD, "role": role, "department": "eng"})
        assert r.status_code == 201, r.text
        headers[role] = _login(client, f"{role}@corp.test")
    for doc in CORPUS:
        r = client.post(
            "/api/v1/documents", headers=headers["admin"],
            files={"file": (doc["filename"], doc["text"].encode(), "text/plain")},
            data={k: v for k, v in doc.items() if k in ("title", "source_type", "classification", "allowed_roles", "source_updated_at")},
        )
        assert r.status_code == 201, r.text
    return headers


def _login(client: TestClient, email: str) -> dict:
    r = client.post("/api/v1/auth/login", data={"username": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def evaluate_case(client: TestClient, headers: dict, case: dict) -> dict:
    r = client.post("/api/v1/query", headers=headers[case["role"]], json={"question": case["question"]})
    result = {"id": case["id"], "question": case["question"], "role": case["role"], "checks": {}, "ok": True}
    if r.status_code != 200:
        result["ok"] = False
        result["checks"]["http"] = f"expected 200, got {r.status_code}: {r.text[:200]}"
        return result
    body = r.json()
    answer_lower = (body.get("answer") or "").lower()
    cited_titles = {c["title"] for c in body.get("citations", [])}

    def check(name: str, passed: bool, detail: str = "") -> None:
        result["checks"][name] = "pass" if passed else f"FAIL {detail}"
        result["ok"] = result["ok"] and passed

    if "expect_status" in case:
        check("status", body["status"] == case["expect_status"], f"got {body['status']!r}, want {case['expect_status']!r}")
    for phrase in case.get("expect_answer_contains", []):
        check(f"contains:{phrase}", phrase.lower() in answer_lower, "not found in answer")
    for phrase in case.get("forbidden_in_answer", []):
        check(f"forbidden:{phrase}", phrase.lower() not in answer_lower, "found in answer (should not be)")
    for title in case.get("expect_cited_titles", []):
        check(f"cites:{title}", title in cited_titles, f"cited={sorted(cited_titles)}")
    if case.get("rbac_leak_check"):
        forbidden = set(case.get("forbidden_cited_titles", []))
        leaked = forbidden & cited_titles
        check("rbac_no_leak", not leaked and body["status"] != "answered" or not leaked,
              f"leaked forbidden titles into citations/answer: {leaked}")
        # Stronger check: the restricted content must not appear verbatim in the answer text either.
        for title in forbidden:
            check(f"rbac_not_in_answer:{title}", title.lower() not in answer_lower, "restricted title echoed in answer")
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--golden", type=Path, default=GOLDEN_PATH)
    ap.add_argument("--json", type=Path, help="also write a machine-readable JSON report here")
    ap.add_argument("--fail-under", type=float, default=1.0, help="minimum pass rate (0-1) to exit 0; default 1.0")
    args = ap.parse_args()

    cases = load_golden(args.golden)
    with tempfile.TemporaryDirectory() as tmp:
        client = build_client(tmp)
        try:
            headers = seed(client)
            results = [evaluate_case(client, headers, c) for c in cases]
        finally:
            client.__exit__(None, None, None)

    passed = sum(1 for r in results if r["ok"])
    pass_rate = passed / len(results) if results else 1.0

    print(f"\n{'ID':<28} {'STATUS':<6} DETAILS")
    print("-" * 90)
    for r in results:
        mark = "PASS" if r["ok"] else "FAIL"
        print(f"{r['id']:<28} {mark:<6} " + ", ".join(f"{k}={v}" for k, v in r["checks"].items() if v != "pass" or len(r['checks']) <= 2))
    print("-" * 90)
    print(f"{passed}/{len(results)} passed ({pass_rate:.0%})\n")

    if args.json:
        args.json.write_text(json.dumps({"pass_rate": pass_rate, "results": results}, indent=2))

    return 0 if pass_rate >= args.fail_under else 1


if __name__ == "__main__":
    raise SystemExit(main())

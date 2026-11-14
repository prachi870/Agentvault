"""Jira Cloud connector (REST API v3). Auth: email + API token (Basic).

ACL mirroring: project -> roles via `config.acl_map` (e.g. {"project:ENG": ["employee","manager","admin"]}),
same simplification/caveat as the Confluence connector.
"""
from __future__ import annotations

import base64
from datetime import datetime, timezone
from typing import Iterator

import httpx

from app.core.errors import AppError
from app.services.connectors.base import RawItem

REQUIRED = ("base_url", "email", "api_token")


class JiraConnector:
    def __init__(self, config: dict) -> None:
        self.config = config

    def _client(self) -> httpx.Client:
        c = self.config
        token = base64.b64encode(f"{c['email']}:{c['api_token']}".encode()).decode()
        return httpx.Client(
            base_url=c["base_url"].rstrip("/"),
            headers={"Authorization": f"Basic {token}", "Accept": "application/json"},
            timeout=30,
        )

    def validate(self) -> None:
        for key in REQUIRED:
            if not self.config.get(key):
                raise AppError(f"config.{key} is required for jira connectors", 422)
        try:
            with self._client() as client:
                resp = client.get("/rest/api/3/myself")
                resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise AppError(f"could not reach Jira: {exc}", 422) from exc

    def _acl_roles(self, project_key: str) -> list[str] | None:
        acl_map: dict = self.config.get("acl_map") or {}
        return acl_map.get(f"project:{project_key}")

    def fetch(self) -> Iterator[RawItem]:
        jql = self.config.get("jql") or "order by updated desc"
        fields = "summary,description,comment,status,updated,project,issuetype"
        with self._client() as client:
            start_at = 0
            while True:
                resp = client.get(
                    "/rest/api/3/search",
                    params={"jql": jql, "startAt": start_at, "maxResults": 50, "fields": fields},
                )
                resp.raise_for_status()
                data = resp.json()
                issues = data.get("issues", [])
                for issue in issues:
                    f = issue.get("fields", {})
                    desc = _adf_to_text(f.get("description"))
                    comments = "\n".join(_adf_to_text(c.get("body")) for c in (f.get("comment") or {}).get("comments", []))
                    text = "\n\n".join(p for p in (f.get("summary", ""), desc, comments) if p).strip()
                    if not text:
                        continue
                    project_key = (f.get("project") or {}).get("key", "")
                    yield RawItem(
                        external_id=issue["key"],
                        title=f"{issue['key']}: {f.get('summary', '')}",
                        text=text,
                        source_uri=f"{self.config['base_url'].rstrip('/')}/browse/{issue['key']}",
                        updated_at=_parse_dt(f.get("updated")),
                        allowed_roles=self._acl_roles(project_key),
                    )
                start_at += len(issues)
                if start_at >= data.get("total", 0) or not issues:
                    break


def _adf_to_text(node) -> str:
    """Flatten Atlassian Document Format (or plain string) into plain text."""
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, dict):
        if node.get("type") == "text":
            return node.get("text", "")
        return " ".join(_adf_to_text(c) for c in node.get("content", []) or [])
    return ""


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None

"""Confluence Cloud connector (REST API v2). Auth: email + API token (Basic).

ACL mirroring: Confluence space permissions are mapped to roles via `config.acl_map`, e.g.
    {"acl_map": {"space:ENG": ["employee", "manager", "admin"], "space:HR": ["manager", "admin"]}}
A page not covered by any rule falls back to the connector's default_classification/allowed_roles.
This is the simplification the plan calls out as "the hard part" - full source-ACL mirroring (per-page
restrictions, group membership resolution) is a native-API-specific follow-up, not just fetching.
"""
from __future__ import annotations

import base64
from datetime import datetime, timezone
from typing import Iterator

import httpx

from app.core.errors import AppError
from app.services.connectors.base import RawItem
from app.services.parsers import _strip_html

REQUIRED = ("base_url", "email", "api_token")


class ConfluenceConnector:
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
                raise AppError(f"config.{key} is required for confluence connectors", 422)
        try:
            with self._client() as client:
                resp = client.get("/wiki/api/v2/spaces", params={"limit": 1})
                resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise AppError(f"could not reach Confluence: {exc}", 422) from exc

    def _acl_roles(self, space_key: str) -> list[str] | None:
        acl_map: dict = self.config.get("acl_map") or {}
        return acl_map.get(f"space:{space_key}")

    def fetch(self) -> Iterator[RawItem]:
        spaces = self.config.get("spaces")  # optional allow-list of space keys
        with self._client() as client:
            cursor = None
            params = {"limit": 50, "body-format": "storage"}
            if spaces:
                params["space-id"] = ",".join(spaces) if not isinstance(spaces, str) else spaces
            while True:
                if cursor:
                    resp = client.get(cursor)
                else:
                    resp = client.get("/wiki/api/v2/pages", params=params)
                resp.raise_for_status()
                data = resp.json()
                for page in data.get("results", []):
                    body = ((page.get("body") or {}).get("storage") or {}).get("value", "")
                    text = _strip_html(body).strip()
                    if not text:
                        continue
                    space_key = str(page.get("spaceId", ""))
                    updated = page.get("version", {}).get("createdAt")
                    yield RawItem(
                        external_id=str(page["id"]),
                        title=page.get("title") or f"Confluence page {page['id']}",
                        text=text,
                        source_uri=f"{self.config['base_url'].rstrip('/')}/wiki{page.get('_links', {}).get('webui', '')}",
                        updated_at=_parse_dt(updated),
                        allowed_roles=self._acl_roles(space_key),
                    )
                next_link = (data.get("_links") or {}).get("next")
                if not next_link:
                    break
                cursor = next_link


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None

"""Notion connector. Auth: internal integration token (must be shared with the target pages).

ACL mirroring: Notion's API does not expose page-level permission lists to integrations, so ACLs here
are resolved via `config.acl_map` keyed by parent database id (`database:<id>` -> roles); everything
else falls back to the connector defaults.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterator

import httpx

from app.core.errors import AppError
from app.services.connectors.base import RawItem

NOTION_VERSION = "2022-06-28"


class NotionConnector:
    def __init__(self, config: dict) -> None:
        self.config = config

    def _client(self) -> httpx.Client:
        token = self.config["api_key"]
        return httpx.Client(
            base_url="https://api.notion.com/v1",
            headers={"Authorization": f"Bearer {token}", "Notion-Version": NOTION_VERSION, "Content-Type": "application/json"},
            timeout=30,
        )

    def validate(self) -> None:
        if not self.config.get("api_key"):
            raise AppError("config.api_key is required for notion connectors", 422)
        try:
            with self._client() as client:
                resp = client.get("/users/me")
                resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise AppError(f"could not reach Notion: {exc}", 422) from exc

    def _acl_roles(self, database_id: str | None) -> list[str] | None:
        if not database_id:
            return None
        acl_map: dict = self.config.get("acl_map") or {}
        return acl_map.get(f"database:{database_id}")

    def _page_text(self, client: httpx.Client, page_id: str) -> str:
        parts: list[str] = []
        cursor = None
        while True:
            params = {"page_size": 100, **({"start_cursor": cursor} if cursor else {})}
            resp = client.get(f"/blocks/{page_id}/children", params=params)
            if resp.status_code == 404:
                return ""
            resp.raise_for_status()
            data = resp.json()
            for block in data.get("results", []):
                btype = block.get("type")
                rich = ((block.get(btype) or {}).get("rich_text")) or []
                text = "".join(r.get("plain_text", "") for r in rich)
                if text:
                    parts.append(text)
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")
        return "\n".join(parts)

    def fetch(self) -> Iterator[RawItem]:
        with self._client() as client:
            cursor = None
            while True:
                body = {"filter": {"property": "object", "value": "page"}, "page_size": 50}
                if cursor:
                    body["start_cursor"] = cursor
                resp = client.post("/search", json=body)
                resp.raise_for_status()
                data = resp.json()
                for page in data.get("results", []):
                    title = _title_of(page)
                    text = self._page_text(client, page["id"])
                    if not text.strip():
                        continue
                    parent = page.get("parent", {})
                    db_id = parent.get("database_id") if parent.get("type") == "database_id" else None
                    yield RawItem(
                        external_id=page["id"],
                        title=title or f"Notion page {page['id']}",
                        text=text,
                        source_uri=page.get("url"),
                        updated_at=_parse_dt(page.get("last_edited_time")),
                        allowed_roles=self._acl_roles(db_id),
                    )
                if not data.get("has_more"):
                    break
                cursor = data.get("next_cursor")


def _title_of(page: dict) -> str:
    props = page.get("properties", {})
    for prop in props.values():
        if prop.get("type") == "title":
            return "".join(t.get("plain_text", "") for t in prop.get("title", []))
    return ""


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None

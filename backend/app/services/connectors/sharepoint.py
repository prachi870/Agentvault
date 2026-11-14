"""SharePoint connector via Microsoft Graph (app-only OAuth2 client-credentials grant).

Required config: tenant_id, client_id, client_secret, site_id (or site_hostname + site_path).
ACL mirroring: Graph's `driveItem` permissions endpoint is queried per-item and mapped to roles via
`config.acl_map` keyed by Azure AD group id (`group:<id>` -> roles). Items with no resolvable group
grant fall back to the connector defaults - this is intentionally conservative (least surprise), not a
complete replica of SharePoint's permission model.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Iterator

import httpx

from app.core.errors import AppError
from app.services.connectors.base import RawItem
from app.services.parsers import SUPPORTED_EXTENSIONS

GRAPH = "https://graph.microsoft.com/v1.0"
REQUIRED = ("tenant_id", "client_id", "client_secret", "site_id")


class SharePointConnector:
    def __init__(self, config: dict) -> None:
        self.config = config
        self._token: str | None = None
        self._token_exp = 0.0

    def _get_token(self) -> str:
        if self._token and time.time() < self._token_exp - 60:
            return self._token
        c = self.config
        url = f"https://login.microsoftonline.com/{c['tenant_id']}/oauth2/v2.0/token"
        data = {
            "client_id": c["client_id"],
            "client_secret": c["client_secret"],
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        }
        resp = httpx.post(url, data=data, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        self._token = payload["access_token"]
        self._token_exp = time.time() + payload.get("expires_in", 3600)
        return self._token

    def _client(self) -> httpx.Client:
        return httpx.Client(base_url=GRAPH, headers={"Authorization": f"Bearer {self._get_token()}"}, timeout=30)

    def validate(self) -> None:
        for key in REQUIRED:
            if not self.config.get(key):
                raise AppError(f"config.{key} is required for sharepoint connectors", 422)
        try:
            with self._client() as client:
                resp = client.get(f"/sites/{self.config['site_id']}")
                resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise AppError(f"could not reach SharePoint via Graph: {exc}", 422) from exc

    def _acl_roles(self, client: httpx.Client, item_id: str) -> list[str] | None:
        acl_map: dict = self.config.get("acl_map") or {}
        if not acl_map:
            return None
        try:
            resp = client.get(f"/sites/{self.config['site_id']}/drive/items/{item_id}/permissions")
            resp.raise_for_status()
        except httpx.HTTPError:
            return None
        roles: set[str] = set()
        for perm in resp.json().get("value", []):
            grantees = (perm.get("grantedToV2") or {}).get("group") or (perm.get("grantedToIdentitiesV2") or [{}])
            group_id = None
            g = perm.get("grantedToV2", {}).get("group")
            if g:
                group_id = g.get("id")
            if group_id and (mapped := acl_map.get(f"group:{group_id}")):
                roles.update(mapped)
        return sorted(roles) or None

    def fetch(self) -> Iterator[RawItem]:
        folder = self.config.get("folder_path", "").strip("/")
        with self._client() as client:
            path = f"/sites/{self.config['site_id']}/drive/root:/{folder}:/children" if folder else f"/sites/{self.config['site_id']}/drive/root/children"
            next_url: str | None = path
            while next_url:
                resp = client.get(next_url)
                resp.raise_for_status()
                data = resp.json()
                for item in data.get("value", []):
                    if "folder" in item:
                        continue
                    name = item.get("name", "")
                    if not any(name.lower().endswith(ext) for ext in SUPPORTED_EXTENSIONS):
                        continue
                    download_url = item.get("@microsoft.graph.downloadUrl")
                    if not download_url:
                        continue
                    file_resp = httpx.get(download_url, timeout=60)
                    file_resp.raise_for_status()
                    yield RawItem(
                        external_id=item["id"],
                        title=item.get("name", "").rsplit(".", 1)[0],
                        filename=name,
                        data=file_resp.content,
                        source_uri=item.get("webUrl"),
                        updated_at=_parse_dt((item.get("lastModifiedDateTime"))),
                        allowed_roles=self._acl_roles(client, item["id"]),
                    )
                next_url = data.get("@odata.nextLink")


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None

"""Google Drive connector via a service account (domain-wide delegation optional).

Required config: service_account_json (dict, the downloaded key file) and optionally
`shared_drive_id` / `folder_id` to scope the crawl, plus `impersonate_user` for domain-wide delegation.
ACL mirroring: Drive's `permissions.list` per-file is mapped to roles via `config.acl_map` keyed by the
grantee's Google Group email (`group:<email>` -> roles); ungrouped/direct-share files fall back to the
connector defaults.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterator

from app.core.errors import AppError
from app.services.connectors.base import RawItem
from app.services.parsers import SUPPORTED_EXTENSIONS

GOOGLE_MIME_EXPORT = {
    "application/vnd.google-apps.document": ("text/plain", ".txt"),
    "application/vnd.google-apps.spreadsheet": ("text/csv", ".csv"),
    "application/vnd.google-apps.presentation": ("text/plain", ".txt"),
}
FOLDER_MIME = "application/vnd.google-apps.folder"


class GoogleDriveConnector:
    def __init__(self, config: dict) -> None:
        self.config = config
        self._service = None

    def _client(self):
        if self._service is not None:
            return self._service
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
        except ImportError as exc:  # optional dependency (requirements-connectors.txt)
            raise AppError("google-api-python-client / google-auth are not installed", 500) from exc
        scopes = ["https://www.googleapis.com/auth/drive.readonly"]
        creds = service_account.Credentials.from_service_account_info(self.config["service_account_json"], scopes=scopes)
        if self.config.get("impersonate_user"):
            creds = creds.with_subject(self.config["impersonate_user"])
        self._service = build("drive", "v3", credentials=creds, cache_discovery=False)
        return self._service

    def validate(self) -> None:
        if not self.config.get("service_account_json"):
            raise AppError("config.service_account_json is required for drive connectors", 422)
        try:
            self._client().about().get(fields="user").execute()
        except Exception as exc:
            raise AppError(f"could not reach Google Drive: {exc}", 422) from exc

    def _acl_roles(self, file_id: str) -> list[str] | None:
        acl_map: dict = self.config.get("acl_map") or {}
        if not acl_map:
            return None
        try:
            perms = self._client().permissions().list(
                fileId=file_id, fields="permissions(type,emailAddress)", supportsAllDrives=True
            ).execute()
        except Exception:
            return None
        roles: set[str] = set()
        for p in perms.get("permissions", []):
            if p.get("type") == "group" and (mapped := acl_map.get(f"group:{p.get('emailAddress')}")):
                roles.update(mapped)
        return sorted(roles) or None

    def fetch(self) -> Iterator[RawItem]:
        svc = self._client()
        q_parts = ["trashed = false"]
        if self.config.get("folder_id"):
            q_parts.append(f"'{self.config['folder_id']}' in parents")
        extra = {"driveId": self.config["shared_drive_id"], "corpora": "drive", "includeItemsFromAllDrives": True,
                "supportsAllDrives": True} if self.config.get("shared_drive_id") else {}
        page_token = None
        while True:
            resp = svc.files().list(
                q=" and ".join(q_parts),
                fields="nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime)",
                pageSize=100, pageToken=page_token, **extra,
            ).execute()
            for f in resp.get("files", []):
                if f["mimeType"] == FOLDER_MIME:
                    continue
                item = self._to_item(svc, f)
                if item:
                    yield item
            page_token = resp.get("nextPageToken")
            if not page_token:
                break

    def _to_item(self, svc, f: dict) -> RawItem | None:
        name = f["name"]
        mime = f["mimeType"]
        if mime in GOOGLE_MIME_EXPORT:
            export_mime, ext = GOOGLE_MIME_EXPORT[mime]
            data = svc.files().export(fileId=f["id"], mimeType=export_mime).execute()
            filename = f"{name}{ext}"
        else:
            if not any(name.lower().endswith(ext) for ext in SUPPORTED_EXTENSIONS):
                return None
            data = svc.files().get_media(fileId=f["id"]).execute()
            filename = name
        return RawItem(
            external_id=f["id"],
            title=name,
            filename=filename,
            data=data if isinstance(data, bytes) else bytes(data),
            source_uri=f.get("webViewLink"),
            updated_at=_parse_dt(f.get("modifiedTime")),
            allowed_roles=self._acl_roles(f["id"]),
        )


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None

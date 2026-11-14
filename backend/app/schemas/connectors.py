from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ConnectorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=128)
    kind: Literal["directory", "sql", "confluence", "jira", "notion", "sharepoint", "drive", "email"]
    source_type: Literal["upload", "pdf", "sharepoint", "confluence", "jira", "notion", "sql", "email", "drive"] = "drive"
    config: dict = Field(default_factory=dict)
    default_classification: Literal["public", "internal", "confidential", "restricted"] = "internal"
    default_allowed_roles: list[str] = Field(default_factory=list)
    # Scheduled sync (Phase 3/4): minutes between automatic syncs. 0/None = manual only.
    sync_interval_minutes: int | None = Field(default=None, ge=5)


class ConnectorOut(BaseModel):
    id: str
    name: str
    kind: str
    source_type: str
    config: dict
    default_classification: str
    status: str
    last_error: str | None
    last_sync_at: datetime | None
    doc_count: int
    sync_interval_minutes: int | None

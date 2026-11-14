from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class KnowledgeGapFollowUpOut(BaseModel):
    assigned_to: str | None
    next_step: str | None
    status: Literal["open", "in_progress", "resolved"]
    verification_receipt_id: str | None
    updated_at: datetime


class KnowledgeGapFollowUpUpdate(BaseModel):
    assigned_to: str | None = Field(default=None, max_length=255)
    next_step: str | None = Field(default=None, max_length=4000)
    status: Literal["open", "in_progress", "resolved"] | None = None


class KnowledgeGapOut(BaseModel):
    id: str
    sample_query: str
    reason: str
    occurrences: int
    status: str
    first_seen: datetime
    last_seen: datetime
    last_receipt_id: str | None
    follow_up: KnowledgeGapFollowUpOut | None = None


class EvidenceChangeOut(BaseModel):
    document_id: str
    title: str
    source_type: str
    previous_version: int
    version: int
    changed_at: datetime
    source_updated_at: datetime
    impacted_answers: int


class HealthDashboard(BaseModel):
    window_days: int
    queries: dict
    quality: dict
    latency_ms: dict
    security: dict
    knowledge: dict
    components: dict

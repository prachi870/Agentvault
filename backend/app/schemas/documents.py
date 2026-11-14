from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    source_type: str
    source_uri: str | None
    classification: str
    allowed_roles: list[str]
    chunk_count: int
    flagged_chunks: int
    status: str
    source_updated_at: datetime
    indexed_at: datetime


class SamplePackOut(BaseModel):
    documents: list[DocumentOut]
    added: int
    total: int


class KnowledgeUpdateOut(BaseModel):
    document_id: str
    title: str
    source_type: str
    classification: str
    version: int
    change_type: Literal["added", "updated"]
    changed_at: datetime
    summary: str
    impacted_answers: int


class DocumentAccessUpdate(BaseModel):
    """Phase 4: patch a document's classification/roles without touching its content."""
    classification: str | None = None
    allowed_roles: list[str] | None = Field(default=None, description="'*' = everyone with sufficient clearance")

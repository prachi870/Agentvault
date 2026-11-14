from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    answer_mode: Literal["quick", "detailed", "decision_brief"] = "detailed"
    context_titles: list[Annotated[str, Field(min_length=1, max_length=512)]] = Field(default_factory=list, max_length=3)
    excluded_chunk_ids: list[Annotated[str, Field(min_length=1, max_length=128)]] = Field(default_factory=list, max_length=16)
    conversation_id: Annotated[str, Field(min_length=32, max_length=32)] | None = None


class CitationOut(BaseModel):
    index: int
    doc_id: str
    chunk_id: str
    title: str
    source_type: str
    snippet: str
    updated_at: datetime
    score: float
    stale: bool


class QueryResponse(BaseModel):
    receipt_id: str
    status: Literal["answered", "abstained", "blocked"]
    answer_mode: Literal["quick", "detailed", "decision_brief"] = "detailed"
    answer: str
    confidence: float
    confidence_label: Literal["high", "medium", "low"]
    grounding: float
    abstain_reason: str | None = None
    citations: list[CitationOut] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    plan: dict = Field(default_factory=dict)
    latency_ms: int


class ReceiptSummary(BaseModel):
    id: str
    query: str
    status: str
    confidence: float
    grounding: float
    latency_ms: int
    created_at: datetime


class ReceiptDetail(ReceiptSummary):
    payload: dict
    signature: str


class ReceiptVerification(BaseModel):
    receipt_id: str
    valid: bool


class ConversationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class ConversationUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    turn_count: int


class ConversationTurn(BaseModel):
    question: str
    response: QueryResponse
    created_at: datetime


class ConversationDetail(ConversationSummary):
    turns: list[ConversationTurn] = Field(default_factory=list)

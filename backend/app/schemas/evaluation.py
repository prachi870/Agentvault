from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


class EvaluationCaseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    question: str = Field(min_length=3, max_length=2000)
    expected_document_ids: list[Annotated[str, Field(min_length=32, max_length=32)]] = Field(min_length=1, max_length=10)
    required_phrases: list[Annotated[str, Field(min_length=1, max_length=160)]] = Field(default_factory=list, max_length=10)

    @field_validator("title", "question")
    @classmethod
    def require_nonblank_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank.")
        return normalized

    @field_validator("required_phrases")
    @classmethod
    def normalize_phrases(cls, values: list[str]) -> list[str]:
        normalized = [value.strip() for value in values]
        if any(not value for value in normalized):
            raise ValueError("Required phrases cannot be blank.")
        return normalized


class EvaluationCaseUpdate(EvaluationCaseCreate):
    pass


class EvaluationRunRequest(BaseModel):
    case_ids: list[Annotated[str, Field(min_length=32, max_length=32)]] | None = Field(default=None, min_length=1, max_length=50)


class EvaluationSourceOut(BaseModel):
    id: str
    title: str


class EvaluationCaseOut(BaseModel):
    id: str
    title: str
    question: str
    expected_sources: list[EvaluationSourceOut]
    required_phrases: list[str]
    last_result: dict | None
    last_run_at: datetime | None
    created_at: datetime


class EvaluationSourceCheck(BaseModel):
    id: str
    title: str
    matched: bool


class EvaluationPhraseCheck(BaseModel):
    phrase: str
    matched: bool


class EvaluationRunResult(BaseModel):
    case_id: str
    title: str
    passed: bool
    status: str
    answer: str
    sources: list[EvaluationSourceCheck]
    phrases: list[EvaluationPhraseCheck]
    confidence: float
    grounding: float
    latency_ms: int


class EvaluationRunOut(BaseModel):
    total: int
    passed: int
    failed: int
    results: list[EvaluationRunResult]

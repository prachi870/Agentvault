from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


FeedbackReason = Literal["incorrect", "missing_detail", "wrong_source", "outdated", "other"]


class AnswerFeedbackCreate(BaseModel):
    receipt_id: str = Field(pattern=r"^[a-fA-F0-9]{32}$")
    helpful: bool
    reason: FeedbackReason | None = None
    comment: str | None = Field(default=None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        normalized = value.strip() if value else None
        return normalized or None

    @model_validator(mode="after")
    def validate_rating_details(self):
        if self.helpful and self.reason:
            raise ValueError("A reason is only valid for an unhelpful answer.")
        if not self.helpful and not self.reason:
            raise ValueError("Choose a reason for unhelpful feedback.")
        return self


class FeedbackStatusUpdate(BaseModel):
    status: Literal["open", "reviewed"]


class AnswerFeedbackOut(BaseModel):
    id: str
    receipt_id: str
    helpful: bool
    reason: FeedbackReason | None
    comment: str | None
    status: Literal["open", "reviewed"]
    created_at: datetime
    updated_at: datetime


class FeedbackReviewOut(AnswerFeedbackOut):
    query: str
    answer: str
    citation_titles: list[str]
    confidence: float
    grounding: float

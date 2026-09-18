from typing import Optional, TypedDict

from app.connectors.base import RetrievedChunk
from app.core.security import Principal


class AgentState(TypedDict, total=False):
    query: str
    principal: Principal

    planned_sources: list[str]
    sub_questions: list[str]

    retrieved_chunks: list[RetrievedChunk]
    denied_sources: list[str]

    context: str
    used_chunks: list[RetrievedChunk]

    draft_answer: str
    verified_answer: str
    confidence: float
    unsupported_claims: list[str]

    receipt_id: Optional[str]

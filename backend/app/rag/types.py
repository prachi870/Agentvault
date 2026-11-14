from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Plan:
    sub_queries: list[str]
    source_hints: list[str] = field(default_factory=list)
    rationale: str = ""
    planner: str = "heuristic"


@dataclass
class Evidence:
    """A retrieved chunk after grading."""

    chunk_id: str
    doc_id: str
    title: str
    source_type: str
    text: str
    updated_at: datetime
    cosine: float
    lexical: float = 0.0
    relevance: float = 0.0
    freshness: float = 1.0
    score: float = 0.0
    stale: bool = False
    injection_score: float = 0.0
    matched_query: str = ""


@dataclass
class ContextBlock:
    n: int
    chunk_id: str
    doc_id: str
    title: str
    source_type: str
    text: str
    updated_at: datetime
    score: float
    relevance: float
    freshness: float
    stale: bool
    lexical: float = 0.0

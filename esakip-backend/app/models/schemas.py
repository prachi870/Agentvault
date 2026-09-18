from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    sources: list[str] | None = Field(
        default=None,
        description="Optional explicit source list. If omitted, the planner decides.",
    )


class Citation(BaseModel):
    source: str
    title: str
    url: str | None = None
    source_id: str


class QueryResponse(BaseModel):
    answer: str
    confidence: float
    citations: list[Citation]
    receipt_id: str
    denied_sources: list[str] = []
    unsupported_claims: list[str] = []


class GapReport(BaseModel):
    total_queries: int
    low_confidence_queries: list[str]
    zero_evidence_queries: list[str]
    frequently_denied_sources: list[tuple[str, int]]


# --- Proposed Postgres tables (for when Alembic migrations are added) ---
#
# users(id, email, display_name, created_at)
# roles(id, name)
# user_roles(user_id, role_id)
# role_source_permissions(role_id, source_name)
# documents(id, source, source_id, title, url, last_modified, indexed_at)
# context_receipts(id, user_id, query, timestamp, confidence, payload_json)
# connector_health_log(id, source, checked_at, healthy, latency_ms, error)

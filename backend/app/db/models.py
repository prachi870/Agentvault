from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, utcnow


def new_id() -> str:
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), default="")
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="employee")  # viewer|employee|manager|admin
    department: Mapped[str] = mapped_column(String(64), default="")
    clearance: Mapped[int] = mapped_column(Integer, default=1)  # 0 public .. 3 restricted
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)  # Phase 4: multi-tenant isolation
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    kind: Mapped[str] = mapped_column(String(32))  # implementation: directory|sql
    source_type: Mapped[str] = mapped_column(String(32))  # what documents are tagged as: drive|sharepoint|sql|...
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    default_classification: Mapped[str] = mapped_column(String(32), default="internal")
    default_allowed_roles: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(32), default="idle")  # idle|syncing|ok|error
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    doc_count: Mapped[int] = mapped_column(Integer, default=0)
    sync_interval_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None/0 = manual sync only
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)  # Phase 4: multi-tenant isolation
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (Index("ix_documents_connector_external", "connector_id", "external_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(512))
    source_type: Mapped[str] = mapped_column(String(32), index=True)
    source_uri: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    connector_id: Mapped[str | None] = mapped_column(ForeignKey("connectors.id", ondelete="SET NULL"), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    classification: Mapped[str] = mapped_column(String(32), default="internal")
    allowed_roles: Mapped[list] = mapped_column(JSON, default=list)
    storage_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    content_sha256: Mapped[str] = mapped_column(String(64))
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    flagged_chunks: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="indexed")
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)  # Phase 4: multi-tenant isolation
    source_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    indexed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DocumentRevision(Base):
    __tablename__ = "document_revisions"
    __table_args__ = (
        Index("ix_document_revisions_document_version", "document_id", "version", unique=True),
        Index("ix_document_revisions_indexed_at", "indexed_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(String(32), index=True)
    version: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(512))
    source_type: Mapped[str] = mapped_column(String(32))
    content_sha256: Mapped[str] = mapped_column(String(64))
    source_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    indexed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class Receipt(Base):
    """Context receipt: a signed, replayable record of how an answer was produced."""

    __tablename__ = "receipts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    query: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), index=True)  # answered|abstained|blocked
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    grounding: Mapped[float] = mapped_column(Float, default=0.0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    injection_events: Mapped[int] = mapped_column(Integer, default=0)
    used_stale_source: Mapped[bool] = mapped_column(Boolean, default=False)
    payload: Mapped[dict] = mapped_column(JSON)
    signature: Mapped[str] = mapped_column(String(64))
    conversation_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)  # Phase 4: multi-tenant isolation
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class ReceiptEvidence(Base):
    __tablename__ = "receipt_evidence"
    __table_args__ = (Index("ix_receipt_evidence_document_created", "document_id", "created_at"),)

    receipt_id: Mapped[str] = mapped_column(ForeignKey("receipts.id", ondelete="CASCADE"), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class AnswerFeedback(Base):
    __tablename__ = "answer_feedback"
    __table_args__ = (
        UniqueConstraint("receipt_id", "user_id", name="uq_answer_feedback_receipt_user"),
        Index("ix_answer_feedback_tenant_status_created", "tenant_id", "status", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    receipt_id: Mapped[str] = mapped_column(ForeignKey("receipts.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    helpful: Mapped[bool] = mapped_column(Boolean)
    reason: Mapped[str | None] = mapped_column(String(32), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class AuditLog(Base):
    """Phase 4: append-only record of mutating actions, for compliance/traceability."""

    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    method: Mapped[str] = mapped_column(String(8))
    path: Mapped[str] = mapped_column(String(512))
    status_code: Mapped[int] = mapped_column(Integer)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)  # Phase 4: multi-tenant isolation
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class KnowledgeGap(Base):
    __tablename__ = "knowledge_gaps"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    query_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    sample_query: Mapped[str] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(String(32))  # no_evidence|low_confidence|ungrounded
    occurrences: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(16), default="open")  # open|resolved
    last_receipt_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)  # Phase 4: multi-tenant isolation
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class KnowledgeGapFollowUp(Base):
    __tablename__ = "knowledge_gap_follow_ups"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    gap_id: Mapped[str] = mapped_column(ForeignKey("knowledge_gaps.id", ondelete="CASCADE"), unique=True, index=True)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="open")  # open|in_progress|resolved
    verification_receipt_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class EvaluationCase(Base):
    __tablename__ = "evaluation_cases"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(120))
    question: Mapped[str] = mapped_column(Text)
    expected_document_ids: Mapped[list] = mapped_column(JSON, default=list)
    required_phrases: Mapped[list] = mapped_column(JSON, default=list)
    last_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

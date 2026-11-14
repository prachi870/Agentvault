"""Add source revisions, cited-document links, and gap follow-ups.

Revision ID: d14f8a6c2b90
Revises: a2f8e3b47c91
Create Date: 2026-11-14 08:45:00.000000+00:00
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d14f8a6c2b90"
down_revision: Union[str, None] = "a2f8e3b47c91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_revisions",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("document_id", sa.String(length=32), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("content_sha256", sa.String(length=64), nullable=False),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("tenant_id", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_document_revisions_document_id", "document_revisions", ["document_id"])
    op.create_index("ix_document_revisions_tenant_id", "document_revisions", ["tenant_id"])
    op.create_index("ix_document_revisions_indexed_at", "document_revisions", ["indexed_at"])
    op.create_index(
        "ix_document_revisions_document_version",
        "document_revisions",
        ["document_id", "version"],
        unique=True,
    )

    op.create_table(
        "receipt_evidence",
        sa.Column("receipt_id", sa.String(length=32), nullable=False),
        sa.Column("document_id", sa.String(length=32), nullable=False),
        sa.Column("tenant_id", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["receipt_id"], ["receipts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("receipt_id", "document_id"),
    )
    op.create_index("ix_receipt_evidence_tenant_id", "receipt_evidence", ["tenant_id"])
    op.create_index("ix_receipt_evidence_created_at", "receipt_evidence", ["created_at"])
    op.create_index(
        "ix_receipt_evidence_document_created",
        "receipt_evidence",
        ["document_id", "created_at"],
    )

    op.create_table(
        "knowledge_gap_follow_ups",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("gap_id", sa.String(length=32), nullable=False),
        sa.Column("assigned_to", sa.String(length=255), nullable=True),
        sa.Column("next_step", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("verification_receipt_id", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["gap_id"], ["knowledge_gaps.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_knowledge_gap_follow_ups_gap_id",
        "knowledge_gap_follow_ups",
        ["gap_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_knowledge_gap_follow_ups_gap_id", table_name="knowledge_gap_follow_ups")
    op.drop_table("knowledge_gap_follow_ups")
    op.drop_index("ix_receipt_evidence_document_created", table_name="receipt_evidence")
    op.drop_index("ix_receipt_evidence_created_at", table_name="receipt_evidence")
    op.drop_index("ix_receipt_evidence_tenant_id", table_name="receipt_evidence")
    op.drop_table("receipt_evidence")
    op.drop_index("ix_document_revisions_document_version", table_name="document_revisions")
    op.drop_index("ix_document_revisions_indexed_at", table_name="document_revisions")
    op.drop_index("ix_document_revisions_tenant_id", table_name="document_revisions")
    op.drop_index("ix_document_revisions_document_id", table_name="document_revisions")
    op.drop_table("document_revisions")

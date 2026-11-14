"""Add admin RAG evaluation cases.

Revision ID: e4b7c9a13f62
Revises: c7a6e2b14f90
Create Date: 2026-11-18 00:00:00.000000+00:00
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4b7c9a13f62"
down_revision: Union[str, None] = "c7a6e2b14f90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "evaluation_cases",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=False),
        sa.Column("tenant_id", sa.String(length=32), nullable=True),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("expected_document_ids", sa.JSON(), nullable=False),
        sa.Column("required_phrases", sa.JSON(), nullable=False),
        sa.Column("last_result", sa.JSON(), nullable=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evaluation_cases_owner_id", "evaluation_cases", ["owner_id"])
    op.create_index("ix_evaluation_cases_tenant_id", "evaluation_cases", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_evaluation_cases_tenant_id", table_name="evaluation_cases")
    op.drop_index("ix_evaluation_cases_owner_id", table_name="evaluation_cases")
    op.drop_table("evaluation_cases")

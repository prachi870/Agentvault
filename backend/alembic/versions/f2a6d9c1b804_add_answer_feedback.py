"""Add user feedback for answer receipts.

Revision ID: f2a6d9c1b804
Revises: e4b7c9a13f62
Create Date: 2026-11-14 17:52:00.000000+05:30
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2a6d9c1b804"
down_revision: Union[str, None] = "e4b7c9a13f62"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "answer_feedback",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("receipt_id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("tenant_id", sa.String(length=32), nullable=True),
        sa.Column("helpful", sa.Boolean(), nullable=False),
        sa.Column("reason", sa.String(length=32), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["receipt_id"], ["receipts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("receipt_id", "user_id", name="uq_answer_feedback_receipt_user"),
    )
    op.create_index("ix_answer_feedback_receipt_id", "answer_feedback", ["receipt_id"])
    op.create_index("ix_answer_feedback_user_id", "answer_feedback", ["user_id"])
    op.create_index("ix_answer_feedback_tenant_id", "answer_feedback", ["tenant_id"])
    op.create_index("ix_answer_feedback_status", "answer_feedback", ["status"])
    op.create_index(
        "ix_answer_feedback_tenant_status_created",
        "answer_feedback",
        ["tenant_id", "status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_answer_feedback_tenant_status_created", table_name="answer_feedback")
    op.drop_index("ix_answer_feedback_status", table_name="answer_feedback")
    op.drop_index("ix_answer_feedback_tenant_id", table_name="answer_feedback")
    op.drop_index("ix_answer_feedback_user_id", table_name="answer_feedback")
    op.drop_index("ix_answer_feedback_receipt_id", table_name="answer_feedback")
    op.drop_table("answer_feedback")

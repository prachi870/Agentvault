"""Add per-user saved conversations.

Revision ID: c7a6e2b14f90
Revises: d14f8a6c2b90
Create Date: 2026-11-14 10:45:00.000000+00:00
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7a6e2b14f90"
down_revision: Union[str, None] = "d14f8a6c2b90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("tenant_id", sa.String(length=32), nullable=True),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])
    op.create_index("ix_conversations_tenant_id", "conversations", ["tenant_id"])
    op.create_index("ix_conversations_updated_at", "conversations", ["updated_at"])
    op.add_column("receipts", sa.Column("conversation_id", sa.String(length=32), nullable=True))
    op.create_index("ix_receipts_conversation_id", "receipts", ["conversation_id"])


def downgrade() -> None:
    op.drop_index("ix_receipts_conversation_id", table_name="receipts")
    op.drop_column("receipts", "conversation_id")
    op.drop_index("ix_conversations_updated_at", table_name="conversations")
    op.drop_index("ix_conversations_tenant_id", table_name="conversations")
    op.drop_index("ix_conversations_user_id", table_name="conversations")
    op.drop_table("conversations")

"""add tenant_id to all models

Revision ID: a2f8e3b47c91
Revises: 65ec55907345
Create Date: 2026-09-24 11:40:00.000000+00:00

Phase 4: Multi-tenant isolation — adds nullable tenant_id column (indexed) to
users, connectors, documents, receipts, audit_log, and knowledge_gaps tables.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'a2f8e3b47c91'
down_revision = '65ec55907345'
branch_labels = None
depends_on = None

_TABLES = ['users', 'connectors', 'documents', 'receipts', 'audit_log', 'knowledge_gaps']


def upgrade() -> None:
    for table in _TABLES:
        op.add_column(table, sa.Column('tenant_id', sa.String(32), nullable=True))
        op.create_index(f'ix_{table}_tenant_id', table, ['tenant_id'])


def downgrade() -> None:
    for table in _TABLES:
        op.drop_index(f'ix_{table}_tenant_id', table_name=table)
        op.drop_column(table, 'tenant_id')

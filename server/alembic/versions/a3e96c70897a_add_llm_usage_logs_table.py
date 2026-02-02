"""Add llm_usage_logs table

Revision ID: a3e96c70897a
Revises: add_rag_feedback
Create Date: 2026-02-02 01:32:37.734296

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from app.models.models import GUID

# revision identifiers, used by Alembic.
revision = 'a3e96c70897a'
down_revision = 'add_rag_feedback'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('llm_usage_logs',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('feature', sa.String(length=50), nullable=False),
        sa.Column('workshop_id', GUID(), nullable=True),
        sa.Column('user_id', GUID(), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('total_tokens', sa.Integer(), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('request_type', sa.String(length=50), nullable=True),
        sa.Column('estimated_cost_cents', sa.Integer(), nullable=True),
        sa.Column('success', sa.String(length=10), nullable=True),
        sa.Column('error_message', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_llm_usage_logs_created_at'), 'llm_usage_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_llm_usage_logs_feature'), 'llm_usage_logs', ['feature'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_llm_usage_logs_feature'), table_name='llm_usage_logs')
    op.drop_index(op.f('ix_llm_usage_logs_created_at'), table_name='llm_usage_logs')
    op.drop_table('llm_usage_logs')

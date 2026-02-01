"""Add RAG feedback and knowledge base tables

Revision ID: add_rag_feedback
Revises: 
Create Date: 2026-02-01 13:52:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_rag_feedback'
down_revision = None  # Update this to the latest migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ai_feedback table
    op.create_table(
        'ai_feedback',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workshop_id', sa.String(), nullable=True),
        sa.Column('use_case_id', sa.String(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('request_data', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('response_data', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('is_helpful', sa.Boolean(), nullable=True),
        sa.Column('feedback_text', sa.Text(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('model_used', sa.String(), nullable=True),
        sa.Column('is_mock', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], ),
        sa.ForeignKeyConstraint(['use_case_id'], ['use_cases.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_feedback_endpoint'), 'ai_feedback', ['endpoint'], unique=False)
    op.create_index(op.f('ix_ai_feedback_created_at'), 'ai_feedback', ['created_at'], unique=False)
    
    # Create rag_documents table
    op.create_table(
        'rag_documents',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('doc_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('embedding_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('version', sa.Integer(), nullable=True, default=1),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('retrieval_count', sa.Integer(), nullable=True, default=0),
        sa.Column('last_retrieved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rag_documents_category'), 'rag_documents', ['category'], unique=False)
    op.create_index(op.f('ix_rag_documents_is_active'), 'rag_documents', ['is_active'], unique=False)
    
    # Create rag_metrics table
    op.create_table(
        'rag_metrics',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('metric_type', sa.String(), nullable=False),
        sa.Column('metric_value', sa.Float(), nullable=False),
        sa.Column('endpoint', sa.String(), nullable=True),
        sa.Column('model_used', sa.String(), nullable=True),
        sa.Column('period', sa.String(), nullable=False),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('sample_count', sa.Integer(), nullable=True, default=0),
        sa.Column('details', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rag_metrics_metric_type'), 'rag_metrics', ['metric_type'], unique=False)
    op.create_index(op.f('ix_rag_metrics_period'), 'rag_metrics', ['period'], unique=False)
    
    # Create prompt_templates table
    op.create_table(
        'prompt_templates',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('template_text', sa.Text(), nullable=False),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True, default=1),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('variant', sa.String(), nullable=True),
        sa.Column('success_rate', sa.Float(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_prompt_templates_endpoint'), 'prompt_templates', ['endpoint'], unique=False)
    op.create_index(op.f('ix_prompt_templates_is_active'), 'prompt_templates', ['is_active'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_prompt_templates_is_active'), table_name='prompt_templates')
    op.drop_index(op.f('ix_prompt_templates_endpoint'), table_name='prompt_templates')
    op.drop_table('prompt_templates')
    
    op.drop_index(op.f('ix_rag_metrics_period'), table_name='rag_metrics')
    op.drop_index(op.f('ix_rag_metrics_metric_type'), table_name='rag_metrics')
    op.drop_table('rag_metrics')
    
    op.drop_index(op.f('ix_rag_documents_is_active'), table_name='rag_documents')
    op.drop_index(op.f('ix_rag_documents_category'), table_name='rag_documents')
    op.drop_table('rag_documents')
    
    op.drop_index(op.f('ix_ai_feedback_created_at'), table_name='ai_feedback')
    op.drop_index(op.f('ix_ai_feedback_endpoint'), table_name='ai_feedback')
    op.drop_table('ai_feedback')

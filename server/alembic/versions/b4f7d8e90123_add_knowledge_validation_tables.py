"""add knowledge validation tables

Revision ID: b4f7d8e90123
Revises: a3e96c70897a
Create Date: 2026-02-02 18:07:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b4f7d8e90123'
down_revision = 'a3e96c70897a'
branch_labels = None
depends_on = None


def upgrade():
    # Create knowledge_articles table
    op.create_table(
        'knowledge_articles',
        sa.Column('id', sa.CHAR(36), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('source_url', sa.String(1000), nullable=True),
        sa.Column('source_filename', sa.String(255), nullable=True),
        sa.Column('validation_status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('validation_score', sa.Float(), nullable=True),
        sa.Column('validation_sources', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('validation_notes', sa.Text(), nullable=True),
        sa.Column('embedding_id', sa.String(255), nullable=True),
        sa.Column('embedding_model', sa.String(100), nullable=True),
        sa.Column('imported_by', sa.CHAR(36), nullable=False),
        sa.Column('imported_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('validated_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['imported_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_knowledge_validation_status', 'knowledge_articles', ['validation_status'])
    op.create_index('idx_knowledge_imported_by', 'knowledge_articles', ['imported_by'])
    op.create_index('idx_knowledge_source_type', 'knowledge_articles', ['source_type'])
    op.create_index('idx_knowledge_active', 'knowledge_articles', ['is_active'])

    # Create usecase_knowledge_links table
    op.create_table(
        'usecase_knowledge_links',
        sa.Column('id', sa.CHAR(36), nullable=False),
        sa.Column('usecase_id', sa.CHAR(36), nullable=False),
        sa.Column('article_id', sa.CHAR(36), nullable=False),
        sa.Column('relevance_score', sa.Float(), nullable=False),
        sa.Column('impact_type', sa.String(20), nullable=False),
        sa.Column('suggested_changes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(20), nullable=True, server_default='pending'),
        sa.Column('applied_at', sa.DateTime(), nullable=True),
        sa.Column('applied_by', sa.CHAR(36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['usecase_id'], ['kb_use_cases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['article_id'], ['knowledge_articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['applied_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_link_usecase', 'usecase_knowledge_links', ['usecase_id'])
    op.create_index('idx_link_article', 'usecase_knowledge_links', ['article_id'])
    op.create_index('idx_link_status', 'usecase_knowledge_links', ['status'])
    op.create_index('idx_link_impact_type', 'usecase_knowledge_links', ['impact_type'])

    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.CHAR(36), nullable=False),
        sa.Column('user_id', sa.CHAR(36), nullable=False),
        sa.Column('notification_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('priority', sa.String(20), nullable=True, server_default='normal'),
        sa.Column('action_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('acted_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_notification_user', 'notifications', ['user_id'])
    op.create_index('idx_notification_status', 'notifications', ['status'])
    op.create_index('idx_notification_type', 'notifications', ['notification_type'])
    op.create_index('idx_notification_created', 'notifications', ['created_at'])
    op.create_index('idx_notification_user_status', 'notifications', ['user_id', 'status'])


def downgrade():
    # Drop notifications table
    op.drop_index('idx_notification_user_status', table_name='notifications')
    op.drop_index('idx_notification_created', table_name='notifications')
    op.drop_index('idx_notification_type', table_name='notifications')
    op.drop_index('idx_notification_status', table_name='notifications')
    op.drop_index('idx_notification_user', table_name='notifications')
    op.drop_table('notifications')

    # Drop usecase_knowledge_links table
    op.drop_index('idx_link_impact_type', table_name='usecase_knowledge_links')
    op.drop_index('idx_link_status', table_name='usecase_knowledge_links')
    op.drop_index('idx_link_article', table_name='usecase_knowledge_links')
    op.drop_index('idx_link_usecase', table_name='usecase_knowledge_links')
    op.drop_table('usecase_knowledge_links')

    # Drop knowledge_articles table
    op.drop_index('idx_knowledge_active', table_name='knowledge_articles')
    op.drop_index('idx_knowledge_source_type', table_name='knowledge_articles')
    op.drop_index('idx_knowledge_imported_by', table_name='knowledge_articles')
    op.drop_index('idx_knowledge_validation_status', table_name='knowledge_articles')
    op.drop_table('knowledge_articles')

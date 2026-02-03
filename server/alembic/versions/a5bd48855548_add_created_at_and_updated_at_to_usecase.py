"""Add created_at and updated_at to UseCase

Revision ID: a5bd48855548
Revises: b4f7d8e90123
Create Date: 2026-02-03 03:37:25.181424

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a5bd48855548'
down_revision = 'b4f7d8e90123'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('use_cases', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('use_cases', sa.Column('updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('use_cases', 'updated_at')
    op.drop_column('use_cases', 'created_at')

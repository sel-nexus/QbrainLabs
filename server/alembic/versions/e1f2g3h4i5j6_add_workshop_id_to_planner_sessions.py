"""Add workshop_id to challenge_planner_sessions

Revision ID: e1f2g3h4i5j6
Revises: c1d2e3f4a5b6
Create Date: 2026-03-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1f2g3h4i5j6'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use batch mode for SQLite compatibility
    with op.batch_alter_table('challenge_planner_sessions') as batch_op:
        batch_op.add_column(
            sa.Column('workshop_id', sa.String(36), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table('challenge_planner_sessions') as batch_op:
        batch_op.drop_column('workshop_id')

"""Make use_cases.workshop_id nullable for standalone admin-imported use cases

Revision ID: c1d2e3f4a5b6
Revises: a5bd48855548
Create Date: 2026-02-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1d2e3f4a5b6'
down_revision = 'a5bd48855548'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('use_cases', 'workshop_id', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    # NOTE: downgrade will fail if any rows have workshop_id = NULL
    op.alter_column('use_cases', 'workshop_id', existing_type=sa.String(), nullable=False)

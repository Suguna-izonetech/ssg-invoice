"""Add profile photo to admin_users and reset invoice sequence

Revision ID: 002_profile_and_sequence_reset
Revises: 001_initial
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_profile_and_sequence_reset'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add profile photo columns to admin_users
    op.add_column('admin_users', sa.Column('profile_photo', sa.LargeBinary(), nullable=True))
    op.add_column('admin_users', sa.Column('profile_photo_content_type', sa.String(100), nullable=True))

    # Reset all invoice sequences to 0 so next invoice starts at 00001 per financial year
    # This is intentional: test invoices should not affect client production numbering
    op.execute("UPDATE invoice_sequences SET last_sequence = 0")


def downgrade() -> None:
    op.drop_column('admin_users', 'profile_photo_content_type')
    op.drop_column('admin_users', 'profile_photo')

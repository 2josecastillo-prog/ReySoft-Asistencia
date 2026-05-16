"""add excused attendance status

Revision ID: 20260515_0002
Revises: 20260512_0001
Create Date: 2026-05-15
"""

from alembic import op


revision = "20260515_0002"
down_revision = "20260512_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'excused'")


def downgrade() -> None:
    # PostgreSQL does not support dropping enum values directly.
    pass

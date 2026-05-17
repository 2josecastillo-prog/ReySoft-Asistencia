"""harden jwt sessions

Revision ID: 20260517_0005
Revises: 20260516_0004
Create Date: 2026-05-17
"""

from alembic import op
import sqlalchemy as sa


revision = "20260517_0005"
down_revision = "20260516_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("password_changed_at", sa.DateTime(timezone=False), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "password_changed_at")
    op.drop_column("users", "token_version")

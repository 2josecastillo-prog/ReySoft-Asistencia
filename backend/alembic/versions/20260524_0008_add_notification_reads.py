"""add notification reads

Revision ID: 20260524_0008
Revises: 20260520_0007
Create Date: 2026-05-24
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260524_0008"
down_revision: str | None = "20260520_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notification_reads",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("notification_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=False), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["notification_id"], ["notifications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("notification_id", "user_id", name="uq_notification_read_per_user"),
    )
    op.create_index("idx_notification_reads_notification_id", "notification_reads", ["notification_id"])
    op.create_index("idx_notification_reads_user_id", "notification_reads", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_notification_reads_user_id", table_name="notification_reads")
    op.drop_index("idx_notification_reads_notification_id", table_name="notification_reads")
    op.drop_table("notification_reads")

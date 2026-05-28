"""add attendance parent message tracking

Revision ID: 20260528_0009
Revises: 20260524_0008
Create Date: 2026-05-28
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260528_0009"
down_revision: str | None = "20260524_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("attendance_records", sa.Column("parent_message_sent_at", sa.DateTime(timezone=False), nullable=True))
    op.add_column("attendance_records", sa.Column("parent_message_sent_by_user_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_attendance_parent_message_sent_by_user",
        "attendance_records",
        "users",
        ["parent_message_sent_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "idx_attendance_parent_message_sent_at",
        "attendance_records",
        ["parent_message_sent_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_attendance_parent_message_sent_at", table_name="attendance_records")
    op.drop_constraint(
        "fk_attendance_parent_message_sent_by_user",
        "attendance_records",
        type_="foreignkey",
    )
    op.drop_column("attendance_records", "parent_message_sent_by_user_id")
    op.drop_column("attendance_records", "parent_message_sent_at")

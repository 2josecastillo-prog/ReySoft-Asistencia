"""allow early pickup as second daily attendance record

Revision ID: 20260515_0003
Revises: 20260515_0002
Create Date: 2026-05-15
"""

from alembic import op


revision = "20260515_0003"
down_revision = "20260515_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS uq_student_attendance_per_day")
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_regular_record_per_student_day
        ON attendance_records(student_id, attendance_date)
        WHERE status != 'early_pickup'
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_early_pickup_per_student_day
        ON attendance_records(student_id, attendance_date)
        WHERE status = 'early_pickup'
        """
    )


def downgrade() -> None:
    op.drop_index("uq_attendance_early_pickup_per_student_day", table_name="attendance_records")
    op.drop_index("uq_attendance_regular_record_per_student_day", table_name="attendance_records")
    op.create_unique_constraint(
        "uq_student_attendance_per_day",
        "attendance_records",
        ["student_id", "attendance_date"],
    )

import uuid
from datetime import date, time

from sqlalchemy import Enum, ForeignKey, Index, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql.sqltypes import Date, Time

from app.database.base import Base
from app.models.enums import AttendanceStatus
from app.models.mixins import TimestampMixin


class AttendanceRecord(TimestampMixin, Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        Index(
            "uq_attendance_regular_record_per_student_day",
            "student_id",
            "attendance_date",
            unique=True,
            postgresql_where=text("status != 'early_pickup'"),
            sqlite_where=text("status != 'early_pickup'"),
        ),
        Index(
            "uq_attendance_early_pickup_per_student_day",
            "student_id",
            "attendance_date",
            unique=True,
            postgresql_where=text("status = 'early_pickup'"),
            sqlite_where=text("status = 'early_pickup'"),
        ),
        Index("idx_attendance_organization_id", "organization_id"),
        Index("idx_attendance_student_id", "student_id"),
        Index("idx_attendance_date", "attendance_date"),
        Index("idx_attendance_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    recorded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"), nullable=False
    )
    arrival_time: Mapped[time | None] = mapped_column(Time)
    departure_time: Mapped[time | None] = mapped_column(Time)
    notes: Mapped[str | None] = mapped_column(Text)

    student = relationship("Student", back_populates="attendance_records")
    recorded_by = relationship("User", back_populates="attendance_records")

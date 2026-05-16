import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Index, UniqueConstraint, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql.sqltypes import DateTime, String

from app.database.base import Base
from app.models.mixins import TimestampMixin


class Student(TimestampMixin, Base):
    __tablename__ = "students"
    __table_args__ = (
        UniqueConstraint("organization_id", "student_code", name="uq_student_code_per_organization"),
        Index("idx_students_organization_id", "organization_id"),
        Index("idx_students_course_id", "course_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    student_code: Mapped[str | None] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    organization = relationship("Organization", back_populates="students")
    course = relationship("Course", back_populates="students")
    guardians = relationship("StudentGuardian", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")


class StudentGuardian(Base):
    __tablename__ = "student_guardians"
    __table_args__ = (
        UniqueConstraint("student_id", "guardian_id", name="uq_student_guardian"),
        Index("idx_student_guardians_student_id", "student_id"),
        Index("idx_student_guardians_guardian_id", "guardian_id"),
        Index(
            "uq_one_primary_guardian_per_student",
            "student_id",
            unique=True,
            sqlite_where=text("is_primary = 1"),
            postgresql_where=text("is_primary = TRUE"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    guardian_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("guardians.id", ondelete="CASCADE"), nullable=False
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)

    student = relationship("Student", back_populates="guardians")
    guardian = relationship("Guardian", back_populates="students")

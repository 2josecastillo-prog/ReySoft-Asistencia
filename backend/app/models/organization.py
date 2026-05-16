import uuid

from sqlalchemy import CheckConstraint, Enum, Index, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import OrganizationStatus
from app.models.mixins import TimestampMixin


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"
    __table_args__ = (
        CheckConstraint("primary_color REGEXP '^#[0-9A-Fa-f]{6}$'", name="chk_organization_primary_color"),
        CheckConstraint("secondary_color REGEXP '^#[0-9A-Fa-f]{6}$'", name="chk_organization_secondary_color"),
        CheckConstraint("accent_color REGEXP '^#[0-9A-Fa-f]{6}$'", name="chk_organization_accent_color"),
        CheckConstraint(
            "footer_text IS NULL OR length(footer_text) <= 500",
            name="ck_organizations_organization_footer_text_length",
        ),
        UniqueConstraint("email", name="organizations_email_key"),
        Index("idx_organizations_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    logo_url: Mapped[str | None] = mapped_column(Text)
    footer_text: Mapped[str | None] = mapped_column(Text)
    primary_color: Mapped[str] = mapped_column(String(20), nullable=False, default="#2563EB")
    secondary_color: Mapped[str] = mapped_column(String(20), nullable=False, default="#1E293B")
    accent_color: Mapped[str] = mapped_column(String(20), nullable=False, default="#F59E0B")
    status: Mapped[OrganizationStatus] = mapped_column(
        Enum(OrganizationStatus, name="organization_status"),
        nullable=False,
        default=OrganizationStatus.pending,
    )

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    courses = relationship("Course", back_populates="organization", cascade="all, delete-orphan")
    guardians = relationship("Guardian", back_populates="organization", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="organization", cascade="all, delete-orphan")

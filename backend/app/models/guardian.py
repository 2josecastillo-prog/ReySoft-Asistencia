import uuid

from sqlalchemy import Boolean, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class Guardian(TimestampMixin, Base):
    __tablename__ = "guardians"
    __table_args__ = (Index("idx_guardians_organization_id", "organization_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    relationship: Mapped[str | None] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    organization = orm_relationship("Organization", back_populates="guardians")
    students = orm_relationship("StudentGuardian", back_populates="guardian", cascade="all, delete-orphan")

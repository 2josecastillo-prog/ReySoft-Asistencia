import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.enums import AttendanceStatus
from app.models.mixins import TimestampMixin


class WhatsAppMessageTemplate(TimestampMixin, Base):
    __tablename__ = "whatsapp_message_templates"
    __table_args__ = (
        UniqueConstraint("organization_id", "status", name="uq_template_status_per_organization"),
        Index("idx_whatsapp_templates_organization_id", "organization_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"), nullable=False
    )
    template_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

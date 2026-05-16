from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AttendanceStatus


class WhatsAppTemplateUpdate(BaseModel):
    template_text: str = Field(min_length=5)
    is_active: bool = True


class WhatsAppTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    status: AttendanceStatus
    template_text: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class WhatsAppLinkResponse(BaseModel):
    phone: str
    message: str
    url: str


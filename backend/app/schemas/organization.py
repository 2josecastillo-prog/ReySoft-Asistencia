from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import OrganizationStatus

HEX_COLOR_PATTERN = r"^#[0-9A-Fa-f]{6}$"


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    phone: str | None = None
    logo_url: str | None = None
    footer_text: str | None = None
    primary_color: str
    secondary_color: str
    accent_color: str
    status: OrganizationStatus
    created_at: datetime
    updated_at: datetime


class OrganizationSettingsUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    footer_text: str | None = Field(default=None, max_length=500)
    primary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    secondary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    accent_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)

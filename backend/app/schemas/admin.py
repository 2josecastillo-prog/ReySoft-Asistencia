from datetime import date, datetime
from uuid import UUID

from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.enums import NotificationType, OrganizationStatus, SubscriptionStatus
from app.schemas.name import legacy_admin_full_name_to_parts
from app.schemas.organization import HEX_COLOR_PATTERN, OrganizationResponse
from app.schemas.user import UserResponse
from app.utils.names import normalize_name_part


class ActivationRequest(BaseModel):
    expiration_date: date | None = None
    notes: str | None = None


class AdminCreateOrganizationRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=150)
    organization_email: EmailStr
    organization_phone: str = Field(min_length=7, max_length=30)
    admin_first_name: str = Field(min_length=1, max_length=80)
    admin_middle_name: str | None = Field(default=None, max_length=80)
    admin_last_name: str = Field(min_length=1, max_length=80)
    admin_second_surname: str | None = Field(default=None, max_length=80)
    admin_email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    primary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    secondary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    accent_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    footer_text: str | None = Field(default=None, max_length=500)
    status: OrganizationStatus = OrganizationStatus.active

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_admin_full_name(cls, data: Any) -> Any:
        return legacy_admin_full_name_to_parts(data)

    @field_validator("admin_first_name", "admin_last_name")
    @classmethod
    def clean_required_name(cls, value: str) -> str:
        cleaned = normalize_name_part(value)
        if not cleaned:
            raise ValueError("Este campo es obligatorio.")
        return cleaned

    @field_validator("admin_middle_name", "admin_second_surname")
    @classmethod
    def clean_optional_name(cls, value: str | None) -> str | None:
        return normalize_name_part(value)


class AdminUpdateOrganizationRequest(BaseModel):
    organization_name: str | None = Field(default=None, min_length=2, max_length=150)
    organization_email: EmailStr | None = None
    organization_phone: str | None = Field(default=None, min_length=7, max_length=30)
    primary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    secondary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    accent_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    footer_text: str | None = Field(default=None, max_length=500)


class AdminResetSchoolAdminPasswordRequest(BaseModel):
    password: str = Field(min_length=8, max_length=72)


class AdminCreateOrganizationResponse(BaseModel):
    message: str
    organization: OrganizationResponse
    admin_user: UserResponse


class AdminResetSchoolAdminPasswordResponse(BaseModel):
    message: str
    admin_user: UserResponse


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None
    organization_id: UUID | None
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime


class NotificationsReadAllResponse(BaseModel):
    updated_count: int


class AdminAuditLogResponse(BaseModel):
    id: UUID
    organization_id: UUID | None
    organization_name: str | None
    user_id: UUID | None
    user_email: EmailStr | None
    user_full_name: str | None
    action: str
    entity_name: str | None
    entity_id: UUID | None
    old_data: dict[str, Any] | None
    new_data: dict[str, Any] | None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime


class SubscriptionActivationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    activated_by_user_id: UUID | None
    activation_date: date
    expiration_date: date | None
    status: SubscriptionStatus
    notes: str | None
    created_at: datetime


class SuperAdminDashboardResponse(BaseModel):
    total_organizations: int
    active_organizations: int
    pending_organizations: int
    suspended_organizations: int
    new_registration_requests: int


class SchoolDashboardResponse(BaseModel):
    active_students: int
    active_guardians: int
    today_attendance: int
    today_absences: int
    today_late_arrivals: int
    today_excused: int

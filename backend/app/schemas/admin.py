from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import NotificationType, OrganizationStatus, SubscriptionStatus
from app.schemas.organization import HEX_COLOR_PATTERN, OrganizationResponse
from app.schemas.user import UserResponse


class ActivationRequest(BaseModel):
    expiration_date: date | None = None
    notes: str | None = None


class AdminCreateOrganizationRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=150)
    organization_email: EmailStr
    organization_phone: str = Field(min_length=7, max_length=30)
    admin_full_name: str = Field(min_length=2, max_length=150)
    admin_email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    primary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    secondary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    accent_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    footer_text: str | None = Field(default=None, max_length=500)
    status: OrganizationStatus = OrganizationStatus.active


class AdminUpdateOrganizationRequest(BaseModel):
    organization_name: str | None = Field(default=None, min_length=2, max_length=150)
    organization_email: EmailStr | None = None
    organization_phone: str | None = Field(default=None, min_length=7, max_length=30)
    primary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    secondary_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    accent_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    footer_text: str | None = Field(default=None, max_length=500)


class AdminCreateOrganizationResponse(BaseModel):
    message: str
    organization: OrganizationResponse
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

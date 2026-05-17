from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole
from app.schemas.name import NamePartsBase, OptionalNamePartsBase
from app.schemas.organization import OrganizationResponse


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID | None
    first_name: str
    middle_name: str | None
    last_name: str
    second_surname: str | None
    full_name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    organization: OrganizationResponse | None = None


class StaffUserCreate(NamePartsBase):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class StaffUserUpdate(OptionalNamePartsBase):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=72)
    is_active: bool | None = None

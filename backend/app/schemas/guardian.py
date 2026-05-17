from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.name import NamePartsBase, OptionalNamePartsBase


class GuardianCreate(NamePartsBase):
    phone: str = Field(min_length=7, max_length=30)
    relationship: str | None = Field(default=None, max_length=50)
    is_active: bool = True


class GuardianUpdate(OptionalNamePartsBase):
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    relationship: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class GuardianResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    first_name: str
    middle_name: str | None
    last_name: str
    second_surname: str | None
    full_name: str
    phone: str
    relationship: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GuardianCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=7, max_length=30)
    relationship: str | None = Field(default=None, max_length=50)
    is_active: bool = True


class GuardianUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    relationship: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class GuardianResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    full_name: str
    phone: str
    relationship: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


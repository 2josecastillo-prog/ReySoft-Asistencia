from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CourseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    section: str | None = Field(default=None, max_length=50)
    academic_year: str | None = Field(default=None, max_length=20)
    is_active: bool = True


class CourseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    section: str | None = Field(default=None, max_length=50)
    academic_year: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    name: str
    section: str | None
    academic_year: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


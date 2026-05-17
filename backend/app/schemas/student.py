from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.name import NamePartsBase, OptionalNamePartsBase


class StudentCreate(NamePartsBase):
    course_id: UUID
    student_code: str | None = Field(default=None, max_length=50)
    is_active: bool = True
    guardian_ids: list[UUID] = Field(min_length=1)
    primary_guardian_id: UUID | None = None

    @model_validator(mode="after")
    def ensure_primary_is_assigned(self) -> "StudentCreate":
        if self.primary_guardian_id and self.primary_guardian_id not in self.guardian_ids:
            raise ValueError("El tutor principal debe estar incluido en guardian_ids.")
        return self


class StudentUpdate(OptionalNamePartsBase):
    course_id: UUID | None = None
    student_code: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    course_id: UUID
    first_name: str
    middle_name: str | None
    last_name: str
    second_surname: str | None
    full_name: str
    student_code: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class StudentGuardianCreate(BaseModel):
    guardian_id: UUID
    is_primary: bool = False


class StudentGuardianResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    guardian_id: UUID
    is_primary: bool
    created_at: datetime


class StudentImportResponse(BaseModel):
    created: int
    updated: int
    errors: list[str] = []

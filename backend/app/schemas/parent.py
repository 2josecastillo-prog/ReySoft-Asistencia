from datetime import date, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import AttendanceStatus
from app.schemas.organization import OrganizationResponse


class ParentLoginRequest(BaseModel):
    phone: str


class ParentGuardianResponse(BaseModel):
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
    organization: OrganizationResponse


class ParentTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    guardian: ParentGuardianResponse


class ParentStudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    middle_name: str | None
    last_name: str
    second_surname: str | None
    full_name: str
    student_code: str | None
    course_id: UUID
    course_name: str
    course_section: str | None
    course_academic_year: str | None
    organization_name: str


class ParentAttendanceResponse(BaseModel):
    id: UUID
    student_id: UUID
    student_name: str
    attendance_date: date
    status: AttendanceStatus
    arrival_time: time | None
    departure_time: time | None
    display_time: time | None
    notes: str | None

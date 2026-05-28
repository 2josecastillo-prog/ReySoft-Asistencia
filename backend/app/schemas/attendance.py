from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import AttendanceStatus


class AttendanceCreate(BaseModel):
    student_id: UUID
    attendance_date: date
    status: AttendanceStatus
    arrival_time: time | None = None
    departure_time: time | None = None
    notes: str | None = None


class AttendanceUpdate(BaseModel):
    attendance_date: date | None = None
    status: AttendanceStatus | None = None
    arrival_time: time | None = None
    departure_time: time | None = None
    notes: str | None = None


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    student_id: UUID
    recorded_by_user_id: UUID | None
    attendance_date: date
    status: AttendanceStatus
    arrival_time: time | None
    departure_time: time | None
    notes: str | None
    parent_message_sent_at: datetime | None
    parent_message_sent_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime

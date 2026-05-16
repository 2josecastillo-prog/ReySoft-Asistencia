from datetime import date, time
from uuid import UUID

from pydantic import BaseModel


class AttendanceReportRecord(BaseModel):
    id: UUID
    student_id: UUID
    student_name: str
    attendance_date: date
    status: str
    arrival_time: time | None
    departure_time: time | None
    display_time: time | None
    notes: str | None


class AttendanceReportBase(BaseModel):
    arrived_count: int
    absent_count: int
    late_count: int
    early_pickup_count: int
    excused_count: int
    excused_absence_equivalent: int
    equivalent_absences: int
    total_records: int
    risk_level: str
    risk_color: str
    records: list[AttendanceReportRecord]


class AttendanceStudentReport(AttendanceReportBase):
    student_id: UUID
    student_name: str
    student_code: str | None
    course_id: UUID
    course_name: str
    course_section: str | None
    course_academic_year: str | None


class AttendanceCourseReport(AttendanceReportBase):
    course_id: UUID
    course_name: str
    course_section: str | None
    course_academic_year: str | None
    student_count: int
    ok_students: int
    warning_students: int
    danger_students: int

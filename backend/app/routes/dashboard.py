from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.permissions import ensure_school_user
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import AttendanceRecord, AttendanceStatus, Guardian, Student, User
from app.schemas.admin import SchoolDashboardResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/school", response_model=SchoolDashboardResponse)
def school_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    organization_id = current_user.organization_id
    today = date.today()
    active_students = db.scalar(
        select(func.count(Student.id)).where(Student.organization_id == organization_id, Student.is_active.is_(True))
    ) or 0
    active_guardians = db.scalar(
        select(func.count(Guardian.id)).where(Guardian.organization_id == organization_id, Guardian.is_active.is_(True))
    ) or 0
    today_attendance = db.scalar(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.organization_id == organization_id,
            AttendanceRecord.attendance_date == today,
        )
    ) or 0
    today_absences = db.scalar(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.organization_id == organization_id,
            AttendanceRecord.attendance_date == today,
            AttendanceRecord.status == AttendanceStatus.absent,
        )
    ) or 0
    today_late_arrivals = db.scalar(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.organization_id == organization_id,
            AttendanceRecord.attendance_date == today,
            AttendanceRecord.status == AttendanceStatus.late,
        )
    ) or 0
    today_excused = db.scalar(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.organization_id == organization_id,
            AttendanceRecord.attendance_date == today,
            AttendanceRecord.status == AttendanceStatus.excused,
        )
    ) or 0
    return {
        "active_students": active_students,
        "active_guardians": active_guardians,
        "today_attendance": today_attendance,
        "today_absences": today_absences,
        "today_late_arrivals": today_late_arrivals,
        "today_excused": today_excused,
    }

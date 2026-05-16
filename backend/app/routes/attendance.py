from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import ensure_school_admin, ensure_school_user
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import AttendanceRecord, AttendanceStatus, Student, User
from app.schemas.attendance import AttendanceCreate, AttendanceResponse, AttendanceUpdate
from app.schemas.whatsapp import WhatsAppLinkResponse
from app.services.audit import create_audit_log
from app.services.whatsapp import build_whatsapp_link

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _get_attendance_or_404(db: Session, attendance_id: UUID, organization_id: UUID) -> AttendanceRecord:
    attendance = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.id == attendance_id,
            AttendanceRecord.organization_id == organization_id,
        )
    )
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro de asistencia no encontrado.")
    return attendance


def _ensure_student_in_organization(db: Session, student_id: UUID, organization_id: UUID) -> Student:
    student = db.scalar(select(Student).where(Student.id == student_id, Student.organization_id == organization_id))
    if not student:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El estudiante no pertenece a tu centro educativo.")
    return student


def _ensure_attendance_day_rule(
    db: Session,
    student_id: UUID,
    attendance_date: date,
    next_status: AttendanceStatus,
    exclude_id: UUID | None = None,
) -> None:
    query = select(AttendanceRecord.status).where(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.attendance_date == attendance_date,
    )
    if exclude_id:
        query = query.where(AttendanceRecord.id != exclude_id)
    existing_statuses = list(db.scalars(query))
    if not existing_statuses:
        return

    has_early_pickup = AttendanceStatus.early_pickup in existing_statuses
    if next_status == AttendanceStatus.early_pickup:
        if has_early_pickup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este estudiante ya tiene un retiro temprano registrado para esta fecha.",
            )
        return

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Este estudiante ya tiene asistencia registrada para esta fecha. Solo puedes agregar un retiro temprano adicional.",
    )


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_attendance(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    _ensure_student_in_organization(db, payload.student_id, current_user.organization_id)
    _ensure_attendance_day_rule(db, payload.student_id, payload.attendance_date, payload.status)
    attendance = AttendanceRecord(
        organization_id=current_user.organization_id,
        recorded_by_user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


@router.get("", response_model=list[AttendanceResponse])
def list_attendance(
    attendance_date: date | None = None,
    status_filter: AttendanceStatus | None = None,
    student_id: UUID | None = None,
    course_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    query = select(AttendanceRecord).join(Student).where(AttendanceRecord.organization_id == current_user.organization_id)
    if attendance_date:
        query = query.where(AttendanceRecord.attendance_date == attendance_date)
    if status_filter:
        query = query.where(AttendanceRecord.status == status_filter)
    if student_id:
        query = query.where(AttendanceRecord.student_id == student_id)
    if course_id:
        query = query.where(Student.course_id == course_id)
    return db.scalars(query.order_by(AttendanceRecord.attendance_date.desc())).all()


@router.get("/{attendance_id}", response_model=AttendanceResponse)
def get_attendance(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    return _get_attendance_or_404(db, attendance_id, current_user.organization_id)


@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: UUID,
    payload: AttendanceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    attendance = _get_attendance_or_404(db, attendance_id, current_user.organization_id)
    old_data = {
        "attendance_date": attendance.attendance_date.isoformat(),
        "status": attendance.status.value,
        "arrival_time": str(attendance.arrival_time) if attendance.arrival_time else None,
        "departure_time": str(attendance.departure_time) if attendance.departure_time else None,
        "notes": attendance.notes,
    }
    update_data = payload.model_dump(exclude_unset=True)
    next_date = update_data.get("attendance_date", attendance.attendance_date)
    next_status = update_data.get("status", attendance.status)
    _ensure_attendance_day_rule(db, attendance.student_id, next_date, next_status, exclude_id=attendance.id)
    for field, value in update_data.items():
        setattr(attendance, field, value)
    create_audit_log(
        db,
        action="update_attendance",
        user=current_user,
        organization_id=current_user.organization_id,
        entity_name="attendance_records",
        entity_id=attendance.id,
        old_data=old_data,
        new_data={key: str(value) for key, value in update_data.items()},
        request=request,
    )
    db.commit()
    db.refresh(attendance)
    return attendance


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    attendance = _get_attendance_or_404(db, attendance_id, current_user.organization_id)
    db.delete(attendance)
    db.commit()


@router.post("/{attendance_id}/whatsapp-link", response_model=WhatsAppLinkResponse)
def create_attendance_whatsapp_link(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    attendance = _get_attendance_or_404(db, attendance_id, current_user.organization_id)
    return build_whatsapp_link(db, attendance)

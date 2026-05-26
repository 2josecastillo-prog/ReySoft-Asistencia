from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.csrf import clear_csrf_cookie, set_csrf_cookie
from app.core.security import clear_access_cookie, create_access_token, set_access_cookie
from app.database.session import get_db
from app.dependencies.parent_auth import get_current_parent_guardian
from app.models import AttendanceRecord, Guardian, Organization, OrganizationStatus, Student, StudentGuardian
from app.schemas.parent import (
    ParentAttendanceResponse,
    ParentGuardianResponse,
    ParentLoginRequest,
    ParentStudentResponse,
    ParentTokenResponse,
)
from app.services.subscriptions import sync_expired_organization
from app.utils.names import name_sort_columns
from app.utils.phone import clean_phone_number

router = APIRouter(prefix="/parents", tags=["parents"])


def _find_active_guardian_by_phone(db: Session, phone: str) -> Guardian:
    guardians = db.scalars(
        select(Guardian)
        .join(Organization, Organization.id == Guardian.organization_id)
        .options(selectinload(Guardian.organization))
        .where(
            Guardian.phone == phone,
            Guardian.is_active.is_(True),
            Organization.status == OrganizationStatus.active,
        )
    ).all()
    if not guardians:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No encontramos un tutor activo con ese teléfono.",
        )
    if len(guardians) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este teléfono está asociado a más de un tutor. Contacta al centro educativo.",
        )
    return guardians[0]


def _guardian_students_query(guardian: Guardian):
    return (
        select(Student)
        .join(StudentGuardian, StudentGuardian.student_id == Student.id)
        .options(selectinload(Student.course))
        .where(
            StudentGuardian.guardian_id == guardian.id,
            Student.organization_id == guardian.organization_id,
        )
    )


def _student_response(student: Student, organization_name: str) -> ParentStudentResponse:
    return ParentStudentResponse(
        id=student.id,
        first_name=student.first_name,
        middle_name=student.middle_name,
        last_name=student.last_name,
        second_surname=student.second_surname,
        full_name=student.full_name,
        student_code=student.student_code,
        course_id=student.course_id,
        course_name=student.course.name,
        course_section=student.course.section,
        course_academic_year=student.course.academic_year,
        organization_name=organization_name,
    )


def _attendance_response(record: AttendanceRecord, student_name: str) -> ParentAttendanceResponse:
    return ParentAttendanceResponse(
        id=record.id,
        student_id=record.student_id,
        student_name=student_name,
        attendance_date=record.attendance_date,
        status=record.status,
        arrival_time=record.arrival_time,
        departure_time=record.departure_time,
        display_time=record.arrival_time or record.departure_time,
        notes=record.notes,
    )


@router.post("/login", response_model=ParentTokenResponse)
def parent_login(payload: ParentLoginRequest, response: Response, db: Session = Depends(get_db)):
    phone = clean_phone_number(payload.phone)
    guardian = _find_active_guardian_by_phone(db, phone)
    if sync_expired_organization(db, guardian.organization):
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La cuenta del centro educativo expiro.")
    token = create_access_token(subject=str(guardian.id), extra_claims={"scope": "parent"})
    set_access_cookie(response, settings.parent_auth_cookie_name, token)
    set_csrf_cookie(response)
    return {"access_token": token, "token_type": "bearer", "guardian": guardian}


@router.post("/logout")
def parent_logout(response: Response):
    clear_access_cookie(response, settings.parent_auth_cookie_name)
    clear_csrf_cookie(response)
    return {"message": "Sesión cerrada."}


@router.get("/me", response_model=ParentGuardianResponse)
def parent_me(current_guardian: Guardian = Depends(get_current_parent_guardian)):
    return current_guardian


@router.get("/students", response_model=list[ParentStudentResponse])
def parent_students(
    db: Session = Depends(get_db),
    current_guardian: Guardian = Depends(get_current_parent_guardian),
):
    students = db.scalars(_guardian_students_query(current_guardian).order_by(*name_sort_columns(Student))).all()
    return [_student_response(student, current_guardian.organization.name) for student in students]


@router.get("/attendance", response_model=list[ParentAttendanceResponse])
def parent_attendance(
    student_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_guardian: Guardian = Depends(get_current_parent_guardian),
):
    students = db.scalars(_guardian_students_query(current_guardian)).all()
    students_by_id = {student.id: student for student in students}
    if student_id:
        if student_id not in students_by_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado.")
        student_ids = [student_id]
    else:
        student_ids = list(students_by_id)

    if not student_ids:
        return []

    query = select(AttendanceRecord).where(
        AttendanceRecord.organization_id == current_guardian.organization_id,
        AttendanceRecord.student_id.in_(student_ids),
    )
    if start_date:
        query = query.where(AttendanceRecord.attendance_date >= start_date)
    if end_date:
        query = query.where(AttendanceRecord.attendance_date <= end_date)

    records = db.scalars(query.order_by(AttendanceRecord.attendance_date.desc(), AttendanceRecord.created_at.desc())).all()
    return [_attendance_response(record, students_by_id[record.student_id].full_name) for record in records]

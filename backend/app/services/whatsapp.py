from urllib.parse import quote
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import current_utc_naive
from app.models import AttendanceRecord, Guardian, Organization, Student, StudentGuardian, WhatsAppMessageTemplate
from app.services.templates import ensure_default_whatsapp_templates
from app.utils.phone import clean_phone_number


def mark_parent_message_sent(attendance: AttendanceRecord, user_id: UUID) -> None:
    attendance.parent_message_sent_at = current_utc_naive()
    attendance.parent_message_sent_by_user_id = user_id


def build_whatsapp_link(db: Session, attendance: AttendanceRecord) -> dict[str, str]:
    organization = db.scalar(select(Organization).where(Organization.id == attendance.organization_id))
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro educativo no encontrado.")
    ensure_default_whatsapp_templates(db, organization)

    template = db.scalar(
        select(WhatsAppMessageTemplate).where(
            WhatsAppMessageTemplate.organization_id == attendance.organization_id,
            WhatsAppMessageTemplate.status == attendance.status,
            WhatsAppMessageTemplate.is_active.is_(True),
        )
    )
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe una plantilla activa para este estado de asistencia.",
        )

    student = db.scalar(select(Student).where(Student.id == attendance.student_id))
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado.")

    relation = db.scalar(
        select(StudentGuardian).where(
            StudentGuardian.student_id == student.id,
            StudentGuardian.is_primary.is_(True),
        )
    )
    if not relation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este estudiante no tiene un tutor principal asignado.",
        )

    guardian = db.scalar(select(Guardian).where(Guardian.id == relation.guardian_id))
    if not guardian:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutor principal no encontrado.")

    time_value = attendance.arrival_time or attendance.departure_time
    replacements = {
        "{student_name}": student.full_name,
        "{guardian_name}": guardian.full_name,
        "{course_name}": student.course.name if student.course else "",
        "{school_name}": organization.name if organization else "",
        "{date}": attendance.attendance_date.isoformat(),
        "{time}": time_value.strftime("%H:%M") if time_value else "",
    }
    message = template.template_text
    for key, value in replacements.items():
        message = message.replace(key, value)

    phone = clean_phone_number(guardian.phone)
    return {
        "phone": phone,
        "message": message,
        "url": f"https://wa.me/{phone}?text={quote(message)}",
    }

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AttendanceStatus, Organization, WhatsAppMessageTemplate


DEFAULT_WHATSAPP_TEMPLATES = {
    AttendanceStatus.arrived: (
        "Hola {guardian_name}, {student_name} llegó a {school_name} el {date} a las {time}."
    ),
    AttendanceStatus.absent: (
        "Hola {guardian_name}, registramos a {student_name} como ausente en {school_name} el {date}."
    ),
    AttendanceStatus.late: (
        "Hola {guardian_name}, {student_name} llegó tarde a {school_name} el {date} a las {time}."
    ),
    AttendanceStatus.early_pickup: (
        "Hola {guardian_name}, {student_name} fue retirado temprano de {school_name} el {date} a las {time}."
    ),
    AttendanceStatus.excused: (
        "Hola {guardian_name}, registramos a {student_name} como excusado en {school_name} el {date}."
    ),
}


def create_default_whatsapp_templates(db: Session, organization: Organization) -> list[WhatsAppMessageTemplate]:
    return ensure_default_whatsapp_templates(db, organization)


def ensure_default_whatsapp_templates(db: Session, organization: Organization) -> list[WhatsAppMessageTemplate]:
    existing_statuses = set(
        db.scalars(
            select(WhatsAppMessageTemplate.status).where(
                WhatsAppMessageTemplate.organization_id == organization.id,
            )
        ).all()
    )
    templates = [
        WhatsAppMessageTemplate(
            organization_id=organization.id,
            status=status,
            template_text=template_text,
            is_active=True,
        )
        for status, template_text in DEFAULT_WHATSAPP_TEMPLATES.items()
        if status not in existing_statuses
    ]
    if templates:
        db.add_all(templates)
        db.flush()
    return templates

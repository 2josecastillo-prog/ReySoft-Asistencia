from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import ensure_school_admin, ensure_school_user
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import AttendanceRecord, User, WhatsAppMessageTemplate
from app.schemas.whatsapp import WhatsAppLinkResponse, WhatsAppTemplateResponse, WhatsAppTemplateUpdate
from app.services.templates import ensure_default_whatsapp_templates
from app.services.whatsapp import build_whatsapp_link, mark_parent_message_sent

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.get("/templates", response_model=list[WhatsAppTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    ensure_default_whatsapp_templates(db, current_user.organization)
    db.commit()
    return db.scalars(
        select(WhatsAppMessageTemplate)
        .where(WhatsAppMessageTemplate.organization_id == current_user.organization_id)
        .order_by(WhatsAppMessageTemplate.status)
    ).all()


@router.put("/templates/{template_id}", response_model=WhatsAppTemplateResponse)
def update_template(
    template_id: UUID,
    payload: WhatsAppTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    template = db.scalar(
        select(WhatsAppMessageTemplate).where(
            WhatsAppMessageTemplate.id == template_id,
            WhatsAppMessageTemplate.organization_id == current_user.organization_id,
        )
    )
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada.")
    template.template_text = payload.template_text
    template.is_active = payload.is_active
    db.commit()
    db.refresh(template)
    return template


@router.post("/attendance/{attendance_id}/whatsapp-link", response_model=WhatsAppLinkResponse)
def create_whatsapp_link(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    attendance = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.id == attendance_id,
            AttendanceRecord.organization_id == current_user.organization_id,
        )
    )
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro de asistencia no encontrado.")
    link = build_whatsapp_link(db, attendance)
    mark_parent_message_sent(attendance, current_user.id)
    db.commit()
    return link

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.permissions import ensure_super_admin
from app.core.security import hash_password
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import (
    Notification,
    NotificationType,
    Organization,
    OrganizationStatus,
    SubscriptionActivation,
    SubscriptionStatus,
    User,
    UserRole,
)
from app.schemas.admin import (
    AdminCreateOrganizationRequest,
    AdminCreateOrganizationResponse,
    AdminUpdateOrganizationRequest,
    ActivationRequest,
    NotificationResponse,
    SubscriptionActivationResponse,
    SuperAdminDashboardResponse,
)
from app.schemas.organization import OrganizationResponse
from app.services.audit import create_audit_log
from app.services.logo_uploads import save_logo_upload
from app.services.subscriptions import sync_expired_organization, sync_expired_organizations
from app.services.templates import create_default_whatsapp_templates
from app.utils.phone import clean_phone_number

router = APIRouter(prefix="/admin", tags=["admin"])


def _clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


@router.post("/organizations", response_model=AdminCreateOrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: AdminCreateOrganizationRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    if payload.admin_email.lower() == payload.organization_email.lower():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo del centro y el correo del administrador deben ser diferentes.",
        )

    existing = db.scalar(
        select(User.id).where(User.email == payload.admin_email.lower()).limit(1)
    ) or db.scalar(select(Organization.id).where(Organization.email == payload.organization_email.lower()).limit(1))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado.")

    organization = Organization(
        name=payload.organization_name,
        email=payload.organization_email.lower(),
        phone=clean_phone_number(payload.organization_phone),
        footer_text=_clean_optional_text(payload.footer_text),
        primary_color=payload.primary_color or "#2563EB",
        secondary_color=payload.secondary_color or "#1E293B",
        accent_color=payload.accent_color or "#F59E0B",
        status=payload.status,
    )
    db.add(organization)
    db.flush()

    admin_user = User(
        organization_id=organization.id,
        full_name=payload.admin_full_name,
        email=payload.admin_email.lower(),
        password_hash=hash_password(payload.password),
        role=UserRole.school_admin,
        is_active=True,
    )
    db.add(admin_user)
    db.flush()
    create_default_whatsapp_templates(db, organization)
    create_audit_log(
        db,
        action="create_organization",
        user=current_user,
        organization_id=organization.id,
        entity_name="organizations",
        entity_id=organization.id,
        new_data={
            "name": organization.name,
            "email": organization.email,
            "status": organization.status.value,
            "footer_text": organization.footer_text,
            "admin_email": admin_user.email,
        },
        request=request,
    )
    db.commit()
    db.refresh(organization)
    db.refresh(admin_user)
    return {"message": "Centro educativo creado.", "organization": organization, "admin_user": admin_user}


@router.post("/organizations/{organization_id}/logo", response_model=OrganizationResponse)
def upload_organization_logo(
    organization_id: UUID,
    request: Request,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    organization = db.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro educativo no encontrado.")

    old_logo_url = organization.logo_url
    organization.logo_url = save_logo_upload(file, organization.id)
    create_audit_log(
        db,
        action="update_organization_logo",
        user=current_user,
        organization_id=organization.id,
        entity_name="organizations",
        entity_id=organization.id,
        old_data={"logo_url": old_logo_url},
        new_data={"logo_url": organization.logo_url},
        request=request,
    )
    db.commit()
    db.refresh(organization)
    return organization


@router.get("/organizations", response_model=list[OrganizationResponse])
def list_organizations(
    status_filter: OrganizationStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    sync_expired_organizations(db)
    query = select(Organization).order_by(Organization.created_at.desc())
    if status_filter:
        query = query.where(Organization.status == status_filter)
    return db.scalars(query).all()


@router.get("/organizations/{organization_id}", response_model=OrganizationResponse)
def get_organization(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    organization = db.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro educativo no encontrado.")
    if sync_expired_organization(db, organization):
        db.commit()
        db.refresh(organization)
    return organization


@router.put("/organizations/{organization_id}", response_model=OrganizationResponse)
def update_organization(
    organization_id: UUID,
    payload: AdminUpdateOrganizationRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    organization = db.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro educativo no encontrado.")

    update_data = payload.model_dump(exclude_unset=True)
    if "organization_email" in update_data and update_data["organization_email"]:
        next_email = update_data["organization_email"].lower()
        existing_email = db.scalar(
            select(Organization.id)
            .where(
                Organization.email == next_email,
                Organization.id != organization.id,
            )
            .limit(1)
        )
        if existing_email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo del centro ya está registrado.")
        update_data["email"] = next_email
        del update_data["organization_email"]

    if "organization_name" in update_data:
        update_data["name"] = update_data.pop("organization_name")

    if "organization_phone" in update_data:
        update_data["phone"] = clean_phone_number(update_data.pop("organization_phone"))

    if "footer_text" in update_data:
        update_data["footer_text"] = _clean_optional_text(update_data["footer_text"])

    old_data = {
        "name": organization.name,
        "email": organization.email,
        "phone": organization.phone,
        "footer_text": organization.footer_text,
        "primary_color": organization.primary_color,
        "secondary_color": organization.secondary_color,
        "accent_color": organization.accent_color,
    }
    for field, value in update_data.items():
        setattr(organization, field, value)

    create_audit_log(
        db,
        action="update_organization",
        user=current_user,
        organization_id=organization.id,
        entity_name="organizations",
        entity_id=organization.id,
        old_data=old_data,
        new_data=update_data,
        request=request,
    )
    db.commit()
    db.refresh(organization)
    return organization


@router.post("/organizations/{organization_id}/activate", response_model=OrganizationResponse)
def activate_organization(
    organization_id: UUID,
    payload: ActivationRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    organization = db.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro educativo no encontrado.")
    old_status = organization.status.value
    organization.status = OrganizationStatus.active
    activation = SubscriptionActivation(
        organization_id=organization.id,
        activated_by_user_id=current_user.id,
        expiration_date=payload.expiration_date,
        status=SubscriptionStatus.active,
        notes=payload.notes,
    )
    db.add(activation)
    db.add(
        Notification(
            user_id=None,
            organization_id=organization.id,
            title="Centro activado",
            message=f"{organization.name} fue activado manualmente.",
            type=NotificationType.activation,
        )
    )
    create_audit_log(
        db,
        action="activate_organization",
        user=current_user,
        organization_id=organization.id,
        entity_name="organizations",
        entity_id=organization.id,
        old_data={"status": old_status},
        new_data={"status": organization.status.value, "expiration_date": str(payload.expiration_date) if payload.expiration_date else None},
        request=request,
    )
    db.commit()
    db.refresh(organization)
    return organization


def _change_organization_status(
    organization_id: UUID,
    next_status: OrganizationStatus,
    action: str,
    request: Request,
    db: Session,
    current_user: User,
) -> Organization:
    ensure_super_admin(current_user)
    organization = db.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Centro educativo no encontrado.")
    old_status = organization.status.value
    organization.status = next_status
    create_audit_log(
        db,
        action=action,
        user=current_user,
        organization_id=organization.id,
        entity_name="organizations",
        entity_id=organization.id,
        old_data={"status": old_status},
        new_data={"status": next_status.value},
        request=request,
    )
    db.commit()
    db.refresh(organization)
    return organization


@router.post("/organizations/{organization_id}/suspend", response_model=OrganizationResponse)
def suspend_organization(
    organization_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _change_organization_status(
        organization_id, OrganizationStatus.suspended, "suspend_organization", request, db, current_user
    )


@router.post("/organizations/{organization_id}/cancel", response_model=OrganizationResponse)
def cancel_organization(
    organization_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _change_organization_status(
        organization_id, OrganizationStatus.cancelled, "cancel_organization", request, db, current_user
    )


@router.get("/notifications", response_model=list[NotificationResponse])
def list_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    query = select(Notification).order_by(Notification.created_at.desc())
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    return db.scalars(query).all()


@router.put("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    notification = db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada.")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/subscription-activations", response_model=list[SubscriptionActivationResponse])
def list_subscription_activations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    return db.scalars(select(SubscriptionActivation).order_by(SubscriptionActivation.created_at.desc())).all()


@router.get("/dashboard", response_model=SuperAdminDashboardResponse)
def super_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_super_admin(current_user)
    sync_expired_organizations(db)
    total = db.scalar(select(func.count(Organization.id))) or 0
    active = db.scalar(select(func.count(Organization.id)).where(Organization.status == OrganizationStatus.active)) or 0
    pending = db.scalar(select(func.count(Organization.id)).where(Organization.status == OrganizationStatus.pending)) or 0
    suspended = db.scalar(select(func.count(Organization.id)).where(Organization.status == OrganizationStatus.suspended)) or 0
    return {
        "total_organizations": total,
        "active_organizations": active,
        "pending_organizations": pending,
        "suspended_organizations": suspended,
        "new_registration_requests": pending,
    }

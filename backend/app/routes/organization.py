from fastapi import APIRouter, Depends, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.permissions import ensure_school_admin, ensure_school_user
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import User
from app.schemas.organization import OrganizationResponse, OrganizationSettingsUpdate
from app.services.audit import create_audit_log
from app.services.logo_uploads import save_logo_upload
from app.utils.phone import clean_phone_number

router = APIRouter(prefix="/organization", tags=["organization"])


def _clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


@router.get("/settings", response_model=OrganizationResponse)
def get_settings(current_user: User = Depends(get_current_user)):
    ensure_school_user(current_user)
    return current_user.organization


@router.put("/settings", response_model=OrganizationResponse)
def update_settings(
    payload: OrganizationSettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    organization = current_user.organization
    old_data = {
        "name": organization.name,
        "phone": organization.phone,
        "logo_url": organization.logo_url,
        "footer_text": organization.footer_text,
        "primary_color": organization.primary_color,
        "secondary_color": organization.secondary_color,
        "accent_color": organization.accent_color,
    }
    update_data = payload.model_dump(exclude_unset=True)
    if "phone" in update_data and update_data["phone"]:
        update_data["phone"] = clean_phone_number(update_data["phone"])
    if "footer_text" in update_data:
        update_data["footer_text"] = _clean_optional_text(update_data["footer_text"])
    for field, value in update_data.items():
        setattr(organization, field, value)
    create_audit_log(
        db,
        action="update_organization_settings",
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


@router.post("/settings/logo", response_model=OrganizationResponse)
def upload_settings_logo(
    request: Request,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    organization = current_user.organization
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

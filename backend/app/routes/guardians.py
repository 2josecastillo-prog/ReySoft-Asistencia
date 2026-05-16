from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.permissions import ensure_school_admin, ensure_school_user
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import Guardian, User
from app.schemas.guardian import GuardianCreate, GuardianResponse, GuardianUpdate
from app.services.audit import create_audit_log
from app.utils.phone import clean_phone_number

router = APIRouter(prefix="/guardians", tags=["guardians"])


def _get_guardian_or_404(db: Session, guardian_id: UUID, organization_id: UUID) -> Guardian:
    guardian = db.scalar(select(Guardian).where(Guardian.id == guardian_id, Guardian.organization_id == organization_id))
    if not guardian:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutor no encontrado.")
    return guardian


@router.post("", response_model=GuardianResponse, status_code=status.HTTP_201_CREATED)
def create_guardian(
    payload: GuardianCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    data = payload.model_dump()
    data["phone"] = clean_phone_number(data["phone"])
    guardian = Guardian(organization_id=current_user.organization_id, **data)
    db.add(guardian)
    db.flush()
    create_audit_log(
        db,
        action="create_guardian",
        user=current_user,
        organization_id=current_user.organization_id,
        entity_name="guardians",
        entity_id=guardian.id,
        new_data={"full_name": guardian.full_name, "phone": guardian.phone},
        request=request,
    )
    db.commit()
    db.refresh(guardian)
    return guardian


@router.get("", response_model=list[GuardianResponse])
def list_guardians(
    search: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    query = select(Guardian).where(Guardian.organization_id == current_user.organization_id)
    if search:
        search_term = search.strip()
        phone_term = clean_phone_number(search_term)
        conditions = [
            Guardian.full_name.ilike(f"%{search_term}%"),
            Guardian.relationship.ilike(f"%{search_term}%"),
        ]
        if phone_term:
            conditions.append(Guardian.phone.ilike(f"%{phone_term}%"))
        query = query.where(or_(*conditions))
    if is_active is not None:
        query = query.where(Guardian.is_active == is_active)
    return db.scalars(query.order_by(Guardian.full_name)).all()


@router.get("/{guardian_id}", response_model=GuardianResponse)
def get_guardian(
    guardian_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    return _get_guardian_or_404(db, guardian_id, current_user.organization_id)


@router.put("/{guardian_id}", response_model=GuardianResponse)
def update_guardian(
    guardian_id: UUID,
    payload: GuardianUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    guardian = _get_guardian_or_404(db, guardian_id, current_user.organization_id)
    old_data = {"full_name": guardian.full_name, "phone": guardian.phone, "relationship": guardian.relationship}
    update_data = payload.model_dump(exclude_unset=True)
    if "phone" in update_data and update_data["phone"]:
        update_data["phone"] = clean_phone_number(update_data["phone"])
    for field, value in update_data.items():
        setattr(guardian, field, value)
    create_audit_log(
        db,
        action="update_guardian",
        user=current_user,
        organization_id=current_user.organization_id,
        entity_name="guardians",
        entity_id=guardian.id,
        old_data=old_data,
        new_data=update_data,
        request=request,
    )
    db.commit()
    db.refresh(guardian)
    return guardian


@router.delete("/{guardian_id}", response_model=GuardianResponse)
def delete_guardian(
    guardian_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    guardian = _get_guardian_or_404(db, guardian_id, current_user.organization_id)
    guardian.is_active = False
    db.commit()
    db.refresh(guardian)
    return guardian

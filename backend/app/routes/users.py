from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.permissions import ensure_school_admin
from app.core.security import hash_password, mark_password_changed
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import User, UserRole
from app.schemas.user import StaffUserCreate, StaffUserUpdate, UserResponse
from app.services.audit import create_audit_log

router = APIRouter(prefix="/users", tags=["users"])


def _get_staff_user_or_404(db: Session, user_id: UUID, organization_id: UUID) -> User:
    user = db.scalar(
        select(User).where(
            User.id == user_id,
            User.organization_id == organization_id,
            User.role == UserRole.staff,
        )
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario de personal no encontrado.")
    return user


def _ensure_email_available(db: Session, email: str, current_user_id: UUID | None = None) -> None:
    query = select(User.id).where(User.email == email.lower())
    if current_user_id:
        query = query.where(User.id != current_user_id)
    if db.scalar(query.limit(1)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado.")


@router.get("", response_model=list[UserResponse])
def list_school_users(
    search: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    query = select(User).where(User.organization_id == current_user.organization_id)
    if role:
        if role == UserRole.super_admin:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol no válido para usuarios escolares.")
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        search_term = search.strip()
        query = query.where(or_(User.full_name.ilike(f"%{search_term}%"), User.email.ilike(f"%{search_term}%")))
    return db.scalars(query.order_by(User.role, User.full_name)).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff_user(
    payload: StaffUserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    email = payload.email.lower()
    _ensure_email_available(db, email)
    user = User(
        organization_id=current_user.organization_id,
        full_name=payload.full_name,
        email=email,
        password_hash=hash_password(payload.password),
        role=UserRole.staff,
        is_active=True,
    )
    db.add(user)
    db.flush()
    create_audit_log(
        db,
        action="create_staff_user",
        user=current_user,
        organization_id=current_user.organization_id,
        entity_name="users",
        entity_id=user.id,
        new_data={"full_name": user.full_name, "email": user.email, "role": user.role.value},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_staff_user(
    user_id: UUID,
    payload: StaffUserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    user = _get_staff_user_or_404(db, user_id, current_user.organization_id)
    old_data = {
        "full_name": user.full_name,
        "email": user.email,
        "is_active": user.is_active,
    }
    update_data = payload.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"]:
        update_data["email"] = update_data["email"].lower()
        _ensure_email_available(db, update_data["email"], current_user_id=user.id)
    if "password" in update_data and update_data["password"]:
        user.password_hash = hash_password(update_data.pop("password"))
        mark_password_changed(user)
    for field, value in update_data.items():
        setattr(user, field, value)
    create_audit_log(
        db,
        action="update_staff_user",
        user=current_user,
        organization_id=current_user.organization_id,
        entity_name="users",
        entity_id=user.id,
        old_data=old_data,
        new_data={key: value for key, value in update_data.items() if key != "password"},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=UserResponse)
def deactivate_staff_user(
    user_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    user = _get_staff_user_or_404(db, user_id, current_user.organization_id)
    old_data = {"is_active": user.is_active}
    user.is_active = False
    create_audit_log(
        db,
        action="deactivate_staff_user",
        user=current_user,
        organization_id=current_user.organization_id,
        entity_name="users",
        entity_id=user.id,
        old_data=old_data,
        new_data={"is_active": False},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return user

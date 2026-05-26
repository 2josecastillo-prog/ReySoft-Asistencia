from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.csrf import clear_csrf_cookie, set_csrf_cookie
from app.core.permissions import ensure_active_organization
from app.core.security import clear_access_cookie, create_access_token, set_access_cookie, verify_password
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.subscriptions import sync_expired_organization

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(
        select(User)
        .options(selectinload(User.organization))
        .where(User.email == payload.email.lower(), User.is_active.is_(True))
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas.")

    if sync_expired_organization(db, user.organization):
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu cuenta expiro. Contacta al administrador.")
    ensure_active_organization(user)
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role.value, "token_version": user.token_version},
    )
    set_access_cookie(response, settings.auth_cookie_name, access_token)
    set_csrf_cookie(response)
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.post("/logout")
def logout(response: Response):
    clear_access_cookie(response, settings.auth_cookie_name)
    clear_csrf_cookie(response)
    return {"message": "Sesión cerrada."}


@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)):
    ensure_active_organization(current_user)
    return current_user

from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import decode_access_token
from app.database.session import get_db
from app.dependencies.auth import bearer_scheme
from app.models import Guardian, OrganizationStatus
from app.services.subscriptions import sync_expired_organization


def get_current_parent_guardian(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Guardian:
    token = credentials.credentials if credentials else request.cookies.get(settings.parent_auth_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token requerido.")
    try:
        payload = decode_access_token(token)
        if payload.get("typ") != "access" or payload.get("scope") != "parent":
            raise ValueError("Token inválido")
        guardian_id = UUID(str(payload["sub"]))
    except (KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

    guardian = db.scalar(
        select(Guardian)
        .options(selectinload(Guardian.organization))
        .where(Guardian.id == guardian_id, Guardian.is_active.is_(True))
    )
    if not guardian or guardian.organization.status != OrganizationStatus.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tutor no encontrado.")
    if sync_expired_organization(db, guardian.organization):
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La cuenta del centro educativo expiro.")
    return guardian

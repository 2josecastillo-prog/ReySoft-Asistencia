from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import decode_access_token
from app.database.session import get_db
from app.dependencies.auth import bearer_scheme
from app.models import Guardian, OrganizationStatus
from app.services.subscriptions import sync_expired_organization


def get_current_parent_guardian(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Guardian:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token requerido.")
    try:
        payload = decode_access_token(credentials.credentials)
        if payload.get("scope") != "parent":
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

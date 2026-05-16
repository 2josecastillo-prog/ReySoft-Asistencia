from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import decode_access_token
from app.database.session import get_db
from app.models import User
from app.services.subscriptions import sync_expired_organization


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token requerido.")
    try:
        payload = decode_access_token(credentials.credentials)
        if payload.get("scope") == "parent":
            raise ValueError("Token inválido")
        user_id = UUID(str(payload["sub"]))
    except (KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

    user = db.scalar(
        select(User)
        .options(selectinload(User.organization))
        .where(User.id == user_id, User.is_active.is_(True))
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado.")
    if sync_expired_organization(db, user.organization):
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu cuenta expiro. Contacta al administrador.")
    return user

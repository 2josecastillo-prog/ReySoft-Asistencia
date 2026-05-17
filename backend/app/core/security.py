from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("La contraseña no puede exceder 72 bytes para bcrypt.")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    password_bytes = plain_password.encode("utf-8")
    if len(password_bytes) > 72:
        return False
    return bcrypt.checkpw(password_bytes, password_hash.encode("utf-8"))


def current_utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "typ": "access",
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": issued_at,
        "nbf": issued_at,
        "exp": expires_at,
        "jti": str(uuid4()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
    except JWTError as exc:
        raise ValueError("Token inválido") from exc


def mark_password_changed(user: Any) -> None:
    user.password_changed_at = current_utc_naive()
    user.token_version = (user.token_version or 0) + 1


def set_access_cookie(response: Any, cookie_name: str, token: str) -> None:
    response.set_cookie(
        key=cookie_name,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.environment.lower() == "production",
        samesite="lax",
        path="/",
    )


def clear_access_cookie(response: Any, cookie_name: str) -> None:
    response.delete_cookie(
        key=cookie_name,
        httponly=True,
        secure=settings.environment.lower() == "production",
        samesite="lax",
        path="/",
    )

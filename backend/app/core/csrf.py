import hashlib
import hmac
import secrets

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings


SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})
CSRF_EXEMPT_PATHS = frozenset({"/auth/login", "/parents/login"})
CSRF_REJECTION_DETAIL = "Solicitud rechazada por protección CSRF."


def generate_csrf_token() -> str:
    nonce = secrets.token_urlsafe(32)
    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        nonce.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{nonce}.{signature}"


def verify_csrf_token(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    nonce, provided_signature = token.rsplit(".", 1)
    expected_signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        nonce.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(provided_signature, expected_signature)


def set_csrf_cookie(response: Response) -> None:
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=generate_csrf_token(),
        max_age=settings.access_token_expire_minutes * 60,
        httponly=False,
        secure=settings.environment.lower() == "production",
        samesite="lax",
        path="/",
    )


def clear_csrf_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.csrf_cookie_name,
        httponly=False,
        secure=settings.environment.lower() == "production",
        samesite="lax",
        path="/",
    )


def _normalized_path(path: str) -> str:
    return path[4:] if path.startswith("/api/") else path


def _has_bearer_authorization(request: Request) -> bool:
    return request.headers.get("authorization", "").lower().startswith("bearer ")


class CsrfProtectionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, enabled: bool | None = None) -> None:
        super().__init__(app)
        self.enabled = settings.csrf_protection_enabled if enabled is None else enabled

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not self.enabled or request.method.upper() in SAFE_METHODS:
            return await call_next(request)

        if _normalized_path(request.url.path) in CSRF_EXEMPT_PATHS:
            return await call_next(request)

        has_cookie_auth = (
            settings.auth_cookie_name in request.cookies
            or settings.parent_auth_cookie_name in request.cookies
        )
        if not has_cookie_auth or _has_bearer_authorization(request):
            return await call_next(request)

        cookie_token = request.cookies.get(settings.csrf_cookie_name)
        header_token = request.headers.get(settings.csrf_header_name)
        if (
            not cookie_token
            or not header_token
            or not hmac.compare_digest(cookie_token, header_token)
            or not verify_csrf_token(cookie_token)
        ):
            return JSONResponse(
                status_code=403,
                content={"detail": CSRF_REJECTION_DETAIL},
            )

        return await call_next(request)

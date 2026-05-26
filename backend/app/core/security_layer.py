import re
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.csrf import CsrfProtectionMiddleware
from app.core.rate_limit import RateLimitMiddleware
from app.core.request_limits import RequestSizeLimitMiddleware
from app.core.security_headers import SecurityHeadersMiddleware


UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,80}$")
CONTENT_TYPE_REJECTION_DETAIL = "Tipo de contenido no permitido."


def _normalized_path(path: str) -> str:
    return path[4:] if path.startswith("/api/") else path


def _has_request_body(request: Request) -> bool:
    content_length = request.headers.get("content-length")
    if not content_length:
        return False
    try:
        return int(content_length) > 0
    except ValueError:
        return True


def _base_content_type(value: str | None) -> str:
    return (value or "").split(";", 1)[0].strip().lower()


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming_request_id = request.headers.get(settings.request_id_header_name, "")
        request_id = (
            incoming_request_id
            if REQUEST_ID_PATTERN.fullmatch(incoming_request_id)
            else str(uuid4())
        )
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers.setdefault(settings.request_id_header_name, request_id)
        return response


class ContentTypeGuardMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, enabled: bool | None = None) -> None:
        super().__init__(app)
        self.enabled = settings.content_type_guard_enabled if enabled is None else enabled
        self.allowed_types = settings.allowed_write_content_type_list

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if (
            not self.enabled
            or request.method.upper() not in UNSAFE_METHODS
            or not _has_request_body(request)
            or _normalized_path(request.url.path).startswith("/uploads/")
        ):
            return await call_next(request)

        content_type = _base_content_type(request.headers.get("content-type"))
        if content_type not in self.allowed_types:
            return JSONResponse(
                status_code=415,
                content={"detail": CONTENT_TYPE_REJECTION_DETAIL},
            )

        return await call_next(request)


def apply_security_layer(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Requested-With",
            settings.csrf_header_name,
            settings.request_id_header_name,
        ],
    )
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(ContentTypeGuardMiddleware)
    app.add_middleware(RequestSizeLimitMiddleware)
    app.add_middleware(CsrfProtectionMiddleware)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestIdMiddleware)

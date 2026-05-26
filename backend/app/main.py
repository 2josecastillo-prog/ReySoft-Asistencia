import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.csrf import CsrfProtectionMiddleware
from app.core.rate_limit import RateLimitMiddleware
from app.core.request_limits import RequestSizeLimitMiddleware
from app.core.security_headers import SecurityHeadersMiddleware
from app.routes import admin, attendance, auth, courses, dashboard, guardians, notifications, organization, parents, reports, students, users, whatsapp

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)
    if settings.storage_backend.lower() == "local":
        Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
        app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With", settings.csrf_header_name],
    )
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestSizeLimitMiddleware)
    app.add_middleware(CsrfProtectionMiddleware)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list)
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(auth.router)
    app.include_router(admin.router)
    app.include_router(courses.router)
    app.include_router(guardians.router)
    app.include_router(students.router)
    app.include_router(users.router)
    app.include_router(notifications.router)
    app.include_router(attendance.router)
    app.include_router(whatsapp.router)
    app.include_router(organization.router)
    app.include_router(dashboard.router)
    app.include_router(reports.router)
    app.include_router(parents.router)

    @app.get("/health", tags=["health"])
    def health_check() -> dict[str, str]:
        return {"status": "ok", "service": settings.app_name}

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "Unhandled application error",
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        return JSONResponse(status_code=500, content={"detail": "Ocurrió un error inesperado."})

    return app


app = create_app()

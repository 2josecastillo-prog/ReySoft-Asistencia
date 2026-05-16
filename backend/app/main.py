from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routes import admin, attendance, auth, courses, dashboard, guardians, organization, parents, reports, students, users, whatsapp


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)
    if settings.storage_backend.lower() == "local":
        Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
        app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(admin.router)
    app.include_router(courses.router)
    app.include_router(guardians.router)
    app.include_router(students.router)
    app.include_router(users.router)
    app.include_router(attendance.router)
    app.include_router(whatsapp.router)
    app.include_router(organization.router)
    app.include_router(dashboard.router)
    app.include_router(reports.router)
    app.include_router(parents.router)

    @app.get("/health", tags=["health"])
    def health_check() -> dict[str, str]:
        return {"status": "ok", "service": settings.app_name}

    return app


app = create_app()

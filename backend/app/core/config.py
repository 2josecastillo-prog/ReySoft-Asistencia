from functools import lru_cache

from pydantic import Field, computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ReySoft-Asistencia"
    environment: str = "development"
    debug: bool = False
    database_url: str = Field(
        default="postgresql+psycopg://reysoft_asistencia:reysoft_asistencia@localhost:5432/reysoft_asistencia"
    )
    secret_key: str = Field(default="change-me-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    jwt_issuer: str = "reysoft-asistencia"
    jwt_audience: str = "reysoft-api"
    auth_cookie_name: str = "reysoft_asistencia_token"
    parent_auth_cookie_name: str = "reysoft_asistencia_parent_token"
    csrf_protection_enabled: bool = True
    csrf_cookie_name: str = "reysoft_asistencia_csrf_token"
    csrf_header_name: str = "X-CSRF-Token"
    request_id_header_name: str = "X-Request-ID"
    content_type_guard_enabled: bool = True
    allowed_write_content_types: str = "application/json,multipart/form-data"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    trusted_hosts: str = "localhost,127.0.0.1,testserver,*.vercel.app,reysoft-asistencia.vercel.app"
    initial_super_admin_email: str = "superadmin@reysoft-asistencia.com"
    initial_super_admin_password: str = "SuperAdmin123!"
    database_pool_mode: str = "default"
    storage_backend: str = "local"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_storage_bucket: str = "school-logos"
    upload_dir: str = "uploads"
    max_logo_upload_bytes: int = 2 * 1024 * 1024
    max_request_body_bytes: int = 10 * 1024 * 1024
    rate_limit_enabled: bool = True
    rate_limit_default_requests_per_minute: int = 120
    rate_limit_auth_requests_per_minute: int = 5
    rate_limit_parent_auth_requests_per_minute: int = 8
    rate_limit_attendance_requests_per_minute: int = 60
    rate_limit_import_requests_per_hour: int = 10
    rate_limit_export_requests_per_hour: int = 30

    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @computed_field
    @property
    def trusted_host_list(self) -> list[str]:
        return [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]

    @computed_field
    @property
    def allowed_write_content_type_list(self) -> list[str]:
        return [
            content_type.strip().lower()
            for content_type in self.allowed_write_content_types.split(",")
            if content_type.strip()
        ]

    @model_validator(mode="after")
    def reject_default_secret_in_production(self) -> "Settings":
        if (
            self.environment.lower() == "production"
            and self.secret_key == "change-me-in-production"
        ):
            raise ValueError("SECRET_KEY debe cambiarse en producción.")
        if self.storage_backend.lower() == "supabase" and (
            not self.supabase_url or not self.supabase_service_role_key
        ):
            raise ValueError(
                "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios "
                "con STORAGE_BACKEND=supabase."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

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
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    initial_super_admin_email: str = "superadmin@reysoft-asistencia.com"
    initial_super_admin_password: str = "SuperAdmin123!"
    database_pool_mode: str = "default"
    storage_backend: str = "local"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_storage_bucket: str = "school-logos"
    upload_dir: str = "uploads"
    max_logo_upload_bytes: int = 2 * 1024 * 1024

    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

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

from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_LOGO_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}
ALLOWED_LOGO_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def _detect_logo_extension(content: bytes) -> str | None:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"
    return None


def _save_logo_to_local_storage(content: bytes, organization_id: UUID, extension: str) -> str:
    logos_dir = Path(settings.upload_dir) / "logos"
    logos_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{organization_id}-{uuid4().hex}{extension}"
    path = logos_dir / filename
    path.write_bytes(content)
    return f"/uploads/logos/{filename}"


def _save_logo_to_supabase_storage(
    content: bytes,
    organization_id: UUID,
    extension: str,
    content_type: str,
) -> str:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="El almacenamiento de logos no esta configurado.",
        )

    filename = f"{organization_id}-{uuid4().hex}{extension}"
    object_path = f"logos/{filename}"
    base_url = settings.supabase_url.rstrip("/")
    bucket = quote(settings.supabase_storage_bucket.strip("/"), safe="")
    encoded_path = quote(object_path, safe="/")
    upload_url = f"{base_url}/storage/v1/object/{bucket}/{encoded_path}"

    request = Request(
        upload_url,
        data=content,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            response.read()
    except (HTTPError, URLError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo subir el logo al almacenamiento configurado.",
        ) from exc

    public_bucket = quote(settings.supabase_storage_bucket.strip("/"), safe="")
    return f"{base_url}/storage/v1/object/public/{public_bucket}/{encoded_path}"


def save_logo_upload(file: UploadFile, organization_id: UUID) -> str:
    content_type = file.content_type or ""
    original_extension = Path(file.filename or "").suffix.lower()
    if content_type not in ALLOWED_LOGO_TYPES or original_extension not in ALLOWED_LOGO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El logo debe ser una imagen PNG, JPG o WEBP.",
        )

    content = file.file.read(settings.max_logo_upload_bytes + 1)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo de logo está vacío.",
        )
    if len(content) > settings.max_logo_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El logo supera el tamaño máximo permitido.",
        )

    detected_extension = _detect_logo_extension(content)
    if not detected_extension or detected_extension != ALLOWED_LOGO_TYPES[content_type]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El contenido del logo no coincide con una imagen PNG, JPG o WEBP valida.",
        )

    if settings.storage_backend.lower() == "supabase":
        return _save_logo_to_supabase_storage(
            content,
            organization_id,
            detected_extension,
            content_type,
        )
    return _save_logo_to_local_storage(content, organization_id, detected_extension)

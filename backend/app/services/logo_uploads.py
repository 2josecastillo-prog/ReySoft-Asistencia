from pathlib import Path
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo de logo está vacío.")
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

    logos_dir = Path(settings.upload_dir) / "logos"
    logos_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{organization_id}-{uuid4().hex}{detected_extension}"
    path = logos_dir / filename
    path.write_bytes(content)
    return f"/uploads/logos/{filename}"

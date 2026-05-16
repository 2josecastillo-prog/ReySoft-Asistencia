from collections.abc import Iterable

from fastapi import HTTPException, status

from app.models import OrganizationStatus, User, UserRole


def ensure_roles(user: User, allowed_roles: Iterable[UserRole]) -> None:
    if user.role not in set(allowed_roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para esta acción.")


def ensure_active_organization(user: User) -> None:
    if user.role == UserRole.super_admin:
        return
    if not user.organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario no tiene centro educativo.")
    if user.organization.status != OrganizationStatus.active:
        status_messages = {
            OrganizationStatus.pending: "Tu cuenta está pendiente de activación. Contacta al administrador.",
            OrganizationStatus.suspended: "Tu cuenta está suspendida. Contacta al administrador.",
            OrganizationStatus.cancelled: "Tu cuenta está cancelada. Contacta al administrador.",
        }
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=status_messages.get(user.organization.status, "El centro educativo no está activo."),
        )


def ensure_school_user(user: User) -> None:
    ensure_roles(user, [UserRole.school_admin, UserRole.staff])
    ensure_active_organization(user)


def ensure_school_admin(user: User) -> None:
    ensure_roles(user, [UserRole.school_admin])
    ensure_active_organization(user)


def ensure_super_admin(user: User) -> None:
    ensure_roles(user, [UserRole.super_admin])

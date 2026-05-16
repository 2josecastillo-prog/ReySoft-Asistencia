from typing import Any
from uuid import UUID

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog, User


def create_audit_log(
    db: Session,
    *,
    action: str,
    user: User | None = None,
    organization_id: UUID | None = None,
    entity_name: str | None = None,
    entity_id: UUID | None = None,
    old_data: dict[str, Any] | None = None,
    new_data: dict[str, Any] | None = None,
    request: Request | None = None,
) -> AuditLog:
    audit_log = AuditLog(
        organization_id=organization_id,
        user_id=user.id if user else None,
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
        old_data=old_data,
        new_data=new_data,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(audit_log)
    return audit_log


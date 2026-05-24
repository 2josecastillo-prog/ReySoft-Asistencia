from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import NotificationType


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID | None
    organization_id: UUID | None
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime


class NotificationsReadAllResponse(BaseModel):
    updated_count: int

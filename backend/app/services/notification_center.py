from collections.abc import Iterable
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select, true
from sqlalchemy.orm import Session

from app.models import Notification, NotificationRead, User, UserRole


def _visible_notification_filter(user: User):
    if user.role == UserRole.super_admin:
        return true()
    return or_(
        Notification.user_id == user.id,
        and_(
            Notification.user_id.is_(None),
            Notification.organization_id == user.organization_id,
        ),
    )


def _read_join_condition(user: User):
    return and_(
        NotificationRead.notification_id == Notification.id,
        NotificationRead.user_id == user.id,
    )


def notification_to_response(notification: Notification, read_id: UUID | None = None) -> dict:
    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "organization_id": notification.organization_id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "is_read": notification.is_read or read_id is not None,
        "created_at": notification.created_at,
    }


def list_notifications_for_user(
    db: Session,
    user: User,
    *,
    unread_only: bool = False,
    limit: int = 100,
) -> list[dict]:
    query = (
        select(Notification, NotificationRead.id.label("read_id"))
        .outerjoin(NotificationRead, _read_join_condition(user))
        .where(_visible_notification_filter(user))
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        query = query.where(Notification.is_read.is_(False), NotificationRead.id.is_(None))
    return [notification_to_response(notification, read_id) for notification, read_id in db.execute(query)]


def get_visible_notification_or_404(db: Session, user: User, notification_id: UUID) -> Notification:
    notification = db.scalar(
        select(Notification)
        .where(Notification.id == notification_id)
        .where(_visible_notification_filter(user))
        .limit(1)
    )
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada.")
    return notification


def _existing_read_ids(db: Session, user: User, notification_ids: Iterable[UUID]) -> set[UUID]:
    ids = list(notification_ids)
    if not ids:
        return set()
    return set(
        db.scalars(
            select(NotificationRead.notification_id).where(
                NotificationRead.user_id == user.id,
                NotificationRead.notification_id.in_(ids),
            )
        ).all()
    )


def mark_notification_read(db: Session, user: User, notification_id: UUID) -> dict:
    notification = get_visible_notification_or_404(db, user, notification_id)
    read_ids = _existing_read_ids(db, user, [notification.id])
    if not notification.is_read and notification.id not in read_ids:
        db.add(NotificationRead(notification_id=notification.id, user_id=user.id))
        db.flush()
    return notification_to_response(notification, notification.id)


def mark_all_notifications_read(db: Session, user: User) -> int:
    rows = (
        db.execute(
            select(Notification, NotificationRead.id.label("read_id"))
            .outerjoin(NotificationRead, _read_join_condition(user))
            .where(
                _visible_notification_filter(user),
                Notification.is_read.is_(False),
                NotificationRead.id.is_(None),
            )
        )
        .all()
    )
    notification_ids = [notification.id for notification, _ in rows]
    for notification_id in notification_ids:
        db.add(NotificationRead(notification_id=notification_id, user_id=user.id))
    if notification_ids:
        db.flush()
    return len(notification_ids)

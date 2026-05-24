from collections import defaultdict
from uuid import UUID

import anyio
from fastapi import WebSocket

from app.models import Notification, User, UserRole


class NotificationConnectionManager:
    def __init__(self) -> None:
        self._by_user: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._by_organization: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._super_admins: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, user: User) -> None:
        await websocket.accept()
        self._by_user[user.id].add(websocket)
        if user.role == UserRole.super_admin:
            self._super_admins.add(websocket)
        elif user.organization_id:
            self._by_organization[user.organization_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user: User) -> None:
        self._by_user[user.id].discard(websocket)
        if user.role == UserRole.super_admin:
            self._super_admins.discard(websocket)
        elif user.organization_id:
            self._by_organization[user.organization_id].discard(websocket)

    async def broadcast(self, notification: Notification) -> None:
        targets: set[WebSocket] = set(self._super_admins)
        if notification.user_id:
            targets.update(self._by_user[notification.user_id])
        if notification.organization_id:
            targets.update(self._by_organization[notification.organization_id])
        payload = {
            "event": "notification_created",
            "notification": {
                "id": str(notification.id),
                "user_id": str(notification.user_id) if notification.user_id else None,
                "organization_id": str(notification.organization_id) if notification.organization_id else None,
                "title": notification.title,
                "message": notification.message,
                "type": notification.type.value,
                "is_read": False,
                "created_at": notification.created_at.isoformat() if notification.created_at else None,
            },
        }
        disconnected: list[WebSocket] = []
        for websocket in targets:
            try:
                await websocket.send_json(payload)
            except RuntimeError:
                disconnected.append(websocket)
        for websocket in disconnected:
            for connections in [*self._by_user.values(), *self._by_organization.values(), self._super_admins]:
                connections.discard(websocket)


manager = NotificationConnectionManager()


def broadcast_notification(notification: Notification) -> None:
    try:
        anyio.from_thread.run(manager.broadcast, notification)
    except RuntimeError:
        return

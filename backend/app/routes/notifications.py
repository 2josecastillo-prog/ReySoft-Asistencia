from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.permissions import ensure_active_organization
from app.core.security import decode_access_token
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import User
from app.schemas.notification import NotificationResponse, NotificationsReadAllResponse
from app.services.notification_center import (
    list_notifications_for_user,
    mark_all_notifications_read,
    mark_notification_read,
)
from app.services.notification_realtime import manager

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_user_notifications(
    unread_only: bool = False,
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_active_organization(current_user)
    return list_notifications_for_user(db, current_user, unread_only=unread_only, limit=limit)


@router.put("/read-all", response_model=NotificationsReadAllResponse)
def mark_user_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_active_organization(current_user)
    updated_count = mark_all_notifications_read(db, current_user)
    db.commit()
    return {"updated_count": updated_count}


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_user_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_active_organization(current_user)
    response = mark_notification_read(db, current_user, notification_id)
    db.commit()
    return response


def _get_websocket_user(websocket: WebSocket, db: Session) -> User | None:
    token = websocket.query_params.get("token") or websocket.cookies.get(settings.auth_cookie_name)
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if payload.get("typ") != "access" or payload.get("scope") == "parent":
            return None
        user_id = UUID(str(payload["sub"]))
        token_version = int(payload["token_version"])
    except (KeyError, ValueError):
        return None

    user = db.scalar(
        select(User)
        .options(selectinload(User.organization))
        .where(User.id == user_id, User.is_active.is_(True))
    )
    if not user or user.token_version != token_version:
        return None
    try:
        ensure_active_organization(user)
    except HTTPException:
        return None
    return user


@router.websocket("/ws")
async def notifications_websocket(websocket: WebSocket, db: Session = Depends(get_db)):
    user = _get_websocket_user(websocket, db)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await manager.connect(websocket, user)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user)

import logging

from fastapi import APIRouter, Request, status

from app.schemas.monitoring import FrontendErrorReport

router = APIRouter(prefix="/monitoring", tags=["monitoring"])
logger = logging.getLogger("app.monitoring.frontend")


@router.post("/frontend-error", status_code=status.HTTP_202_ACCEPTED)
async def collect_frontend_error(payload: FrontendErrorReport, request: Request) -> dict[str, str]:
    request_id = getattr(request.state, "request_id", None)
    client_host = request.client.host if request.client else None
    logger.warning(
        "Frontend error captured",
        extra={
            "request_id": request_id,
            "client_host": client_host,
            "frontend_error": payload.model_dump(exclude_none=True),
        },
    )
    return {"status": "accepted"}

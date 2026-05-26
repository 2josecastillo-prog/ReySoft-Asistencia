from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_body_bytes: int | None = None) -> None:
        super().__init__(app)
        self.max_body_bytes = max_body_bytes or settings.max_request_body_bytes

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                request_size = int(content_length)
            except ValueError:
                request_size = 0
            if request_size > self.max_body_bytes:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "La solicitud excede el tamaño máximo permitido."},
                )

        return await call_next(request)

from collections import deque
from dataclasses import dataclass
from threading import Lock
from time import monotonic

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings


@dataclass(frozen=True)
class RateLimitRule:
    name: str
    methods: frozenset[str]
    path_prefix: str
    requests: int
    window_seconds: int
    path_suffix: str | None = None

    def matches(self, method: str, path: str) -> bool:
        if self.methods and method.upper() not in self.methods:
            return False
        if not path.startswith(self.path_prefix):
            return False
        if self.path_suffix and not path.endswith(self.path_suffix):
            return False
        return True


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = {}
        self._lock = Lock()

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()

    def check(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int, int]:
        now = monotonic()
        window_start = now - window_seconds
        with self._lock:
            bucket = self._buckets.setdefault(key, deque())
            while bucket and bucket[0] <= window_start:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = max(1, int(window_seconds - (now - bucket[0])))
                return False, 0, retry_after

            bucket.append(now)
            remaining = max(0, limit - len(bucket))
            return True, remaining, 0


def _normalize_path(path: str) -> str:
    normalized = path[4:] if path.startswith("/api/") else path
    return normalized or "/"


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    real_ip = request.headers.get("x-real-ip") or request.headers.get("cf-connecting-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def default_rate_limit_rules() -> list[RateLimitRule]:
    return [
        RateLimitRule(
            name="auth-login",
            methods=frozenset({"POST"}),
            path_prefix="/auth/login",
            requests=settings.rate_limit_auth_requests_per_minute,
            window_seconds=60,
        ),
        RateLimitRule(
            name="parent-login",
            methods=frozenset({"POST"}),
            path_prefix="/parents/login",
            requests=settings.rate_limit_parent_auth_requests_per_minute,
            window_seconds=60,
        ),
        RateLimitRule(
            name="student-import",
            methods=frozenset({"POST"}),
            path_prefix="/students/import",
            requests=settings.rate_limit_import_requests_per_hour,
            window_seconds=3600,
        ),
        RateLimitRule(
            name="student-export",
            methods=frozenset({"GET"}),
            path_prefix="/students/export",
            requests=settings.rate_limit_export_requests_per_hour,
            window_seconds=3600,
        ),
        RateLimitRule(
            name="report-export",
            methods=frozenset({"GET"}),
            path_prefix="/reports/attendance/",
            path_suffix="/export",
            requests=settings.rate_limit_export_requests_per_hour,
            window_seconds=3600,
        ),
        RateLimitRule(
            name="attendance-create",
            methods=frozenset({"POST"}),
            path_prefix="/attendance",
            requests=settings.rate_limit_attendance_requests_per_minute,
            window_seconds=60,
        ),
    ]


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        *,
        enabled: bool | None = None,
        rules: list[RateLimitRule] | None = None,
        default_rule: RateLimitRule | None = None,
        limiter: InMemoryRateLimiter | None = None,
    ) -> None:
        super().__init__(app)
        self.enabled = settings.rate_limit_enabled if enabled is None else enabled
        self.rules = rules if rules is not None else default_rate_limit_rules()
        self.default_rule = default_rule if default_rule is not None else RateLimitRule(
            name="api-default",
            methods=frozenset(),
            path_prefix="/",
            requests=settings.rate_limit_default_requests_per_minute,
            window_seconds=60,
        )
        self.limiter = limiter or InMemoryRateLimiter()

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not self.enabled or request.method.upper() == "OPTIONS":
            return await call_next(request)

        path = _normalize_path(request.url.path)
        if path == "/health" or path.startswith("/uploads/"):
            return await call_next(request)

        rule = next((candidate for candidate in self.rules if candidate.matches(request.method, path)), self.default_rule)
        if not rule or rule.requests <= 0 or rule.window_seconds <= 0:
            return await call_next(request)

        key = f"{rule.name}:{_client_ip(request)}"
        allowed, remaining, retry_after = self.limiter.check(key, rule.requests, rule.window_seconds)
        headers = {
            "X-RateLimit-Limit": str(rule.requests),
            "X-RateLimit-Remaining": str(remaining),
        }
        if not allowed:
            headers["Retry-After"] = str(retry_after)
            return JSONResponse(
                status_code=429,
                content={"detail": "Demasiadas solicitudes. Intenta nuevamente más tarde."},
                headers=headers,
            )

        response = await call_next(request)
        response.headers.setdefault("X-RateLimit-Limit", str(rule.requests))
        response.headers.setdefault("X-RateLimit-Remaining", str(remaining))
        return response

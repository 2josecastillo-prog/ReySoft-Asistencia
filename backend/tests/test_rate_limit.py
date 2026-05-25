from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.rate_limit import RateLimitMiddleware, RateLimitRule


def _limited_client() -> TestClient:
    app = FastAPI()
    app.add_middleware(
        RateLimitMiddleware,
        enabled=True,
        rules=[
            RateLimitRule(
                name="auth-login-test",
                methods=frozenset({"POST"}),
                path_prefix="/auth/login",
                requests=2,
                window_seconds=60,
            )
        ],
        default_rule=None,
    )

    @app.post("/auth/login")
    def login():
        return {"status": "ok"}

    return TestClient(app)


def test_rate_limit_blocks_requests_after_configured_limit():
    client = _limited_client()

    first = client.post("/auth/login")
    second = client.post("/auth/login")
    third = client.post("/auth/login")

    assert first.status_code == 200
    assert first.headers["x-ratelimit-limit"] == "2"
    assert first.headers["x-ratelimit-remaining"] == "1"
    assert second.status_code == 200
    assert second.headers["x-ratelimit-remaining"] == "0"
    assert third.status_code == 429
    assert third.json()["detail"] == "Demasiadas solicitudes. Intenta nuevamente más tarde."
    assert third.headers["retry-after"]


def test_rate_limit_uses_forwarded_client_ip_as_bucket_key():
    client = _limited_client()

    assert client.post("/auth/login", headers={"X-Forwarded-For": "203.0.113.10"}).status_code == 200
    assert client.post("/auth/login", headers={"X-Forwarded-For": "203.0.113.10"}).status_code == 200
    assert client.post("/auth/login", headers={"X-Forwarded-For": "198.51.100.20"}).status_code == 200
    assert client.post("/auth/login", headers={"X-Forwarded-For": "203.0.113.10"}).status_code == 429

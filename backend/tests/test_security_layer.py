from fastapi.testclient import TestClient


def test_request_id_header_is_generated_and_preserved(client: TestClient):
    generated = client.get("/health")
    assert generated.status_code == 200
    assert generated.headers["x-request-id"]

    provided_request_id = "req-abc-123456"
    preserved = client.get("/health", headers={"X-Request-ID": provided_request_id})
    assert preserved.status_code == 200
    assert preserved.headers["x-request-id"] == provided_request_id


def test_write_request_with_unexpected_content_type_is_rejected(client: TestClient):
    response = client.post(
        "/auth/login",
        content=b'{"email":"superadmin@example.com","password":"SuperAdmin123!"}',
        headers={"Content-Type": "text/plain"},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "Tipo de contenido no permitido."
    assert response.headers["x-request-id"]


def test_write_request_without_body_is_allowed_by_content_type_guard(client: TestClient):
    response = client.post("/auth/logout")

    assert response.status_code == 200

from fastapi.testclient import TestClient


def _auth_headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_active_school(client: TestClient, suffix: str = "owasp") -> None:
    headers = _auth_headers(client, "superadmin@example.com", "SuperAdmin123!")
    response = client.post(
        "/admin/organizations",
        json={
            "organization_name": f"Colegio {suffix}",
            "organization_email": f"contacto-{suffix}@example.com",
            "organization_phone": "(809) 555-1234",
            "admin_first_name": "Admin",
            "admin_last_name": suffix.title(),
            "admin_email": f"admin-{suffix}@example.com",
            "password": "SchoolAdmin123!",
            "status": "active",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text


def test_cookie_authenticated_write_requires_csrf_token(client: TestClient):
    _create_active_school(client, "csrf-block")
    login = client.post(
        "/auth/login",
        json={"email": "admin-csrf-block@example.com", "password": "SchoolAdmin123!"},
    )
    assert login.status_code == 200, login.text

    response = client.post(
        "/courses",
        json={"name": "Primero", "section": "A", "academic_year": "2026-2027"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Solicitud rechazada por protección CSRF."


def test_cookie_authenticated_write_accepts_valid_csrf_token(client: TestClient):
    _create_active_school(client, "csrf-allow")
    login = client.post(
        "/auth/login",
        json={"email": "admin-csrf-allow@example.com", "password": "SchoolAdmin123!"},
    )
    assert login.status_code == 200, login.text
    csrf_token = client.cookies.get("reysoft_asistencia_csrf_token")
    assert csrf_token

    response = client.post(
        "/courses",
        json={"name": "Primero", "section": "A", "academic_year": "2026-2027"},
        headers={"X-CSRF-Token": csrf_token},
    )

    assert response.status_code == 201, response.text


def test_bearer_authenticated_write_does_not_require_csrf_cookie(client: TestClient):
    _create_active_school(client, "bearer")
    login = client.post(
        "/auth/login",
        json={"email": "admin-bearer@example.com", "password": "SchoolAdmin123!"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    client.cookies.clear()

    response = client.post(
        "/courses",
        json={"name": "Primero", "section": "A", "academic_year": "2026-2027"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201, response.text


def test_oversized_request_body_is_rejected(client: TestClient):
    response = client.post(
        "/auth/login",
        content=b"x" * (10 * 1024 * 1024 + 1),
        headers={"Content-Type": "application/octet-stream"},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "La solicitud excede el tamaño máximo permitido."


def test_unknown_host_header_is_rejected(client: TestClient):
    response = client.get("/health", headers={"Host": "evil.example"})

    assert response.status_code == 400

# ruff: noqa: E402
import re
import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite+pysqlite:///:memory:"
os.environ["DATABASE_URL"] = SQLALCHEMY_DATABASE_URL
os.environ["RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE"] = "10000"
os.environ["RATE_LIMIT_AUTH_REQUESTS_PER_MINUTE"] = "10000"
os.environ["RATE_LIMIT_PARENT_AUTH_REQUESTS_PER_MINUTE"] = "10000"
os.environ["RATE_LIMIT_ATTENDANCE_REQUESTS_PER_MINUTE"] = "10000"
os.environ["RATE_LIMIT_IMPORT_REQUESTS_PER_HOUR"] = "10000"
os.environ["RATE_LIMIT_EXPORT_REQUESTS_PER_HOUR"] = "10000"

from app.core.security import hash_password
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models import User, UserRole


engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def sqlite_regexp(dbapi_connection, _connection_record):
    def regexp(pattern, value):
        if value is None:
            return False
        return re.search(pattern, value) is not None

    dbapi_connection.create_function("REGEXP", 2, regexp)


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        db.add(
            User(
                organization_id=None,
                first_name="Administrador",
                last_name="Global",
                email="superadmin@example.com",
                password_hash=hash_password("SuperAdmin123!"),
                role=UserRole.super_admin,
                is_active=True,
            )
        )
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

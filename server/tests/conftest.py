"""
Pytest configuration and fixtures for server tests
"""
import asyncio
import uuid

import pytest
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.config import settings
from app.core.database import Base, get_db

# Many tests hit the API from the same client IP; the per-IP limit is not under test here.
settings.RATE_LIMIT_ENABLED = False


# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for the test session"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def test_engine():
    """Fresh in-memory database per test, so data never leaks between tests"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a new database session for a test"""
    async_session = sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture(autouse=True)
async def _use_test_database(db_session: AsyncSession):
    """Every request in every test uses the per-test in-memory database, even
    when a test builds its own AsyncClient, so no test can reach a real DB."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Test HTTP client (database already overridden by _use_test_database)"""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client


@pytest.fixture
def make_user(db_session: AsyncSession):
    """Factory: `await make_user(role="facilitator", status="active")` -> persisted User."""
    from app.api.auth import hash_password
    from app.models.models import User
    from app.models.rbac import AccountStatus, UserRole

    async def _make(role: str = UserRole.FACILITATOR, status: str = AccountStatus.ACTIVE, **fields):
        user = User(
            email=fields.pop("email", f"user-{uuid.uuid4().hex[:8]}@test.com"),
            password_hash=hash_password(fields.pop("password", TEST_PASSWORD)),
            full_name=fields.pop("full_name", "Test User"),
            role=role,
            status=status,
            **fields,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    return _make


TEST_PASSWORD = "pass12345"


@pytest.fixture
async def admin_user(make_user):
    return await make_user(role="admin", full_name="Admin User")


@pytest.fixture
async def facilitator_user(make_user):
    return await make_user(role="facilitator", full_name="Facilitator User")


async def _login(client: AsyncClient, user) -> str:
    response = await client.post("/api/auth/login", json={"email": user.email, "password": TEST_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
async def admin_token(client: AsyncClient, admin_user) -> str:
    """Token from a real login as an active admin."""
    return await _login(client, admin_user)


@pytest.fixture
async def facilitator_token(client: AsyncClient, facilitator_user) -> str:
    """Token from a real login as an active facilitator."""
    return await _login(client, facilitator_user)


def auth_headers_for(user) -> dict:
    """Bearer token headers for a persisted user."""
    from app.api.auth import create_access_token
    return {"Authorization": "Bearer " + create_access_token({"sub": user.email, "role": user.role})}


@pytest.fixture
def auth_headers() -> dict:
    """Return headers with test authentication token"""
    return {
        "Authorization": "Bearer test_token",
        "Content-Type": "application/json"
    }


@pytest.fixture
def sample_workshop_data() -> dict:
    """Return sample workshop data for testing"""
    return {
        "name": "Test Workshop",
        "description": "A workshop for testing",
        "facilitator_id": 1,
        "status": "active"
    }


@pytest.fixture
def sample_user_data() -> dict:
    """Return sample user data for testing"""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User"
    }

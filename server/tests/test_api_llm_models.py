"""
Integration tests for LLM Model Config Registry API
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models.models import User
from app.models.rbac import UserRole, AccountStatus
from app.api.auth import hash_password


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    # Use unique email per test to avoid UNIQUE constraint violations in session-scoped DB
    unique_id = str(uuid.uuid4())[:8]
    email = f"llmadmin-{unique_id}@test.com"
    user = User(
        email=email,
        password_hash=hash_password("adminpass123"),
        full_name="LLM Admin",
        role=UserRole.ADMIN,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def facilitator_user(db_session: AsyncSession) -> User:
    # Use unique email per test to avoid UNIQUE constraint violations in session-scoped DB
    unique_id = str(uuid.uuid4())[:8]
    email = f"llmfacilitator-{unique_id}@test.com"
    user = User(
        email=email,
        password_hash=hash_password("facilitatorpass123"),
        full_name="LLM Facilitator",
        role=UserRole.FACILITATOR,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_token(client: AsyncClient, admin_user: User) -> str:
    response = await client.post(
        "/api/auth/login",
        json={"email": admin_user.email, "password": "adminpass123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
async def facilitator_token(client: AsyncClient, facilitator_user: User) -> str:
    response = await client.post(
        "/api/auth/login",
        json={"email": facilitator_user.email, "password": "facilitatorpass123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_create_llm_model_requires_admin(client: AsyncClient, facilitator_token: str):
    response = await client.post(
        "/api/admin/llm-models",
        json={
            "name": "GPT-4 Reasoning",
            "provider": "openai",
            "role": "reasoning",
            "model_name": "gpt-4",
            "api_key": "sk-test-key",
        },
        headers={"Authorization": f"Bearer {facilitator_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_llm_model_as_admin(client: AsyncClient, admin_token: str):
    response = await client.post(
        "/api/admin/llm-models",
        json={
            "name": "GPT-4 Reasoning",
            "provider": "openai",
            "role": "reasoning",
            "model_name": "gpt-4",
            "api_key": "sk-test-key",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "GPT-4 Reasoning"
    assert data["has_api_key"] is True
    assert "api_key" not in data
    assert "encrypted_api_key" not in data


@pytest.mark.asyncio
async def test_list_llm_models_allows_any_authenticated_user(
    client: AsyncClient, admin_token: str, facilitator_token: str
):
    create_response = await client.post(
        "/api/admin/llm-models",
        json={
            "name": "JEV Decision",
            "provider": "typesafe_ai",
            "role": "decision",
            "model_name": "jev-v1",
            "config_json": {"base_url": "https://api.typesafe.example/v1"},
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == 201

    list_response = await client.get(
        "/api/admin/llm-models",
        headers={"Authorization": f"Bearer {facilitator_token}"},
    )
    assert list_response.status_code == 200
    names = [m["name"] for m in list_response.json()]
    assert "JEV Decision" in names


@pytest.mark.asyncio
async def test_update_llm_model_keeps_existing_key_when_not_provided(
    client: AsyncClient, admin_token: str
):
    create_response = await client.post(
        "/api/admin/llm-models",
        json={
            "name": "Claude Reasoning",
            "provider": "anthropic",
            "role": "reasoning",
            "model_name": "claude-3-5-sonnet-20241022",
            "api_key": "sk-ant-test",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    model_id = create_response.json()["id"]

    update_response = await client.put(
        f"/api/admin/llm-models/{model_id}",
        json={"name": "Claude Reasoning (renamed)"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["name"] == "Claude Reasoning (renamed)"
    assert data["has_api_key"] is True


@pytest.mark.asyncio
async def test_delete_llm_model_requires_admin(
    client: AsyncClient, admin_token: str, facilitator_token: str
):
    create_response = await client.post(
        "/api/admin/llm-models",
        json={
            "name": "To Delete",
            "provider": "openai",
            "role": "embedding",
            "model_name": "text-embedding-3-small",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    model_id = create_response.json()["id"]

    forbidden_response = await client.delete(
        f"/api/admin/llm-models/{model_id}",
        headers={"Authorization": f"Bearer {facilitator_token}"},
    )
    assert forbidden_response.status_code == 403

    ok_response = await client.delete(
        f"/api/admin/llm-models/{model_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert ok_response.status_code == 204

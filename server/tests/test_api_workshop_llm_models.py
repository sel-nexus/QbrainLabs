"""
Integration tests for per-workshop LLM model selection
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from app.models.models import User
from app.models.rbac import UserRole, AccountStatus
from app.api.auth import hash_password


@pytest.fixture
async def admin_user(db_session: AsyncSession, request) -> User:
    # Generate unique email per test to avoid constraint violations
    unique_suffix = str(uuid4())[:8]
    email = f"wsllmadmin_{unique_suffix}@test.com"

    user = User(
        email=email,
        password_hash=hash_password("adminpass123"),
        full_name="Workshop LLM Admin",
        role=UserRole.ADMIN,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Store the email on the request node so admin_token can use it
    request.node.admin_email = email

    return user


@pytest.fixture
async def admin_token(client: AsyncClient, admin_user: User, request) -> str:
    email = request.node.admin_email
    response = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "adminpass123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
async def workshop_id(client: AsyncClient, admin_token: str) -> str:
    response = await client.post(
        "/api/workshops/",
        json={
            "title": "LLM Selection Test Workshop",
            "config": {
                "criteria": [
                    {"name": "Feasibility", "weight": 50},
                    {"name": "Business Value", "weight": 50},
                ]
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.fixture
async def reasoning_model_id(client: AsyncClient, admin_token: str) -> str:
    response = await client.post(
        "/api/admin/llm-models",
        json={
            "name": "GPT-4 Reasoning",
            "provider": "openai",
            "role": "reasoning",
            "model_name": "gpt-4",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    return response.json()["id"]


@pytest.fixture
async def decision_model_id(client: AsyncClient, admin_token: str) -> str:
    response = await client.post(
        "/api/admin/llm-models",
        json={
            "name": "JEV Decision",
            "provider": "typesafe_ai",
            "role": "decision",
            "model_name": "jev-v1",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    return response.json()["id"]


@pytest.mark.asyncio
async def test_get_workshop_llm_models_defaults_to_none(
    client: AsyncClient, admin_token: str, workshop_id: str
):
    response = await client.get(
        f"/api/workshops/{workshop_id}/llm-models",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["embedding_model_id"] is None
    assert data["decision_model_id"] is None
    assert data["reasoning_model_id"] is None


@pytest.mark.asyncio
async def test_set_workshop_llm_models(
    client: AsyncClient,
    admin_token: str,
    workshop_id: str,
    reasoning_model_id: str,
    decision_model_id: str,
):
    response = await client.put(
        f"/api/workshops/{workshop_id}/llm-models",
        json={
            "reasoning_model_id": reasoning_model_id,
            "decision_model_id": decision_model_id,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["reasoning_model_id"] == reasoning_model_id
    assert data["decision_model_id"] == decision_model_id
    assert data["embedding_model_id"] is None

    get_response = await client.get(
        f"/api/workshops/{workshop_id}/llm-models",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert get_response.json()["reasoning_model_id"] == reasoning_model_id


@pytest.mark.asyncio
async def test_set_workshop_llm_models_rejects_role_mismatch(
    client: AsyncClient,
    admin_token: str,
    workshop_id: str,
    decision_model_id: str,
):
    response = await client.put(
        f"/api/workshops/{workshop_id}/llm-models",
        json={"reasoning_model_id": decision_model_id},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_set_workshop_llm_models_rejects_inactive_model(
    client: AsyncClient,
    admin_token: str,
    workshop_id: str,
    reasoning_model_id: str,
):
    deactivate_response = await client.put(
        f"/api/admin/llm-models/{reasoning_model_id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert deactivate_response.status_code == 200

    response = await client.put(
        f"/api/workshops/{workshop_id}/llm-models",
        json={"reasoning_model_id": reasoning_model_id},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400

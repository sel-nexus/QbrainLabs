"""
Tests that rag_service methods resolve and use a workshop's selected model
when one is set, and fall back to the global default otherwise.
"""
import uuid

import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import User, Workshop
from app.models.llm_model import LLMModelConfig
from app.models.rbac import UserRole, AccountStatus
from app.api.auth import hash_password
from app.core.crypto import encrypt_secret
from app.services.rag_service import RAGService


async def _make_user(db_session: AsyncSession) -> User:
    user = User(
        email=f"rag-wiring-test-{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password("pass12345"),
        full_name="RAG Wiring Test",
        role=UserRole.ADMIN,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _make_workshop_with_reasoning_model(db_session: AsyncSession, user: User) -> tuple:
    model_config = LLMModelConfig(
        name="Test Reasoning Model",
        provider="openai",
        role="reasoning",
        model_name="gpt-4-turbo-test",
        config_json={},
        encrypted_api_key=encrypt_secret("sk-test-fake-key"),
        is_active=True,
        created_by=user.id,
    )
    db_session.add(model_config)
    await db_session.commit()
    await db_session.refresh(model_config)

    workshop = Workshop(
        title="RAG Wiring Test Workshop",
        facilitator_id=user.id,
        pin=uuid.uuid4().hex[:6].upper(),
        config={"criteria": [], "reasoning_model_id": str(model_config.id)},
    )
    db_session.add(workshop)
    await db_session.commit()
    await db_session.refresh(workshop)
    return workshop, model_config


class _FakeResponse:
    def __init__(self, content: str):
        self.content = content


def _make_service() -> RAGService:
    service = RAGService.__new__(RAGService)
    service.mock_mode = False
    service.vector_store = None
    service.llm = AsyncMock()
    service.llm.ainvoke = AsyncMock(return_value=_FakeResponse('{"title": "t", "description": "d", "solution": "s", "kpi": "k"}'))
    service.reference_data = []
    return service


@pytest.mark.asyncio
async def test_enhance_use_case_uses_workshop_model_when_set(db_session: AsyncSession):
    user = await _make_user(db_session)
    workshop, model_config = await _make_workshop_with_reasoning_model(db_session, user)
    service = _make_service()

    with patch("app.services.rag_service.track_llm_usage", new=AsyncMock()) as mock_track:
        with patch("langchain_openai.ChatOpenAI.ainvoke", new=AsyncMock(return_value=_FakeResponse('{"title": "t2", "description": "d2", "solution": "s2", "kpi": "k2"}'))):
            result = await service.enhance_use_case(
                "some input text", workshop_id=str(workshop.id), db=db_session
            )

    assert result["title"] == "t2"
    # The global-default self.llm must NOT have been called - the resolved model was used instead
    service.llm.ainvoke.assert_not_called()
    mock_track.assert_called_once()
    assert mock_track.call_args.kwargs["model_name"] == "gpt-4-turbo-test"


@pytest.mark.asyncio
async def test_enhance_use_case_falls_back_when_no_workshop_id(db_session: AsyncSession):
    service = _make_service()

    with patch("app.services.rag_service.track_llm_usage", new=AsyncMock()) as mock_track:
        result = await service.enhance_use_case("some input text")

    assert result["title"] == "t"
    service.llm.ainvoke.assert_called_once()
    mock_track.assert_called_once()

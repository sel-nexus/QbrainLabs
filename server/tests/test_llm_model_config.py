import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm_model import LLMModelConfig, LLMProvider, LLMRole
from app.models.models import User
from app.models.rbac import UserRole, AccountStatus
from app.api.auth import hash_password
from app.core.crypto import decrypt_secret, encrypt_secret


@pytest.mark.asyncio
async def test_create_llm_model_config(db_session: AsyncSession):
    user = User(
        email="creator@test.com",
        password_hash=hash_password("pass12345"),
        full_name="Creator",
        role=UserRole.ADMIN,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    config = LLMModelConfig(
        name="GPT-4 Reasoning",
        provider=LLMProvider.OPENAI.value,
        role=LLMRole.REASONING.value,
        model_name="gpt-4",
        config_json={},
        encrypted_api_key=encrypt_secret("sk-test-key"),
        is_active=True,
        created_by=user.id,
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    assert config.id is not None
    assert config.provider == "openai"
    assert config.role == "reasoning"
    assert config.is_active is True
    assert decrypt_secret(config.encrypted_api_key) == "sk-test-key"

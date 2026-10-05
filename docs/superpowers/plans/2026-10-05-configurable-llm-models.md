# Configurable LLM Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins maintain a registry of LLM configs (OpenAI, Azure OpenAI, Anthropic, Typesafe AI) tagged by role (embedding/decision/reasoning), and let facilitators pick which registered models apply to a given workshop.

**Architecture:** A new `llm_model_configs` table (admin-managed registry, API keys encrypted at rest) plus three new optional fields on the existing `Workshop.config` JSON blob (`embedding_model_id`/`decision_model_id`/`reasoning_model_id`) for per-workshop selection. New admin CRUD API + admin UI page for the registry; new workshop-scoped GET/PUT API + a new section in the existing `WorkshopSettingsModal.tsx` for selection. This is Phase 1 only — the existing AI services (`rag_service`, `copilot_service`, `roadmap_service`) are **not** touched; they keep using the global `OPENAI_MODEL` setting. Wiring them to actually consume a workshop's selection is a separate, later plan.

**Tech Stack:** FastAPI + SQLAlchemy (async) + Pydantic v2 (backend), React + TypeScript + Vite (frontend), `cryptography` (Fernet, already pinned) for API-key encryption.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-05-configurable-llm-models-design.md`. This plan implements it in full except where noted below.
- Three roles only: `embedding`, `decision`, `reasoning`. Four providers only: `openai`, `azure_openai`, `anthropic`, `typesafe_ai`.
- API keys are write-only: never returned in any response (not even encrypted). Responses expose only `has_api_key: bool`.
- **Deviation from the spec, decided during detailed design:** the spec said the whole registry API is admin-only. `WorkshopSettingsModal.tsx` is reachable by any authenticated workshop owner (not just admins — `WorkshopDetail.tsx`'s route is not `requireAdmin`-gated), and that modal needs to populate its three model dropdowns from the registry. Splitting the auth: `GET /api/admin/llm-models` (list) now requires only `get_current_user` (any authenticated user) so any facilitator can see available options to assign to their workshop. `POST`/`PUT`/`DELETE` remain `require_admin`-gated — only admins can create, edit, or delete registry entries. This is a precision fix to the spec's blanket statement, not a scope change.
- Deleting a registry entry does not block on workshops referencing it (no DB-level FK constraint from `Workshop.config`'s JSON-embedded ids) — a dangling reference simply resolves to "no model assigned" the next time it's read.
- Follow existing file-per-domain convention for models (`app/models/settings.py`, `app/models/rbac.py` style) and router-per-domain convention for APIs (`router = APIRouter(prefix="/api/admin/llm-models", ...)`, mounted via `app.include_router(x.router, tags=[...])` with no additional prefix — see `app/api/settings.py:20` and `app/main.py:120,126`).
- Follow the existing custom-migration convention (`server/migrations/*.py`, discovered and run by `init_db.py`'s `run_migrations()`) — this project does not use Alembic for this despite `alembic.ini` existing; match the pattern in `server/migrations/us34_challenge_cards.py` exactly (raw SQL `CREATE TABLE IF NOT EXISTS`, `VARCHAR(36)` ids, a `run_migration()` entrypoint).

---

### Task 1: Encryption helper + LLM model registry data model + migration

**Files:**
- Create: `server/app/core/crypto.py`
- Create: `server/app/models/llm_model.py`
- Modify: `server/app/models/__init__.py` (add the new model's exports)
- Create: `server/migrations/us46_llm_model_configs.py`
- Test: `server/tests/test_crypto.py`
- Test: `server/tests/test_llm_model_config.py`

**Interfaces:**
- Produces: `encrypt_secret(plaintext: str) -> str`, `decrypt_secret(ciphertext: str) -> str` from `app.core.crypto` — consumed by Task 2.
- Produces: `LLMModelConfig` (SQLAlchemy model), `LLMProvider` (str enum: `OPENAI="openai"`, `AZURE_OPENAI="azure_openai"`, `ANTHROPIC="anthropic"`, `TYPESAFE_AI="typesafe_ai"`), `LLMRole` (str enum: `EMBEDDING="embedding"`, `DECISION="decision"`, `REASONING="reasoning"`) from `app.models.llm_model` — consumed by Tasks 2 and 3.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/test_crypto.py`:

```python
from app.core.crypto import encrypt_secret, decrypt_secret


def test_encrypt_decrypt_round_trip():
    plaintext = "sk-test-12345"
    ciphertext = encrypt_secret(plaintext)
    assert ciphertext != plaintext
    assert decrypt_secret(ciphertext) == plaintext


def test_different_plaintexts_produce_different_ciphertexts():
    assert encrypt_secret("secret-a") != encrypt_secret("secret-b")
```

Create `server/tests/test_llm_model_config.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && python -m pytest tests/test_crypto.py tests/test_llm_model_config.py -v`
Expected: both files FAIL to collect with `ModuleNotFoundError: No module named 'app.core.crypto'` (and `app.models.llm_model`).

- [ ] **Step 3: Write `server/app/core/crypto.py`**

```python
"""Symmetric encryption for secrets stored at rest (e.g. LLM provider API keys)."""
import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _get_fernet() -> Fernet:
    key_bytes = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a plaintext secret for storage in a Text column."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    """Decrypt a secret previously produced by encrypt_secret."""
    return _get_fernet().decrypt(ciphertext.encode()).decode()
```

- [ ] **Step 4: Write `server/app/models/llm_model.py`**

```python
"""
LLM Model Configuration Registry
Admin-managed registry of LLM provider configs, tagged by role
(embedding / decision / reasoning), selectable per workshop.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.models import GUID, JSONType


class LLMProvider(str, enum.Enum):
    OPENAI = "openai"
    AZURE_OPENAI = "azure_openai"
    ANTHROPIC = "anthropic"
    TYPESAFE_AI = "typesafe_ai"


class LLMRole(str, enum.Enum):
    EMBEDDING = "embedding"
    DECISION = "decision"
    REASONING = "reasoning"


class LLMModelConfig(Base):
    __tablename__ = "llm_model_configs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    provider = Column(String(50), nullable=False)
    role = Column(String(50), nullable=False)
    model_name = Column(String(200), nullable=False)
    config_json = Column(JSONType, default={})
    encrypted_api_key = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by])
```

- [ ] **Step 5: Register the new model in `server/app/models/__init__.py`**

Add this block at the end of the file (after the existing `from .llm_usage import (LLMUsageLog)` block):

```python
from .llm_model import (
    LLMModelConfig,
    LLMProvider,
    LLMRole
)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && python -m pytest tests/test_crypto.py tests/test_llm_model_config.py -v`
Expected: PASS (3 tests).

- [ ] **Step 7: Write the migration (for real Postgres databases — the test suite uses `Base.metadata.create_all` directly and doesn't need this)**

Create `server/migrations/us46_llm_model_configs.py`:

```python
"""
US46: Configurable LLM Models Migration

Creates table for the LLM model registry:
- llm_model_configs - Admin-managed LLM provider configs, tagged by role

Supports PostgreSQL (production).
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import engine


async def create_llm_model_configs_table():
    """Create llm_model_configs table."""

    async with engine.begin() as conn:
        print("Creating llm_model_configs table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS llm_model_configs (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                provider VARCHAR(50) NOT NULL,
                role VARCHAR(50) NOT NULL,
                model_name VARCHAR(200) NOT NULL,
                config_json JSONB NOT NULL DEFAULT '{}',
                encrypted_api_key TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_by VARCHAR(36) NOT NULL REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),

                CONSTRAINT llm_model_configs_provider_check
                    CHECK (provider IN ('openai', 'azure_openai', 'anthropic', 'typesafe_ai')),
                CONSTRAINT llm_model_configs_role_check
                    CHECK (role IN ('embedding', 'decision', 'reasoning'))
            );
        """))

        indexes = [
            "CREATE INDEX IF NOT EXISTS ix_llm_model_configs_role ON llm_model_configs(role);",
            "CREATE INDEX IF NOT EXISTS ix_llm_model_configs_created_by ON llm_model_configs(created_by);",
        ]
        for idx in indexes:
            try:
                await conn.execute(text(idx))
            except Exception as e:
                print(f"  Note: {e}")

        await conn.execute(text("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """))

        await conn.execute(text("DROP TRIGGER IF EXISTS update_llm_model_configs_updated_at ON llm_model_configs;"))
        await conn.execute(text("""
            CREATE TRIGGER update_llm_model_configs_updated_at
                BEFORE UPDATE ON llm_model_configs
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        """))

        await conn.commit()
    print("✅ llm_model_configs table created")


async def run_migration():
    """Run the full migration."""
    print("=" * 60)
    print("US46: Configurable LLM Models Migration")
    print("=" * 60)

    try:
        await create_llm_model_configs_table()

        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(run_migration())
```

- [ ] **Step 8: Commit**

```bash
git add server/app/core/crypto.py server/app/models/llm_model.py server/app/models/__init__.py server/migrations/us46_llm_model_configs.py server/tests/test_crypto.py server/tests/test_llm_model_config.py
git commit -m "feat: add LLM model config registry data model and encryption helper"
```

---

### Task 2: Admin CRUD API for the LLM model registry

**Files:**
- Create: `server/app/schemas/llm_model.py`
- Create: `server/app/api/llm_models.py`
- Modify: `server/app/main.py:120` (add `llm_models` to the import list), `server/app/main.py:126` (add router registration)
- Test: `server/tests/test_api_llm_models.py`

**Interfaces:**
- Consumes: `encrypt_secret` from `app.core.crypto` (Task 1); `LLMModelConfig`, `LLMProvider`, `LLMRole` from `app.models.llm_model` (Task 1).
- Produces: `LLMModelConfigCreate`, `LLMModelConfigUpdate`, `LLMModelConfigResponse` from `app.schemas.llm_model` — consumed by Task 3 is not needed, but the `router` mounted at `/api/admin/llm-models` is the contract the Task 4 admin UI calls against: `GET/POST ""`, `PUT/DELETE "/{model_id}"`.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/test_api_llm_models.py`:

```python
"""
Integration tests for LLM Model Config Registry API
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import User
from app.models.rbac import UserRole, AccountStatus
from app.api.auth import hash_password


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="llmadmin@test.com",
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
    user = User(
        email="llmfacilitator@test.com",
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
        json={"email": "llmadmin@test.com", "password": "adminpass123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
async def facilitator_token(client: AsyncClient, facilitator_user: User) -> str:
    response = await client.post(
        "/api/auth/login",
        json={"email": "llmfacilitator@test.com", "password": "facilitatorpass123"},
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && python -m pytest tests/test_api_llm_models.py -v`
Expected: FAIL — `404 Not Found` on every request (no routes registered yet) or `ModuleNotFoundError` for `app.schemas.llm_model`.

- [ ] **Step 3: Write `server/app/schemas/llm_model.py`**

```python
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.llm_model import LLMProvider, LLMRole


class LLMModelConfigCreate(BaseModel):
    name: str
    provider: LLMProvider
    role: LLMRole
    model_name: str
    config_json: dict = {}
    api_key: Optional[str] = None
    is_active: bool = True


class LLMModelConfigUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[LLMProvider] = None
    role: Optional[LLMRole] = None
    model_name: Optional[str] = None
    config_json: Optional[dict] = None
    api_key: Optional[str] = None
    is_active: Optional[bool] = None


class LLMModelConfigResponse(BaseModel):
    id: UUID
    name: str
    provider: LLMProvider
    role: LLMRole
    model_name: str
    config_json: dict
    has_api_key: bool
    is_active: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 4: Write `server/app/api/llm_models.py`**

```python
"""
LLM Model Configuration Registry API
Admin-managed registry of LLM provider configs (embedding / decision /
reasoning roles), selectable per workshop.
"""
from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.crypto import encrypt_secret
from app.middleware.admin_auth import require_admin
from app.api.auth import get_current_user
from app.models import User
from app.models.llm_model import LLMModelConfig
from app.schemas.llm_model import (
    LLMModelConfigCreate,
    LLMModelConfigUpdate,
    LLMModelConfigResponse,
)

router = APIRouter(prefix="/api/admin/llm-models", tags=["admin-llm-models"])


def _to_response(config: LLMModelConfig) -> LLMModelConfigResponse:
    return LLMModelConfigResponse(
        id=config.id,
        name=config.name,
        provider=config.provider,
        role=config.role,
        model_name=config.model_name,
        config_json=config.config_json or {},
        has_api_key=bool(config.encrypted_api_key),
        is_active=config.is_active,
        created_by=config.created_by,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.get("", response_model=List[LLMModelConfigResponse])
async def list_llm_models(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all LLM model configs. Any authenticated user may list (read-only) so
    facilitators can see available options when assigning models to a workshop."""
    result = await db.execute(select(LLMModelConfig).order_by(LLMModelConfig.name))
    return [_to_response(c) for c in result.scalars().all()]


@router.post("", response_model=LLMModelConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_llm_model(
    payload: LLMModelConfigCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    config = LLMModelConfig(
        name=payload.name,
        provider=payload.provider.value,
        role=payload.role.value,
        model_name=payload.model_name,
        config_json=payload.config_json,
        encrypted_api_key=encrypt_secret(payload.api_key) if payload.api_key else None,
        is_active=payload.is_active,
        created_by=admin.id,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return _to_response(config)


@router.put("/{model_id}", response_model=LLMModelConfigResponse)
async def update_llm_model(
    model_id: UUID,
    payload: LLMModelConfigUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LLMModelConfig).where(LLMModelConfig.id == model_id))
    config = result.scalars().first()
    if not config:
        raise HTTPException(status_code=404, detail="LLM model config not found")

    if payload.name is not None:
        config.name = payload.name
    if payload.provider is not None:
        config.provider = payload.provider.value
    if payload.role is not None:
        config.role = payload.role.value
    if payload.model_name is not None:
        config.model_name = payload.model_name
    if payload.config_json is not None:
        config.config_json = payload.config_json
    if payload.api_key is not None:
        config.encrypted_api_key = encrypt_secret(payload.api_key)
    if payload.is_active is not None:
        config.is_active = payload.is_active

    await db.commit()
    await db.refresh(config)
    return _to_response(config)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_llm_model(
    model_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LLMModelConfig).where(LLMModelConfig.id == model_id))
    config = result.scalars().first()
    if not config:
        raise HTTPException(status_code=404, detail="LLM model config not found")
    await db.delete(config)
    await db.commit()
```

- [ ] **Step 5: Register the router in `server/app/main.py`**

Change line 120 from:

```python
from app.api import ai, auth, admin, knowledge_base, surveys, participant_auth, analytics, export, organizations, marketplace, errors, facilitators, members, settings, subscription, rag_admin
```

to:

```python
from app.api import ai, auth, admin, knowledge_base, surveys, participant_auth, analytics, export, organizations, marketplace, errors, facilitators, members, settings, subscription, rag_admin, llm_models
```

Then find line 126 (`app.include_router(settings.router, tags=["admin-settings"])`) and add immediately after it:

```python
app.include_router(llm_models.router, tags=["admin-llm-models"])
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && python -m pytest tests/test_api_llm_models.py -v`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add server/app/schemas/llm_model.py server/app/api/llm_models.py server/app/main.py server/tests/test_api_llm_models.py
git commit -m "feat: add admin CRUD API for LLM model config registry"
```

---

### Task 3: Per-workshop LLM model selection

**Files:**
- Modify: `server/app/schemas/workshop.py` (extend `WorkshopConfig`)
- Modify: `server/app/schemas/workshop_actions.py` (add two new schemas)
- Modify: `server/app/api/workshops.py` (add two endpoints + imports)
- Test: `server/tests/test_api_workshop_llm_models.py`

**Interfaces:**
- Consumes: `LLMModelConfig`, `LLMRole` from `app.models.llm_model` (Task 1).
- Produces: `WorkshopLLMModelsUpdate`, `WorkshopLLMModelsResponse` from `app.schemas.workshop_actions` — consumed by Task 5 (frontend calls `GET/PUT /api/workshops/{id}/llm-models` directly; these schemas just define that contract).

- [ ] **Step 1: Write the failing tests**

Create `server/tests/test_api_workshop_llm_models.py`:

```python
"""
Integration tests for per-workshop LLM model selection
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import User
from app.models.rbac import UserRole, AccountStatus
from app.api.auth import hash_password


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="wsllmadmin@test.com",
        password_hash=hash_password("adminpass123"),
        full_name="Workshop LLM Admin",
        role=UserRole.ADMIN,
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
        json={"email": "wsllmadmin@test.com", "password": "adminpass123"},
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && python -m pytest tests/test_api_workshop_llm_models.py -v`
Expected: FAIL — `404 Not Found` on the `/llm-models` workshop endpoints (not yet defined).

- [ ] **Step 3: Extend `WorkshopConfig` in `server/app/schemas/workshop.py`**

Change:

```python
class WorkshopConfig(BaseModel):
    criteria: List[Criterion]
    template_id: Optional[str] = None
```

to:

```python
class WorkshopConfig(BaseModel):
    criteria: List[Criterion]
    template_id: Optional[str] = None
    embedding_model_id: Optional[UUID] = None
    decision_model_id: Optional[UUID] = None
    reasoning_model_id: Optional[UUID] = None
```

(`UUID` is already imported in this file — `WorkshopResponse.id: UUID` uses it.)

- [ ] **Step 4: Add the action schemas to `server/app/schemas/workshop_actions.py`**

Append to the end of the file:

```python
class WorkshopLLMModelsUpdate(BaseModel):
    embedding_model_id: Optional[UUID] = None
    decision_model_id: Optional[UUID] = None
    reasoning_model_id: Optional[UUID] = None

class WorkshopLLMModelsResponse(BaseModel):
    embedding_model_id: Optional[UUID] = None
    decision_model_id: Optional[UUID] = None
    reasoning_model_id: Optional[UUID] = None
```

- [ ] **Step 5: Add the two endpoints to `server/app/api/workshops.py`**

Add these imports near the top of the file, after the existing `from app.schemas.workshop import ...` line:

```python
from app.models.llm_model import LLMModelConfig, LLMRole
from app.schemas.workshop_actions import WorkshopLLMModelsUpdate, WorkshopLLMModelsResponse
```

Append to the end of the file:

```python
_LLM_SLOT_ROLES = {
    "embedding_model_id": LLMRole.EMBEDDING.value,
    "decision_model_id": LLMRole.DECISION.value,
    "reasoning_model_id": LLMRole.REASONING.value,
}


@router.get("/{workshop_id}/llm-models", response_model=WorkshopLLMModelsResponse)
async def get_workshop_llm_models(
    workshop_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get this workshop's selected embedding/decision/reasoning models, if any."""
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")

    config = workshop.config or {}
    return WorkshopLLMModelsResponse(
        embedding_model_id=config.get("embedding_model_id"),
        decision_model_id=config.get("decision_model_id"),
        reasoning_model_id=config.get("reasoning_model_id"),
    )


@router.put("/{workshop_id}/llm-models", response_model=WorkshopLLMModelsResponse)
async def set_workshop_llm_models(
    workshop_id: str,
    payload: WorkshopLLMModelsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set this workshop's embedding/decision/reasoning model selection.
    Requires authentication only (facilitator only), matching the existing
    phase/active_card endpoints in this file."""
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")

    selections = {
        "embedding_model_id": payload.embedding_model_id,
        "decision_model_id": payload.decision_model_id,
        "reasoning_model_id": payload.reasoning_model_id,
    }

    for slot, model_id in selections.items():
        if model_id is None:
            continue
        expected_role = _LLM_SLOT_ROLES[slot]
        model_result = await db.execute(
            select(LLMModelConfig).where(LLMModelConfig.id == model_id)
        )
        model_config = model_result.scalars().first()
        if not model_config:
            raise HTTPException(status_code=404, detail=f"LLM model config not found for {slot}")
        if not model_config.is_active:
            raise HTTPException(status_code=400, detail=f"LLM model config for {slot} is not active")
        if model_config.role != expected_role:
            raise HTTPException(
                status_code=400,
                detail=f"LLM model config for {slot} has role '{model_config.role}', expected '{expected_role}'",
            )

    new_config = dict(workshop.config or {})
    for slot, model_id in selections.items():
        new_config[slot] = str(model_id) if model_id else None
    workshop.config = new_config

    await db.commit()
    await db.refresh(workshop)

    return WorkshopLLMModelsResponse(
        embedding_model_id=selections["embedding_model_id"],
        decision_model_id=selections["decision_model_id"],
        reasoning_model_id=selections["reasoning_model_id"],
    )
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && python -m pytest tests/test_api_workshop_llm_models.py -v`
Expected: PASS (4 tests).

- [ ] **Step 7: Run the full backend test suite for this feature area to check nothing broke**

Run: `cd server && python -m pytest tests/test_crypto.py tests/test_llm_model_config.py tests/test_api_llm_models.py tests/test_api_workshop_llm_models.py tests/test_api_workshops.py -v`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add server/app/schemas/workshop.py server/app/schemas/workshop_actions.py server/app/api/workshops.py server/tests/test_api_workshop_llm_models.py
git commit -m "feat: add per-workshop LLM model selection API"
```

---

### Task 4: Admin UI — LLM Models registry page

**Files:**
- Create: `client/src/pages/AdminLLMModels.tsx`
- Modify: `client/src/components/AdminLayout.tsx` (add nav item + icon import)
- Modify: `client/src/App.tsx` (add route + import)
- Test: `client/src/test/AdminLLMModels.test.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/admin/llm-models`, `PUT/DELETE /api/admin/llm-models/{id}` (Task 2). Response shape: `{id, name, provider, role, model_name, config_json, has_api_key, is_active, created_by, created_at, updated_at}`.

- [ ] **Step 1: Write the failing test**

Create `client/src/test/AdminLLMModels.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { AdminLLMModels } from '../pages/AdminLLMModels';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

global.fetch = vi.fn();

const mockModels = [
    {
        id: 'model-1',
        name: 'GPT-4 Reasoning',
        provider: 'openai',
        role: 'reasoning',
        model_name: 'gpt-4',
        config_json: {},
        has_api_key: true,
        is_active: true,
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
];

describe('AdminLLMModels', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('hm_auth_token', 'test-token');
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockModels,
        });
    });

    it('should display the list of configured models', async () => {
        render(<AdminLLMModels />);
        await waitFor(() => {
            expect(screen.getByText('GPT-4 Reasoning')).toBeInTheDocument();
        });
        expect(screen.getByText('openai')).toBeInTheDocument();
        expect(screen.getByText('reasoning')).toBeInTheDocument();
    });

    it('should submit a new model config', async () => {
        render(<AdminLLMModels />);
        await waitFor(() => {
            expect(screen.getByText('GPT-4 Reasoning')).toBeInTheDocument();
        });

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ...mockModels[0], id: 'model-2', name: 'New Model' }),
        });

        fireEvent.click(screen.getByRole('button', { name: /add model/i }));
        fireEvent.change(screen.getByPlaceholderText(/e.g. gpt-4 reasoning/i), {
            target: { value: 'New Model' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e.g. gpt-4/i), {
            target: { value: 'gpt-4' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalled();
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/test/AdminLLMModels.test.tsx`
Expected: FAIL — `Cannot find module '../pages/AdminLLMModels'`.

- [ ] **Step 3: Write `client/src/pages/AdminLLMModels.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/config';

const API_BASE = API_BASE_URL;
const TOKEN_KEY = 'hm_auth_token';

type LLMProvider = 'openai' | 'azure_openai' | 'anthropic' | 'typesafe_ai';
type LLMRole = 'embedding' | 'decision' | 'reasoning';

interface LLMModelConfig {
    id: string;
    name: string;
    provider: LLMProvider;
    role: LLMRole;
    model_name: string;
    config_json: Record<string, string>;
    has_api_key: boolean;
    is_active: boolean;
}

interface FormState {
    id: string | null;
    name: string;
    provider: LLMProvider;
    role: LLMRole;
    model_name: string;
    api_key: string;
    endpoint: string;
    deployment: string;
    api_version: string;
    base_url: string;
    is_active: boolean;
}

const EMPTY_FORM: FormState = {
    id: null,
    name: '',
    provider: 'openai',
    role: 'reasoning',
    model_name: '',
    api_key: '',
    endpoint: '',
    deployment: '',
    api_version: '',
    base_url: '',
    is_active: true,
};

export function AdminLLMModels() {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [models, setModels] = useState<LLMModelConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const authHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        'Content-Type': 'application/json',
    });

    const fetchModels = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/api/admin/llm-models`, {
                headers: authHeaders(),
            });
            if (!response.ok) throw new Error('Failed to fetch LLM models');
            setModels(await response.json());
        } catch (error) {
            console.error(error);
            toast.error('Failed to load LLM models');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const openCreateForm = () => {
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEditForm = (model: LLMModelConfig) => {
        setForm({
            id: model.id,
            name: model.name,
            provider: model.provider,
            role: model.role,
            model_name: model.model_name,
            api_key: '',
            endpoint: model.config_json?.endpoint || '',
            deployment: model.config_json?.deployment || '',
            api_version: model.config_json?.api_version || '',
            base_url: model.config_json?.base_url || '',
            is_active: model.is_active,
        });
        setShowForm(true);
    };

    const buildConfigJson = (f: FormState): Record<string, string> => {
        if (f.provider === 'azure_openai') {
            return { endpoint: f.endpoint, deployment: f.deployment, api_version: f.api_version };
        }
        if (f.provider === 'typesafe_ai') {
            return { base_url: f.base_url };
        }
        return {};
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body: Record<string, unknown> = {
                name: form.name,
                provider: form.provider,
                role: form.role,
                model_name: form.model_name,
                config_json: buildConfigJson(form),
                is_active: form.is_active,
            };
            if (form.api_key) {
                body.api_key = form.api_key;
            }

            const url = form.id
                ? `${API_BASE}/api/admin/llm-models/${form.id}`
                : `${API_BASE}/api/admin/llm-models`;
            const method = form.id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.detail || 'Failed to save LLM model');
            }

            toast.success(form.id ? 'Model updated' : 'Model created');
            setShowForm(false);
            fetchModels();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save LLM model');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this LLM model config? Workshops using it will fall back to no model selected.')) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/api/admin/llm-models/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            if (!response.ok) throw new Error('Failed to delete LLM model');
            toast.success('Model deleted');
            fetchModels();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete LLM model');
        }
    };

    return (
        <AdminLayout title="LLM Models">
            <div className="flex justify-end mb-6">
                <button
                    onClick={openCreateForm}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-violet text-white hover:bg-brand-violet/90"
                >
                    <Plus className="w-4 h-4" /> Add Model
                </button>
            </div>

            {loading ? (
                <p className="contrast-muted">Loading...</p>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className={`text-left border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                            <th className="py-2">Name</th>
                            <th className="py-2">Provider</th>
                            <th className="py-2">Role</th>
                            <th className="py-2">Model Name</th>
                            <th className="py-2">Active</th>
                            <th className="py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {models.map((model) => (
                            <tr key={model.id} className={`border-b ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                                <td className="py-2">{model.name}</td>
                                <td className="py-2">{model.provider}</td>
                                <td className="py-2">{model.role}</td>
                                <td className="py-2">{model.model_name}</td>
                                <td className="py-2">{model.is_active ? 'Yes' : 'No'}</td>
                                <td className="py-2 flex gap-2">
                                    <button onClick={() => openEditForm(model)} aria-label="Edit">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(model.id)} aria-label="Delete">
                                        <Trash2 className="w-4 h-4 text-semantic-danger" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <form
                        onSubmit={handleSubmit}
                        className={`w-full max-w-md rounded-xl p-6 space-y-4 ${isLight ? 'bg-white' : 'bg-surface-800'}`}
                    >
                        <h2 className="text-lg font-bold">{form.id ? 'Edit Model' : 'Add Model'}</h2>

                        <div>
                            <label className="block text-sm mb-1">Name</label>
                            <input
                                className="w-full px-3 py-2 rounded border"
                                placeholder="e.g. GPT-4 Reasoning"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Provider</label>
                            <select
                                className="w-full px-3 py-2 rounded border"
                                value={form.provider}
                                onChange={(e) => setForm({ ...form, provider: e.target.value as LLMProvider })}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="azure_openai">Azure OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="typesafe_ai">Typesafe AI</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Role</label>
                            <select
                                className="w-full px-3 py-2 rounded border"
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value as LLMRole })}
                            >
                                <option value="embedding">Embedding</option>
                                <option value="decision">Decision</option>
                                <option value="reasoning">Reasoning</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Model Name</label>
                            <input
                                className="w-full px-3 py-2 rounded border"
                                placeholder="e.g. gpt-4"
                                value={form.model_name}
                                onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                                required
                            />
                        </div>

                        {form.provider === 'azure_openai' && (
                            <>
                                <div>
                                    <label className="block text-sm mb-1">Endpoint</label>
                                    <input
                                        className="w-full px-3 py-2 rounded border"
                                        value={form.endpoint}
                                        onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">Deployment</label>
                                    <input
                                        className="w-full px-3 py-2 rounded border"
                                        value={form.deployment}
                                        onChange={(e) => setForm({ ...form, deployment: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">API Version</label>
                                    <input
                                        className="w-full px-3 py-2 rounded border"
                                        value={form.api_version}
                                        onChange={(e) => setForm({ ...form, api_version: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        {form.provider === 'typesafe_ai' && (
                            <div>
                                <label className="block text-sm mb-1">Base URL</label>
                                <input
                                    className="w-full px-3 py-2 rounded border"
                                    value={form.base_url}
                                    onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm mb-1">
                                API Key {form.id ? '(leave blank to keep existing)' : ''}
                            </label>
                            <input
                                type="password"
                                className="w-full px-3 py-2 rounded border"
                                value={form.api_key}
                                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                            />
                            Active
                        </label>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded border">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 rounded bg-brand-violet text-white"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/test/AdminLLMModels.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the nav item to `client/src/components/AdminLayout.tsx`**

Change the icon import block:

```tsx
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Settings,
    Brain,
    Activity,
    Lightbulb
} from 'lucide-react';
```

to:

```tsx
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Settings,
    Brain,
    Activity,
    Lightbulb,
    Cpu
} from 'lucide-react';
```

Then change the `navItems` array:

```tsx
    const navItems = [
        { path: '/admin', label: t('admin.statistics'), icon: LayoutDashboard },
        { path: '/admin/workshops', label: t('admin.workshops'), icon: FolderKanban },
        { path: '/admin/usecases', label: 'AI Use Cases', icon: Lightbulb },
        { path: '/admin/users', label: t('admin.users'), icon: Users },
        { path: '/admin/facilitators', label: t('admin.facilitators'), icon: Users },
        { path: '/admin/knowledge-base', label: t('admin.knowledgeBase.title'), icon: Brain },
        { path: '/admin/llm-usage', label: t('admin.llmUsage'), icon: Activity },
        { path: '/admin/settings', label: t('admin.systemSettings'), icon: Settings },
        { path: '/admin/my-workshops', label: t('admin.myWorkshops'), icon: FolderKanban },
    ];
```

to (insert the new entry after `/admin/settings`):

```tsx
    const navItems = [
        { path: '/admin', label: t('admin.statistics'), icon: LayoutDashboard },
        { path: '/admin/workshops', label: t('admin.workshops'), icon: FolderKanban },
        { path: '/admin/usecases', label: 'AI Use Cases', icon: Lightbulb },
        { path: '/admin/users', label: t('admin.users'), icon: Users },
        { path: '/admin/facilitators', label: t('admin.facilitators'), icon: Users },
        { path: '/admin/knowledge-base', label: t('admin.knowledgeBase.title'), icon: Brain },
        { path: '/admin/llm-usage', label: t('admin.llmUsage'), icon: Activity },
        { path: '/admin/settings', label: t('admin.systemSettings'), icon: Settings },
        { path: '/admin/llm-models', label: 'LLM Models', icon: Cpu },
        { path: '/admin/my-workshops', label: t('admin.myWorkshops'), icon: FolderKanban },
    ];
```

- [ ] **Step 6: Add the route to `client/src/App.tsx`**

Add this import after `import { AdminSettings } from './pages/AdminSettings';`:

```tsx
import { AdminLLMModels } from './pages/AdminLLMModels';
```

Add this route after the `/admin/settings` route (`<Route path="/admin/settings" element={<PrivateRoute requireAdmin><AdminSettings /></PrivateRoute>} />`):

```tsx
          <Route path="/admin/llm-models" element={<PrivateRoute requireAdmin><AdminLLMModels /></PrivateRoute>} />
```

- [ ] **Step 7: Manually verify in the browser**

Start the backend (`cd server && source .venv/bin/activate && uvicorn app.main:app --port 8000`, or your usual local setup) and frontend (`cd client && npm run dev`). Log in as admin, navigate to `/admin/llm-models`, and confirm: the page loads, "Add Model" opens the form, creating an OpenAI-provider model succeeds and appears in the table, editing it without touching API Key keeps `has_api_key: true`, and deleting it removes it from the table.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/AdminLLMModels.tsx client/src/components/AdminLayout.tsx client/src/App.tsx client/src/test/AdminLLMModels.test.tsx
git commit -m "feat: add admin UI for LLM model config registry"
```

---

### Task 5: Workshop UI — AI Models selection in WorkshopSettingsModal

**Files:**
- Modify: `client/src/components/WorkshopSettingsModal.tsx`
- Test: `client/src/test/WorkshopSettingsModal.test.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/llm-models` (Task 2, any-authenticated-user list), `GET/PUT /api/workshops/{id}/llm-models` (Task 3).

- [ ] **Step 1: Write the failing test**

Create `client/src/test/WorkshopSettingsModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './test-utils';
import { WorkshopSettingsModal } from '../components/WorkshopSettingsModal';

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockPut = vi.fn();

vi.mock('../lib/api', () => ({
    api: {
        get: (...args: any[]) => mockGet(...args),
        patch: (...args: any[]) => mockPatch(...args),
        put: (...args: any[]) => mockPut(...args),
    },
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const mockRegistry = [
    { id: 'reason-1', name: 'GPT-4 Reasoning', provider: 'openai', role: 'reasoning', model_name: 'gpt-4', config_json: {}, has_api_key: true, is_active: true },
    { id: 'decide-1', name: 'JEV Decision', provider: 'typesafe_ai', role: 'decision', model_name: 'jev-v1', config_json: {}, has_api_key: false, is_active: true },
];

describe('WorkshopSettingsModal AI Models section', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGet.mockImplementation((url: string) => {
            if (url === 'admin/llm-models') {
                return Promise.resolve({ data: mockRegistry });
            }
            if (url.includes('llm-models')) {
                return Promise.resolve({ data: { embedding_model_id: null, decision_model_id: null, reasoning_model_id: null } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    it('only lists reasoning-role models in the Reasoning dropdown', async () => {
        render(
            <WorkshopSettingsModal
                isOpen={true}
                onClose={() => {}}
                workshop={{ id: 'ws-1', title: 'Test Workshop' }}
                onUpdate={() => {}}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('GPT-4 Reasoning')).toBeInTheDocument();
        });

        const reasoningSelect = screen.getByLabelText(/reasoning model/i) as HTMLSelectElement;
        const optionLabels = Array.from(reasoningSelect.options).map((o) => o.textContent);
        expect(optionLabels).toContain('GPT-4 Reasoning');
        expect(optionLabels).not.toContain('JEV Decision');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/test/WorkshopSettingsModal.test.tsx`
Expected: FAIL — `getByLabelText(/reasoning model/i)` finds nothing (section doesn't exist yet).

- [ ] **Step 3: Extend `client/src/components/WorkshopSettingsModal.tsx`**

Change the imports at the top:

```tsx
import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
```

to:

```tsx
import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

interface LLMModelOption {
    id: string;
    name: string;
    role: 'embedding' | 'decision' | 'reasoning';
    is_active: boolean;
}
```

Add new state right after the existing `errors` state declaration:

```tsx
    const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
    const [llmRegistry, setLlmRegistry] = useState<LLMModelOption[]>([]);
    const [embeddingModelId, setEmbeddingModelId] = useState<string>('');
    const [decisionModelId, setDecisionModelId] = useState<string>('');
    const [reasoningModelId, setReasoningModelId] = useState<string>('');
```

Add a new effect right after the existing "Reset form when workshop changes" effect, to load the registry and the workshop's current selection whenever the modal opens:

```tsx
    useEffect(() => {
        if (!isOpen) return;

        api.get('admin/llm-models').then((res) => {
            setLlmRegistry(res.data.filter((m: LLMModelOption) => m.is_active));
        }).catch((error) => {
            console.error('Failed to load LLM model registry:', error);
        });

        api.get(`workshops/${workshop.id}/llm-models`).then((res) => {
            setEmbeddingModelId(res.data.embedding_model_id || '');
            setDecisionModelId(res.data.decision_model_id || '');
            setReasoningModelId(res.data.reasoning_model_id || '');
        }).catch((error) => {
            console.error('Failed to load workshop LLM model selection:', error);
        });
    }, [isOpen, workshop.id]);
```

Change `handleSave` from:

```tsx
    const handleSave = async () => {
        if (!validate()) {
            return;
        }

        setIsLoading(true);
        try {
            await api.patch(`workshops/${workshop.id}`, {
                title: title.trim(),
                description: description.trim() || null,
            });

            toast.success('Workshop settings updated successfully');
            onUpdate(); // Refresh workshop data
            onClose();
        } catch (error: any) {
            console.error('Failed to update workshop settings:', error);
            toast.error(error.response?.data?.detail || 'Failed to update workshop settings');
        } finally {
            setIsLoading(false);
        }
    };
```

to:

```tsx
    const handleSave = async () => {
        if (!validate()) {
            return;
        }

        setIsLoading(true);
        try {
            await api.patch(`workshops/${workshop.id}`, {
                title: title.trim(),
                description: description.trim() || null,
            });

            await api.put(`workshops/${workshop.id}/llm-models`, {
                embedding_model_id: embeddingModelId || null,
                decision_model_id: decisionModelId || null,
                reasoning_model_id: reasoningModelId || null,
            });

            toast.success('Workshop settings updated successfully');
            onUpdate(); // Refresh workshop data
            onClose();
        } catch (error: any) {
            console.error('Failed to update workshop settings:', error);
            toast.error(error.response?.data?.detail || 'Failed to update workshop settings');
        } finally {
            setIsLoading(false);
        }
    };
```

Add a new "AI Models" section in the JSX, right after the closing `</div>` of the "Form Fields" block (immediately before the "Action Buttons" comment):

```tsx
                {/* AI Models Section */}
                <div className="space-y-4 pt-4 border-t theme-border">
                    <h4 className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                        AI Models
                    </h4>

                    <div>
                        <label htmlFor="embedding-model" className="block text-sm font-medium mb-2">
                            Embedding Model
                        </label>
                        <select
                            id="embedding-model"
                            aria-label="Embedding Model"
                            value={embeddingModelId}
                            onChange={(e) => setEmbeddingModelId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                        >
                            <option value="">Use default</option>
                            {llmRegistry.filter((m) => m.role === 'embedding').map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="decision-model" className="block text-sm font-medium mb-2">
                            Decision Model
                        </label>
                        <select
                            id="decision-model"
                            aria-label="Decision Model"
                            value={decisionModelId}
                            onChange={(e) => setDecisionModelId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                        >
                            <option value="">Use default</option>
                            {llmRegistry.filter((m) => m.role === 'decision').map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="reasoning-model" className="block text-sm font-medium mb-2">
                            Reasoning Model
                        </label>
                        <select
                            id="reasoning-model"
                            aria-label="Reasoning Model"
                            value={reasoningModelId}
                            onChange={(e) => setReasoningModelId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border"
                        >
                            <option value="">Use default</option>
                            {llmRegistry.filter((m) => m.role === 'reasoning').map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/test/WorkshopSettingsModal.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Run the full frontend unit suite to check nothing broke**

Run: `cd client && npm run test:run`
Expected: all existing tests still PASS, plus the 2 new files' tests.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/WorkshopSettingsModal.tsx client/src/test/WorkshopSettingsModal.test.tsx
git commit -m "feat: add per-workshop AI model selection to workshop settings"
```

---

### Task 6: User story documentation

**Files:**
- Create: `docs/userstories/04-ai-intelligence/US46_configurable_llm_models.md`
- Modify: `docs/userstories/README.md`

- [ ] **Step 1: Write `docs/userstories/04-ai-intelligence/US46_configurable_llm_models.md`**

```markdown
# User Story: Configurable LLM Models

**Epic:** AI Intelligence
**Module:** LLM Configuration
**Story Type:** Feature
**Priority:** Medium
**Story Points:** 13
**Status:** ✅ Implemented (Phase 1 — registry + selection)

### Implementation Summary
- ✅ Admin-managed LLM model registry (`llm_model_configs` table), tagged by role (embedding / decision / reasoning) and provider (OpenAI / Azure OpenAI / Anthropic / Typesafe AI)
- ✅ API keys encrypted at rest (Fernet, keyed from `SECRET_KEY`), never returned in any API response
- ✅ Admin CRUD UI at `/admin/llm-models`
- ✅ Per-workshop model selection (embedding/decision/reasoning) via the existing Workshop Settings modal
- 📋 **Not yet implemented:** the existing AI services (RAG, Copilot, Roadmap) do not yet read a workshop's selected models — they still use the single global `OPENAI_MODEL` setting. See "Relationship to Other Stories" below.

**As a** platform admin,
**I want to** configure a registry of LLM models — tagged as embedding, decision, or reasoning models, across multiple providers —
**So that** facilitators can choose which models power the AI features for their specific workshop, instead of every workshop being locked to one global model.

## Background & Research

Prior to this story, `server/app/core/config.py` defined exactly one global chat model (`OPENAI_MODEL`, default `gpt-4`) and one embedding model (Azure-only), read independently by three services (`rag_service.py`, `copilot_service.py`, `roadmap_service.py`). There was no way to use a different model for a specific workshop, and no way to introduce a model from a vendor outside OpenAI/Azure (e.g. **Typesafe AI's JEV model**, used here as a worked example of a "decision model" — a fast classification/scoring model distinct from the heavier "reasoning" models used for generation and analysis).

## Acceptance Criteria

### 1. Model Registry (Admin)
   - **Interface**: A new "LLM Models" page under Admin, listing all configured models (name, provider, role, model name, active status).
   - Admin can add a new model config, choosing a provider (OpenAI, Azure OpenAI, Anthropic, Typesafe AI) and a role (embedding, decision, reasoning), with provider-appropriate fields (e.g. Azure needs endpoint/deployment/api version; Typesafe AI needs a base URL).
   - Admin can edit a model config without being forced to re-enter its API key (blank = keep existing).
   - Admin can deactivate or delete a model config.
   - API keys are never visible again after being set — the UI only shows whether one is configured.

### 2. Per-Workshop Selection
   - **Interface**: An "AI Models" section in the existing Workshop Settings modal, with one dropdown per role (Embedding, Decision, Reasoning).
   - Each dropdown only lists active registry entries matching its role.
   - Each dropdown has a "Use default" option that clears the workshop's override for that role.
   - Saving persists the selection against the workshop; reopening the modal shows the saved selection.

### 3. Security
   - API keys are encrypted at rest and never appear in any API response, log, or the frontend after being saved.
   - Only admins can create, edit, or delete registry entries. Any authenticated user can list active entries (needed to populate the per-workshop selection dropdowns).

## Scenarios

### Scenario A: Admin registers a new decision model
1. Admin navigates to `/admin/llm-models` and clicks "Add Model"
2. Admin selects provider "Typesafe AI", role "Decision", names it "JEV Decision", enters the model name and base URL and API key, saves
3. The new entry appears in the registry table with "Active: Yes" and no API key ever shown back

### Scenario B: Facilitator assigns a decision model to a workshop
1. Facilitator opens Workshop Settings for one of their workshops
2. In the "AI Models" section, the Decision dropdown lists "JEV Decision" (and any other active decision-role models)
3. Facilitator selects it and saves; reopening the modal shows "JEV Decision" still selected

## Technical Notes

- New table: `llm_model_configs` (migration: `server/migrations/us46_llm_model_configs.py`).
- Per-workshop selection is stored as three new optional fields on the existing `Workshop.config` JSON blob (`embedding_model_id`, `decision_model_id`, `reasoning_model_id`) — no new join table.
- Encryption: `server/app/core/crypto.py`, Fernet keyed from the existing `SECRET_KEY` setting.
- API: `GET/POST /api/admin/llm-models`, `PUT/DELETE /api/admin/llm-models/{id}` (list is open to any authenticated user; mutations are admin-only), `GET/PUT /api/workshops/{id}/llm-models`.

## Relationship to Other Stories

- **US07 (AI Intelligence / RAG)**, **US16 (AI Copilot)**, **US20 (AI Implementation Roadmap)**: all three currently call a single global model via `rag_service.py`/`copilot_service.py`/`roadmap_service.py`. This story's registry and per-workshop selection are additive and do not change their behavior yet — a follow-up story is needed to make those services look up and use a workshop's selected embedding/decision/reasoning model instead of the global default.
```

- [ ] **Step 2: Update `docs/userstories/README.md`**

Add a new row to the `04-ai-intelligence` group's table (same table that lists US07/US16/US19/US26), following the existing column format (`ID | Title | Status | Points | File`):

```markdown
| US46 | Configurable LLM Models | ✅ Implemented (Phase 1) | 13 | [US46_configurable_llm_models.md](04-ai-intelligence/US46_configurable_llm_models.md) |
```

- [ ] **Step 3: Commit**

```bash
git add docs/userstories/04-ai-intelligence/US46_configurable_llm_models.md docs/userstories/README.md
git commit -m "docs: add US46 user story for configurable LLM models"
```

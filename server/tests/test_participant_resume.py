"""
US48.1: re-joining a workshop from the same device under the same name
resumes the existing participant identity instead of creating a new one.
"""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.auth import hash_password
from app.models.models import Participant, User, Workshop
from app.models.rbac import AccountStatus, UserRole


@pytest.fixture
async def workshop(db_session: AsyncSession) -> Workshop:
    owner = User(
        email=f"resume-{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password("pass12345"),
        full_name="Resume Owner",
        role=UserRole.FACILITATOR,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(owner)
    await db_session.commit()
    ws = Workshop(title="Resume Workshop", facilitator_id=owner.id, pin=uuid.uuid4().hex[:6].upper(), config={"criteria": []})
    db_session.add(ws)
    await db_session.commit()
    await db_session.refresh(ws)
    return ws


async def _join(client: AsyncClient, pin: str, name: str, resume=None, role="PARTICIPANT"):
    body = {"pin": pin, "display_name": name, "role": role}
    if resume is not None:
        body["resume_participant_ids"] = resume
    response = await client.post("/api/join", json=body)
    assert response.status_code == 200, response.text
    return response.json()["participant_id"]


async def _count(db: AsyncSession, workshop_id) -> int:
    result = await db.execute(select(Participant).where(Participant.workshop_id == workshop_id))
    return len(result.scalars().all())


@pytest.mark.asyncio
async def test_rejoin_same_name_resumes_identity(client: AsyncClient, db_session, workshop):
    first = await _join(client, workshop.pin, "Ann Lee")
    again = await _join(client, workshop.pin, "  ann lee ", resume=[first])
    assert again == first
    assert await _count(db_session, workshop.id) == 1


@pytest.mark.asyncio
async def test_different_name_creates_new_participant(client: AsyncClient, db_session, workshop):
    first = await _join(client, workshop.pin, "Ann Lee")
    other = await _join(client, workshop.pin, "Bob Ray", resume=[first])
    assert other != first
    assert await _count(db_session, workshop.id) == 2


@pytest.mark.asyncio
async def test_ids_from_another_workshop_are_ignored(client: AsyncClient, db_session, workshop):
    other_ws = Workshop(title="Other", facilitator_id=workshop.facilitator_id, pin=uuid.uuid4().hex[:6].upper(), config={})
    db_session.add(other_ws)
    await db_session.commit()
    foreign = await _join(client, other_ws.pin, "Ann Lee")

    mine = await _join(client, workshop.pin, "Ann Lee", resume=[foreign])
    assert mine != foreign


@pytest.mark.asyncio
async def test_facilitator_requests_never_resume(client: AsyncClient, workshop):
    first = await _join(client, workshop.pin, "Ann Lee")
    request = await _join(client, workshop.pin, "Ann Lee", resume=[first], role="FACILITATOR")
    assert request != first


@pytest.mark.asyncio
async def test_join_without_resume_ids_still_works(client: AsyncClient, workshop):
    a = await _join(client, workshop.pin, "Ann Lee")
    b = await _join(client, workshop.pin, "Ann Lee")
    assert a != b

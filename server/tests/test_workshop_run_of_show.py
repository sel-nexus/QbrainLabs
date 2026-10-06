"""
US48.4 / US48.5: phase control (forward/back/complete) and live progress.
"""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import create_access_token, hash_password
from app.models.models import Participant, UseCase, User, Vote, Workshop
from app.models.rbac import AccountStatus, UserRole


async def _user(db: AsyncSession, role=UserRole.FACILITATOR) -> User:
    user = User(email=f"ros-{uuid.uuid4().hex[:8]}@test.com", password_hash=hash_password("pass12345"),
                full_name="Run Of Show", role=role, status=AccountStatus.ACTIVE)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def _auth(user: User) -> dict:
    return {"Authorization": "Bearer " + create_access_token({"sub": user.email, "role": user.role})}


async def _workshop(db: AsyncSession, owner: User, **kw) -> Workshop:
    ws = Workshop(title="Run of show", facilitator_id=owner.id, pin=uuid.uuid4().hex[:6].upper(),
                  config={"criteria": [{"name": "Value", "weight": 100}]}, **kw)
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    return ws


@pytest.fixture
async def owner(db_session):
    return await _user(db_session)


@pytest.mark.asyncio
async def test_phase_can_move_forward_and_back(client: AsyncClient, db_session, owner):
    ws = await _workshop(db_session, owner)
    for phase in ("SCORING", "ANALYSIS", "SCORING", "INTAKE"):
        r = await client.post(f"/api/workshops/{ws.id}/phase", json={"phase": phase}, headers=_auth(owner))
        assert r.status_code == 200, r.text
        assert r.json()["current_phase"] == phase
        assert r.json()["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_invalid_phase_rejected(client: AsyncClient, db_session, owner):
    ws = await _workshop(db_session, owner)
    r = await client.post(f"/api/workshops/{ws.id}/phase", json={"phase": "VOTING"}, headers=_auth(owner))
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_unrelated_facilitator_cannot_change_phase_or_card(client: AsyncClient, db_session, owner):
    ws = await _workshop(db_session, owner)
    stranger = await _user(db_session)
    assert (await client.post(f"/api/workshops/{ws.id}/phase", json={"phase": "SCORING"}, headers=_auth(stranger))).status_code == 403
    assert (await client.post(f"/api/workshops/{ws.id}/active_card", json={"use_case_id": None}, headers=_auth(stranger))).status_code == 403
    assert (await client.post(f"/api/workshops/{ws.id}/complete", json={}, headers=_auth(stranger))).status_code == 403
    assert (await client.get(f"/api/workshops/{ws.id}/progress", headers=_auth(stranger))).status_code == 403


@pytest.mark.asyncio
async def test_complete_and_reopen(client: AsyncClient, db_session, owner):
    ws = await _workshop(db_session, owner, current_phase="ANALYSIS")
    done = await client.post(f"/api/workshops/{ws.id}/complete", json={"completed": True}, headers=_auth(owner))
    assert done.status_code == 200
    assert done.json()["status"] == "COMPLETED"

    listed = await client.get("/api/facilitator/workshops", headers=_auth(owner))
    item = next(w for w in listed.json() if w["id"] == str(ws.id))
    assert item["completed_at"] is not None

    reopened = await client.post(f"/api/workshops/{ws.id}/complete", json={"completed": False}, headers=_auth(owner))
    assert reopened.json()["status"] == "IN_PROGRESS"
    listed = await client.get("/api/facilitator/workshops", headers=_auth(owner))
    assert next(w for w in listed.json() if w["id"] == str(ws.id))["completed_at"] is None


@pytest.mark.asyncio
async def test_progress_counts(client: AsyncClient, db_session, owner):
    ws = await _workshop(db_session, owner, current_phase="SCORING")
    people = [Participant(workshop_id=ws.id, display_name=f"P{i}", role="PARTICIPANT") for i in range(3)]
    people.append(Participant(workshop_id=ws.id, display_name="Host", role="FACILITATOR"))
    db_session.add_all(people)
    await db_session.commit()
    uc1 = UseCase(workshop_id=ws.id, participant_id=people[0].id, title="A", description="a")
    uc2 = UseCase(workshop_id=ws.id, participant_id=people[0].id, title="B", description="b")
    uc3 = UseCase(workshop_id=ws.id, added_by_facilitator=True, title="C", description="c")
    db_session.add_all([uc1, uc2, uc3])
    await db_session.commit()
    db_session.add_all([
        Vote(use_case_id=uc1.id, participant_id=people[0].id, scores={"Value": 50}),
        Vote(use_case_id=uc1.id, participant_id=people[1].id, scores={"Value": 70}),
        Vote(use_case_id=uc2.id, participant_id=people[1].id, scores={"Value": 30}),
    ])
    ws.active_use_case_id = uc1.id
    await db_session.commit()

    r = await client.get(f"/api/workshops/{ws.id}/progress", headers=_auth(owner))
    assert r.status_code == 200
    body = r.json()
    assert body["participants"] == 3
    assert body["use_cases"] == 3
    assert body["submitters"] == 1
    assert body["scorers"] == 2
    assert body["votes_by_use_case"] == {str(uc1.id): 2, str(uc2.id): 1}
    assert body["active_use_case_id"] == str(uc1.id)
    assert body["active_card_votes"] == 2


@pytest.mark.asyncio
async def test_active_card_must_belong_to_workshop_and_can_be_cleared(client: AsyncClient, db_session, owner):
    ws = await _workshop(db_session, owner, current_phase="SCORING")
    other = await _workshop(db_session, owner)
    foreign = UseCase(workshop_id=other.id, title="Elsewhere", description="x")
    mine = UseCase(workshop_id=ws.id, title="Here", description="y")
    db_session.add_all([foreign, mine])
    await db_session.commit()

    bad = await client.post(f"/api/workshops/{ws.id}/active_card", json={"use_case_id": str(foreign.id)}, headers=_auth(owner))
    assert bad.status_code == 400
    ok = await client.post(f"/api/workshops/{ws.id}/active_card", json={"use_case_id": str(mine.id)}, headers=_auth(owner))
    assert ok.json()["active_use_case_id"] == str(mine.id)
    cleared = await client.post(f"/api/workshops/{ws.id}/active_card", json={"use_case_id": None}, headers=_auth(owner))
    assert cleared.json()["active_use_case_id"] is None

"""
US48.7 / 48.9 / 48.10: workshop setup (criteria, explicit matrix axes, who can
create), criteria editing before scoring, use case limits, card position.
"""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import create_access_token, hash_password
from app.models.models import Participant, UseCase, User, Vote, Workshop
from app.models.rbac import AccountStatus, UserRole
from app.utils.matrix import calculate_matrix_position


async def _user(db: AsyncSession, role=UserRole.FACILITATOR, status=AccountStatus.ACTIVE) -> User:
    user = User(email=f"setup-{uuid.uuid4().hex[:8]}@test.com", password_hash=hash_password("pass12345"),
                full_name="Setup", role=role, status=status)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def _auth(user: User) -> dict:
    return {"Authorization": "Bearer " + create_access_token({"sub": user.email, "role": user.role})}


CRITERIA = [{"name": "Impact", "weight": 40}, {"name": "Effort", "weight": 30}, {"name": "Data quality", "weight": 30}]


def _create_body(**config):
    return {"title": "Setup workshop", "config": {"criteria": CRITERIA, **config}}


@pytest.fixture
async def facilitator(db_session):
    return await _user(db_session)


# --- Who can create, and validation -------------------------------------------

@pytest.mark.asyncio
async def test_active_facilitator_can_create_but_pending_cannot(client: AsyncClient, db_session, facilitator):
    ok = await client.post("/api/workshops/", json=_create_body(), headers=_auth(facilitator))
    assert ok.status_code == 201, ok.text

    pending = await _user(db_session, status=AccountStatus.PENDING)
    denied = await client.post("/api/workshops/", json=_create_body(), headers=_auth(pending))
    assert denied.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("body,reason", [
    ({"title": "   ", "config": {"criteria": CRITERIA}}, "title"),
    ({"title": "T", "config": {"criteria": [{"name": " ", "weight": 50}, {"name": "B", "weight": 50}]}}, "name"),
    ({"title": "T", "config": {"criteria": [{"name": "A", "weight": 50}, {"name": "a", "weight": 50}]}}, "unique"),
    (_create_body(x_axis="Impact"), "both"),
    (_create_body(x_axis="Impact", y_axis="Nope"), "criteria"),
    (_create_body(x_axis="Impact", y_axis="Impact"), "different"),
])
async def test_create_validation(client: AsyncClient, facilitator, body, reason):
    r = await client.post("/api/workshops/", json=body, headers=_auth(facilitator))
    assert r.status_code == 422
    assert reason in r.text.lower()


@pytest.mark.asyncio
async def test_explicit_axes_are_stored_and_returned(client: AsyncClient, facilitator):
    r = await client.post("/api/workshops/", json=_create_body(x_axis="Data quality", y_axis="Impact"), headers=_auth(facilitator))
    assert r.status_code == 201
    assert r.json()["config"]["x_axis"] == "Data quality"
    assert r.json()["config"]["y_axis"] == "Impact"


# --- Explicit axes drive matrix positions --------------------------------------

def test_matrix_position_uses_explicit_axes():
    avgs = {"Impact": 80, "Effort": 30, "Data quality": 60}
    # Keyword inference picks Effort (inverted) for X; the facilitator's choice overrides it.
    assert calculate_matrix_position(avgs) == (70, 80)
    assert calculate_matrix_position(avgs, x_axis="Data quality", y_axis="Impact") == (60, 80)
    # Custom criterion names cannot be placed by keyword inference at all...
    assert calculate_matrix_position({"Reach": 90, "Cost to run": 20}) == (None, None)
    # ...but can with explicit axes ("Cost to run" is a cost, so it is inverted).
    assert calculate_matrix_position({"Reach": 90, "Cost to run": 20}, x_axis="Cost to run", y_axis="Reach") == (80, 90)
    # "Effort" is an inverse criterion (lower is better), so it's flipped.
    assert calculate_matrix_position(avgs, x_axis="Effort", y_axis="Impact") == (70, 80)


@pytest.mark.asyncio
async def test_results_use_explicit_axes(client: AsyncClient, db_session, facilitator):
    created = await client.post("/api/workshops/", json=_create_body(x_axis="Data quality", y_axis="Impact"), headers=_auth(facilitator))
    ws_id = created.json()["id"]
    p = Participant(workshop_id=uuid.UUID(ws_id), display_name="P", role="PARTICIPANT")
    db_session.add(p)
    await db_session.commit()
    uc = UseCase(workshop_id=uuid.UUID(ws_id), participant_id=p.id, title="Idea", description="d")
    db_session.add(uc)
    await db_session.commit()
    db_session.add(Vote(use_case_id=uc.id, participant_id=p.id, scores={"Impact": 80, "Effort": 30, "Data quality": 60}))
    await db_session.commit()

    results = (await client.get(f"/api/results/{ws_id}")).json()
    item = next(r for r in results if r["id"] == str(uc.id))
    assert round(item["x"]) == 60
    assert round(item["y"]) == 80


# --- Editing criteria until scoring starts -------------------------------------

@pytest.mark.asyncio
async def test_criteria_can_be_edited_during_intake_until_scores_exist(client: AsyncClient, db_session, facilitator):
    ws_id = (await client.post("/api/workshops/", json=_create_body(), headers=_auth(facilitator))).json()["id"]
    new = {"criteria": [{"name": "Value", "weight": 60}, {"name": "Ease", "weight": 40}], "x_axis": "Ease", "y_axis": "Value"}
    r = await client.put(f"/api/workshops/{ws_id}/criteria", json=new, headers=_auth(facilitator))
    assert r.status_code == 200, r.text
    assert [c["name"] for c in r.json()["config"]["criteria"]] == ["Value", "Ease"]
    assert r.json()["config"]["x_axis"] == "Ease"

    bad_total = {"criteria": [{"name": "Value", "weight": 60}, {"name": "Ease", "weight": 30}]}
    assert (await client.put(f"/api/workshops/{ws_id}/criteria", json=bad_total, headers=_auth(facilitator))).status_code == 422

    stranger = await _user(db_session)
    assert (await client.put(f"/api/workshops/{ws_id}/criteria", json=new, headers=_auth(stranger))).status_code == 403

    p = Participant(workshop_id=uuid.UUID(ws_id), display_name="P", role="PARTICIPANT")
    db_session.add(p)
    await db_session.commit()
    uc = UseCase(workshop_id=uuid.UUID(ws_id), participant_id=p.id, title="Idea", description="d")
    db_session.add(uc)
    await db_session.commit()
    db_session.add(Vote(use_case_id=uc.id, participant_id=p.id, scores={"Value": 50}))
    await db_session.commit()
    locked = await client.put(f"/api/workshops/{ws_id}/criteria", json=new, headers=_auth(facilitator))
    assert locked.status_code == 409


@pytest.mark.asyncio
async def test_criteria_locked_once_scoring_phase_starts(client: AsyncClient, facilitator):
    ws_id = (await client.post("/api/workshops/", json=_create_body(), headers=_auth(facilitator))).json()["id"]
    await client.post(f"/api/workshops/{ws_id}/phase", json={"phase": "SCORING"}, headers=_auth(facilitator))
    r = await client.put(f"/api/workshops/{ws_id}/criteria", json={"criteria": CRITERIA}, headers=_auth(facilitator))
    assert r.status_code == 409


# --- Use case limits & card position -------------------------------------------

@pytest.mark.asyncio
async def test_use_case_length_limits(client: AsyncClient, facilitator):
    ws_id = (await client.post("/api/workshops/", json=_create_body(), headers=_auth(facilitator))).json()["id"]
    base = {"workshop_id": ws_id, "title": "Ok", "description": "d", "kpi": "k", "target_user": "t", "added_by_facilitator": True}
    assert (await client.post("/api/usecases/", json=base)).status_code in (200, 201)
    too_long = {**base, "title": "x" * 201}
    assert (await client.post("/api/usecases/", json=too_long)).status_code == 422
    no_solution_ok = {**base, "title": "No solution"}
    assert (await client.post("/api/usecases/", json=no_solution_ok)).status_code in (200, 201)


@pytest.mark.asyncio
async def test_active_card_broadcast_includes_position(client: AsyncClient, db_session, facilitator):
    ws_id = (await client.post("/api/workshops/", json=_create_body(), headers=_auth(facilitator))).json()["id"]
    ucs = [UseCase(workshop_id=uuid.UUID(ws_id), title=t, description="d") for t in ("Bravo", "Alpha", "Charlie")]
    db_session.add_all(ucs)
    await db_session.commit()
    bravo = ucs[0]
    with patch("app.api.workshops.sio.emit", new=AsyncMock()) as emit:
        r = await client.post(f"/api/workshops/{ws_id}/active_card", json={"use_case_id": str(bravo.id)}, headers=_auth(facilitator))
    assert r.status_code == 200
    payload = next(c.args[1] for c in emit.call_args_list if c.args[0] == "active_card_update")
    assert payload["active_card"]["position"] == 2  # Alpha, Bravo, Charlie
    assert payload["active_card"]["total"] == 3

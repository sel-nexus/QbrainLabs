"""
US48.11: one source of truth for results — ranks, scores, quadrants,
consensus — shared by the results API, CSV and PDF exports.
"""
import csv
import io
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import create_access_token, hash_password
from app.models.models import Participant, UseCase, User, Vote, Workshop
from app.models.rbac import AccountStatus, UserRole
from app.services.workshop_results import assign_ranks, axis_labels, consensus_level, quadrant_for, scale_for

CRITERIA = [{"name": "Feasibility", "weight": 50}, {"name": "Business Value", "weight": 50}]


async def _owner(db: AsyncSession) -> User:
    user = User(email=f"res-{uuid.uuid4().hex[:8]}@test.com", password_hash=hash_password("pass12345"),
                full_name="Results", role=UserRole.FACILITATOR, status=AccountStatus.ACTIVE)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def _auth(user: User) -> dict:
    return {"Authorization": "Bearer " + create_access_token({"sub": user.email, "role": user.role})}


async def _workshop_with_votes(db: AsyncSession, owner: User, votes_by_title: dict, config: dict = None) -> Workshop:
    ws = Workshop(title="Results Day", facilitator_id=owner.id, pin=uuid.uuid4().hex[:6].upper(),
                  config=config or {"criteria": CRITERIA}, current_phase="ANALYSIS")
    db.add(ws)
    await db.commit()
    people = [Participant(workshop_id=ws.id, display_name=f"P{i}", role="PARTICIPANT") for i in range(4)]
    db.add_all(people)
    await db.commit()
    for title, vote_list in votes_by_title.items():
        uc = UseCase(workshop_id=ws.id, title=title, description=f"{title} description")
        db.add(uc)
        await db.commit()
        for person, scores in zip(people, vote_list):
            db.add(Vote(use_case_id=uc.id, participant_id=person.id, scores=scores))
        await db.commit()
    await db.refresh(ws)
    return ws


# --- Pure helpers ------------------------------------------------------------

def test_competition_ranking_with_ties_and_unscored():
    items = [
        {"title": "A", "vote_count": 2, "normalized_score": 80.0},
        {"title": "B", "vote_count": 2, "normalized_score": 70.04},
        {"title": "C", "vote_count": 2, "normalized_score": 70.0},
        {"title": "D", "vote_count": 2, "normalized_score": 50.0},
        {"title": "E", "vote_count": 0, "normalized_score": 0.0},
    ]
    assign_ranks(items)
    assert [(i["title"], i["rank"], i["tied"]) for i in items] == [
        ("A", 1, False), ("B", 2, True), ("C", 2, True), ("D", 4, False), ("E", None, False)
    ]


def test_consensus_and_quadrants():
    assert [consensus_level(a) for a in (None, 90, 70, 55, 40, 10)] == [None, "high", "high", "moderate", "moderate", "needs_discussion"]
    assert quadrant_for(80, 80) == "quick_wins"
    assert quadrant_for(20, 80) == "strategic_bets"
    assert quadrant_for(80, 20) == "nice_to_have"
    assert quadrant_for(20, 20) == "dont_do"
    assert quadrant_for(None, 50) is None


def test_scale_and_axis_labels():
    assert scale_for("7_POINT_COMPREHENSIVE", [7.0, 8.0]) == 10.0
    assert scale_for(None, [70.0, 80.0]) == 100.0
    assert axis_labels({"criteria": CRITERIA}) == ("Feasibility", "Business Value")
    assert axis_labels({"criteria": [{"name": "Reach"}, {"name": "Cost"}], "x_axis": "Cost", "y_axis": "Reach"}) == ("Cost", "Reach")


# --- Results API --------------------------------------------------------------

@pytest.mark.asyncio
async def test_results_are_ranked_with_consensus_and_quadrants(client: AsyncClient, db_session):
    owner = await _owner(db_session)
    ws = await _workshop_with_votes(db_session, owner, {
        "Agreed winner": [{"Feasibility": 80, "Business Value": 90}, {"Feasibility": 80, "Business Value": 90}],
        "Split opinion": [{"Feasibility": 10, "Business Value": 100}, {"Feasibility": 100, "Business Value": 0}],
        "Unscored": [],
    })
    results = (await client.get(f"/api/results/{ws.id}")).json()
    by_title = {r["title"]: r for r in results}

    winner = by_title["Agreed winner"]
    assert winner["rank"] == 1 and winner["normalized_score"] == 85.0
    assert winner["consensus_level"] == "high" and winner["agreement"] == 100.0
    assert winner["quadrant"] == "quick_wins"

    split = by_title["Split opinion"]
    assert split["rank"] == 2
    assert split["consensus_level"] == "needs_discussion"

    assert by_title["Unscored"]["rank"] is None
    assert [r["title"] for r in results][-1] == "Unscored"


@pytest.mark.asyncio
async def test_unsure_answers_are_ignored(client: AsyncClient, db_session):
    owner = await _owner(db_session)
    ws = await _workshop_with_votes(db_session, owner, {
        "With unsure": [{"Feasibility": 80, "Business Value": 60}, {"Feasibility": -1, "Business Value": 60}],
    })
    item = (await client.get(f"/api/results/{ws.id}")).json()[0]
    assert item["scores"]["Feasibility"] == 80.0


@pytest.mark.asyncio
async def test_ten_point_template_scores_are_normalized_to_100(client: AsyncClient, db_session):
    owner = await _owner(db_session)
    config = {"criteria": CRITERIA, "template_id": "7_POINT_COMPREHENSIVE"}
    ws = await _workshop_with_votes(db_session, owner, {"Seven": [{"Feasibility": 7, "Business Value": 8}]}, config)
    item = (await client.get(f"/api/results/{ws.id}")).json()[0]
    assert item["scale_max"] == 10.0
    assert item["normalized_score"] == 75.0


# --- Exports --------------------------------------------------------------------

@pytest.mark.asyncio
async def test_csv_export_matches_results(client: AsyncClient, db_session):
    owner = await _owner(db_session)
    ws = await _workshop_with_votes(db_session, owner, {
        "Alpha": [{"Feasibility": 80, "Business Value": 90}, {"Feasibility": 80, "Business Value": 90}],
        "Bravo": [{"Feasibility": 20, "Business Value": 30}],
    })
    r = await client.get(f"/api/export/workshop/{ws.id}/csv", headers=_auth(owner))
    assert r.status_code == 200
    assert "results-day-results.csv" in r.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(r.text)))
    assert [row["Use case"] for row in rows] == ["Alpha", "Bravo"]
    assert rows[0]["Rank"] == "1" and rows[0]["Quadrant"] == "Quick wins" and rows[0]["Score (0-100)"] == "85.0"
    assert rows[0]["Consensus"] == "High consensus"
    assert rows[1]["Quadrant"] == "Deprioritize"
    assert "Matrix X: Feasibility (0-100)" in rows[0]


@pytest.mark.asyncio
async def test_pdf_export_is_a_real_pdf(client: AsyncClient, db_session):
    owner = await _owner(db_session)
    ws = await _workshop_with_votes(db_session, owner, {
        "Alpha": [{"Feasibility": 80, "Business Value": 90}],
        "Bravo": [{"Feasibility": 20, "Business Value": 30}],
    })
    r = await client.get(f"/api/export/workshop/{ws.id}/pdf", headers=_auth(owner))
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")
    assert "results-day-results.pdf" in r.headers["content-disposition"]
    assert len(r.content) > 2000


@pytest.mark.asyncio
async def test_exports_require_workshop_access(client: AsyncClient, db_session):
    owner = await _owner(db_session)
    ws = await _workshop_with_votes(db_session, owner, {"Alpha": [{"Feasibility": 80, "Business Value": 90}]})
    stranger = await _owner(db_session)
    assert (await client.get(f"/api/export/workshop/{ws.id}/csv")).status_code == 401
    assert (await client.get(f"/api/export/workshop/{ws.id}/csv", headers=_auth(stranger))).status_code == 403
    assert (await client.get(f"/api/export/workshop/{ws.id}/pdf", headers=_auth(stranger))).status_code == 403


@pytest.mark.asyncio
async def test_analytics_quadrants_match_results(client: AsyncClient, db_session):
    owner = await _owner(db_session)
    ws = await _workshop_with_votes(db_session, owner, {
        "Alpha": [{"Feasibility": 80, "Business Value": 90}],
        "Bravo": [{"Feasibility": 20, "Business Value": 30}],
    })
    analysis = (await client.get(f"/api/analytics/workshop/{ws.id}/quadrant-analysis")).json()
    assert [i["title"] for i in analysis["quadrants"]["quick_wins"]] == ["Alpha"]
    assert [i["title"] for i in analysis["quadrants"]["dont_do"]] == ["Bravo"]
    assert analysis["quadrant_labels"]["dont_do"] == "Deprioritize"
    assert analysis["x_label"] == "Feasibility"

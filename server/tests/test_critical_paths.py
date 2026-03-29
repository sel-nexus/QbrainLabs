"""
Critical path tests covering bugs found in coverage analysis:

1. Phantom vote — votes.py:submit_vote() accepts any UUID as participant_id with no
   existence check. Phantom votes silently corrupt workshop results.

2. PENDING account access gap — signup creates PENDING accounts; _authenticate_user()
   does NOT block PENDING (only DISABLED/SUSPENDED), so users get a valid JWT but are
   then blocked by get_current_active_user on every protected route.

3. Results with zero votes + null config — regression test for the workshop.config=None
   crash fix, and documents the expected empty-state response format.
"""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    User, Workshop, UseCase, Participant,
    AccountStatus, UserRole, WorkshopStatus, WorkshopPhase,
)
from app.core.security import hash_password


# ─── Shared helpers ────────────────────────────────────────────────────────────

async def _create_active_facilitator(db: AsyncSession, email: str) -> User:
    """Insert an ACTIVE facilitator directly into the test DB."""
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password("ValidPass1"),
        full_name="Test Facilitator",
        role=UserRole.FACILITATOR.value,
        status=AccountStatus.ACTIVE.value,
        is_admin=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _create_workshop(db: AsyncSession, facilitator_id) -> Workshop:
    """Insert a workshop with config=None to test the null-config guard."""
    ws = Workshop(
        id=uuid.uuid4(),
        facilitator_id=facilitator_id,
        title="Test Workshop",
        status=WorkshopStatus.OPEN,
        current_phase=WorkshopPhase.INTAKE,
        config=None,
    )
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    return ws


async def _create_use_case(db: AsyncSession, workshop_id) -> UseCase:
    """Insert a use case belonging to the given workshop."""
    uc = UseCase(
        id=uuid.uuid4(),
        workshop_id=workshop_id,
        title="AI Invoice Processing",
        description="Automate AP using LLMs",
    )
    db.add(uc)
    await db.commit()
    await db.refresh(uc)
    return uc


# ─── Test 1: Phantom Vote ──────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestPhantomVote:
    """
    submit_vote() must validate that participant_id refers to a real Participant
    row before persisting a vote. Accepting fabricated UUIDs creates orphaned votes
    that inflate scores and corrupt results.
    """

    async def test_vote_with_nonexistent_participant_is_rejected(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """
        POST /api/votes/ with a fabricated participant_id must return 404.

        CURRENTLY RETURNS 201 (bug) — this test documents the required behavior
        and will fail until the bug is fixed in votes.py.
        """
        facilitator = await _create_active_facilitator(db_session, "fac1@example.com")
        workshop = await _create_workshop(db_session, facilitator.id)
        use_case = await _create_use_case(db_session, workshop.id)

        phantom_participant_id = str(uuid.uuid4())  # never inserted into DB

        response = await client.post(
            "/api/votes/",
            json={
                "use_case_id": str(use_case.id),
                "participant_id": phantom_participant_id,
                "scores": {"Feasibility": 80, "Business Value": 70},
            },
        )

        assert response.status_code == 404, (
            f"Expected 404 for non-existent participant, got {response.status_code}. "
            "Phantom votes corrupt workshop results — "
            "votes.py:submit_vote() must call get_or_404(Participant) before persisting."
        )

    async def test_vote_with_valid_participant_succeeds(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Baseline: a vote from a real participant in the workshop must be accepted."""
        facilitator = await _create_active_facilitator(db_session, "fac2@example.com")
        workshop = await _create_workshop(db_session, facilitator.id)
        use_case = await _create_use_case(db_session, workshop.id)

        participant = Participant(
            id=uuid.uuid4(),
            workshop_id=workshop.id,
            display_name="Alice",
        )
        db_session.add(participant)
        await db_session.commit()

        response = await client.post(
            "/api/votes/",
            json={
                "use_case_id": str(use_case.id),
                "participant_id": str(participant.id),
                "scores": {"Feasibility": 80, "Business Value": 70},
            },
        )

        assert response.status_code in (200, 201), (
            f"Expected 200/201 for valid participant, got {response.status_code}: "
            f"{response.text}"
        )


# ─── Test 2: PENDING Account Access Gap ───────────────────────────────────────

@pytest.mark.asyncio
class TestPendingAccountAccess:
    """
    Boundary test: PENDING accounts can log in (receive a valid JWT) but must be
    blocked by get_current_active_user on every protected route.

    Without these tests, a change to _authenticate_user() could silently grant
    full access to unverified accounts, or silently block login entirely.
    """

    async def test_pending_account_login_returns_token(self, client: AsyncClient):
        """
        POST /api/auth/signup creates a PENDING account.
        POST /api/auth/login with correct credentials must return 200 + access_token.
        (_authenticate_user only blocks DISABLED/SUSPENDED, not PENDING.)
        """
        signup_resp = await client.post(
            "/api/auth/signup",
            json={
                "email": "pending_login@example.com",
                "password": "ValidPass1",
                "full_name": "Pending User",
            },
        )
        assert signup_resp.status_code in (200, 201), (
            f"Signup failed: {signup_resp.status_code} {signup_resp.text}"
        )

        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "pending_login@example.com", "password": "ValidPass1"},
        )
        assert login_resp.status_code == 200, (
            f"Expected 200 from login for PENDING account, got {login_resp.status_code}"
        )
        token = login_resp.json().get("access_token")
        assert token, "Login response must include access_token for PENDING account"

    async def test_pending_account_blocked_from_protected_routes(
        self, client: AsyncClient
    ):
        """
        A PENDING user's token must be rejected (403) on routes guarded by
        get_current_active_user, such as GET /api/workshops/.
        """
        await client.post(
            "/api/auth/signup",
            json={
                "email": "pending_blocked@example.com",
                "password": "ValidPass1",
                "full_name": "Pending Blocked",
            },
        )
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "pending_blocked@example.com", "password": "ValidPass1"},
        )
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        ws_resp = await client.get("/api/workshops/", headers=headers)
        assert ws_resp.status_code == 403, (
            f"PENDING account must be blocked from /api/workshops/, "
            f"got {ws_resp.status_code}. "
            "If this fails, get_current_active_user may not be applied to workshops."
        )

    async def test_active_account_passes_protected_routes(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """
        Contrast test: the same guard must pass for an ACTIVE account.
        Ensures the 403 above is from PENDING status, not a route config bug.
        """
        facilitator = await _create_active_facilitator(db_session, "active_gate@example.com")

        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "active_gate@example.com", "password": "ValidPass1"},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        ws_resp = await client.get("/api/workshops/", headers=headers)
        assert ws_resp.status_code == 200, (
            f"ACTIVE account must pass /api/workshops/, got {ws_resp.status_code}: "
            f"{ws_resp.text}"
        )


# ─── Test 3: Results — Zero Votes + Null Config ────────────────────────────────

@pytest.mark.asyncio
class TestResultsEmptyWorkshop:
    """
    The results endpoint must handle two edge cases gracefully:
    1. workshop.config = NULL (was crashing with AttributeError before fix)
    2. Zero votes → return use cases with vote_count=0 and empty scores
    """

    async def test_results_with_no_votes_returns_well_formed_list(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """
        GET /api/results/{workshop_id} on a workshop with 2 use cases but
        zero votes must return 200 with a list of 2 items, each having
        vote_count=0, total_score=0, scores={}.
        """
        facilitator = await _create_active_facilitator(db_session, "fac3@example.com")
        workshop = await _create_workshop(db_session, facilitator.id)  # config=None
        await _create_use_case(db_session, workshop.id)
        await _create_use_case(db_session, workshop.id)

        response = await client.get(f"/api/results/{workshop.id}")

        assert response.status_code == 200, (
            f"Results with no votes should return 200, got {response.status_code}: "
            f"{response.text}"
        )
        data = response.json()
        assert isinstance(data, list), "Response must be a list"
        assert len(data) == 2, f"Expected 2 use cases in results, got {len(data)}"

        for item in data:
            assert item.get("vote_count") == 0, (
                f"Use case with no votes must have vote_count=0, got {item.get('vote_count')}"
            )
            assert item.get("total_score") == 0, (
                f"Use case with no votes must have total_score=0, got {item.get('total_score')}"
            )
            assert item.get("scores") == {}, (
                f"Use case with no votes must have scores={{}}, got {item.get('scores')}"
            )

    async def test_results_null_config_does_not_return_500(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """
        Regression: workshop.config=NULL caused AttributeError on .get().
        Must return 200, not 500.
        """
        facilitator = await _create_active_facilitator(db_session, "fac4@example.com")
        ws = Workshop(
            id=uuid.uuid4(),
            facilitator_id=facilitator.id,
            title="Null Config Workshop",
            status=WorkshopStatus.OPEN,
            current_phase=WorkshopPhase.INTAKE,
            config=None,
        )
        db_session.add(ws)
        await db_session.commit()

        response = await client.get(f"/api/results/{ws.id}")

        assert response.status_code != 500, (
            "Results endpoint returned 500 with null config — "
            "regression in the `workshop.config or {}` guard (api/results.py)"
        )
        assert response.status_code == 200

    async def test_results_nonexistent_workshop_returns_404(
        self, client: AsyncClient
    ):
        """GET /api/results/<random-uuid> must return 404, not 500."""
        response = await client.get(f"/api/results/{uuid.uuid4()}")
        assert response.status_code == 404, (
            f"Expected 404 for non-existent workshop, got {response.status_code}"
        )

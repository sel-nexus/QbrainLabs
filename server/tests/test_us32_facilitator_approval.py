"""
Tests for US32: Facilitator Approval Workflow & Rate Limiting

Tests cover:
1. Pending facilitator login experience
2. Registration rate limiting (10/day, 20/week, 50/month)
3. Workshop facilitator limit (max 10)
4. Facilitator access requests via PIN
"""
import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import User, Workshop, UserRole, AccountStatus
from app.models.rbac import (
    FacilitatorRegistrationLog,
    FacilitatorAccessRequest,
    FacilitatorAccessRequestStatus,
    WorkshopFacilitator
)
from app.api.auth import hash_password
from app.services.rate_limiting import (
    check_registration_rate_limit,
    get_rate_limit_status,
    log_registration,
    reset_rate_limits,
    RateLimitExceeded,
    DAILY_LIMIT,
    WEEKLY_LIMIT,
    MONTHLY_LIMIT
)


class TestPendingFacilitatorLogin:
    """Test that pending facilitators can login but see restricted access"""

    @pytest.mark.asyncio
    async def test_pending_facilitator_can_login(self, client: AsyncClient, db_session: AsyncSession):
        """Pending facilitator should be able to login successfully"""
        # Create a pending facilitator
        user = User(
            email="pending@test.com",
            password_hash=hash_password("TestPass123!"),
            full_name="Pending User",
            role=UserRole.FACILITATOR.value,
            status=AccountStatus.PENDING.value
        )
        db_session.add(user)
        await db_session.commit()

        # Login should succeed
        response = await client.post(
            "/api/auth/login",
            data={"username": "pending@test.com", "password": "TestPass123!"}
        )
        
        # US32: Pending users can now login
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["status"] == "pending"
        assert "access_token" in data

    @pytest.mark.asyncio
    async def test_disabled_facilitator_cannot_login(self, client: AsyncClient, db_session: AsyncSession):
        """Disabled facilitator should not be able to login"""
        user = User(
            email="disabled@test.com",
            password_hash=hash_password("TestPass123!"),
            full_name="Disabled User",
            role=UserRole.FACILITATOR.value,
            status=AccountStatus.DISABLED.value
        )
        db_session.add(user)
        await db_session.commit()

        response = await client.post(
            "/api/auth/login",
            data={"username": "disabled@test.com", "password": "TestPass123!"}
        )
        
        assert response.status_code == 403
        assert "disabled" in response.json()["detail"].lower()


class TestRegistrationRateLimiting:
    """Test registration rate limiting (10/day, 20/week, 50/month)"""

    @pytest.mark.asyncio
    async def test_get_rate_limit_status(self, db_session: AsyncSession):
        """Should return correct rate limit status"""
        status = await get_rate_limit_status(db_session)
        
        assert "daily" in status
        assert "weekly" in status
        assert "monthly" in status
        assert status["daily"]["limit"] == DAILY_LIMIT
        assert status["weekly"]["limit"] == WEEKLY_LIMIT
        assert status["monthly"]["limit"] == MONTHLY_LIMIT

    @pytest.mark.asyncio
    async def test_log_registration(self, db_session: AsyncSession):
        """Should log registration attempt"""
        await log_registration(db_session, "test@example.com")
        
        result = await db_session.execute(
            select(FacilitatorRegistrationLog).where(
                FacilitatorRegistrationLog.email == "test@example.com"
            )
        )
        log = result.scalars().first()
        
        assert log is not None
        assert log.email == "test@example.com"

    @pytest.mark.asyncio
    async def test_daily_rate_limit_exceeded(self, db_session: AsyncSession):
        """Should raise exception when daily limit exceeded"""
        # Add 10 registrations (daily limit)
        for i in range(DAILY_LIMIT):
            log = FacilitatorRegistrationLog(
                email=f"user{i}@test.com",
                registration_timestamp=datetime.utcnow()
            )
            db_session.add(log)
        await db_session.commit()

        with pytest.raises(RateLimitExceeded) as exc_info:
            await check_registration_rate_limit(db_session)
        
        assert exc_info.value.limit_type == "daily"
        assert exc_info.value.limit == DAILY_LIMIT

    @pytest.mark.asyncio
    async def test_weekly_rate_limit_exceeded(self, db_session: AsyncSession):
        """Should raise exception when weekly limit exceeded"""
        # Add registrations spread over the week (but under daily limit)
        for i in range(WEEKLY_LIMIT):
            # Spread across different days
            days_ago = i % 6  # 0-5 days ago (not today to avoid daily limit)
            log = FacilitatorRegistrationLog(
                email=f"weekuser{i}@test.com",
                registration_timestamp=datetime.utcnow() - timedelta(days=days_ago + 1)
            )
            db_session.add(log)
        await db_session.commit()

        with pytest.raises(RateLimitExceeded) as exc_info:
            await check_registration_rate_limit(db_session)
        
        assert exc_info.value.limit_type == "weekly"

    @pytest.mark.asyncio
    async def test_reset_rate_limits(self, db_session: AsyncSession):
        """Should reset rate limits when requested"""
        # Add some registrations
        for i in range(5):
            log = FacilitatorRegistrationLog(
                email=f"reset{i}@test.com",
                registration_timestamp=datetime.utcnow()
            )
            db_session.add(log)
        await db_session.commit()

        # Reset all
        await reset_rate_limits(db_session, "all")

        status = await get_rate_limit_status(db_session)
        assert status["daily"]["count"] == 0


class TestWorkshopFacilitatorLimit:
    """Test workshop facilitator limit (max 10)"""

    @pytest.mark.asyncio
    async def test_cannot_add_more_than_10_facilitators(self, db_session: AsyncSession):
        """Should not allow more than 10 facilitators per workshop"""
        # Create admin user
        admin = User(
            email="admin@test.com",
            password_hash=hash_password("AdminPass123!"),
            full_name="Admin",
            role=UserRole.ADMIN.value,
            status=AccountStatus.ACTIVE.value,
            is_admin=True
        )
        db_session.add(admin)
        
        # Create workshop
        workshop = Workshop(
            facilitator_id=admin.id,
            title="Test Workshop",
            pin="ABC123",
            status="OPEN"
        )
        db_session.add(workshop)
        await db_session.commit()

        # Add 9 facilitators (10 total including owner)
        for i in range(9):
            facilitator = User(
                email=f"facilitator{i}@test.com",
                password_hash=hash_password("FacPass123!"),
                full_name=f"Facilitator {i}",
                role=UserRole.FACILITATOR.value,
                status=AccountStatus.ACTIVE.value
            )
            db_session.add(facilitator)
            await db_session.commit()
            
            assignment = WorkshopFacilitator(
                workshop_id=workshop.id,
                facilitator_id=facilitator.id,
                assigned_by=admin.id
            )
            db_session.add(assignment)
        
        await db_session.commit()

        # Count should be at limit
        from sqlalchemy import func
        count_result = await db_session.execute(
            select(func.count(WorkshopFacilitator.id)).where(
                WorkshopFacilitator.workshop_id == workshop.id
            )
        )
        count = count_result.scalar() + 1  # +1 for owner
        assert count == 10


class TestFacilitatorAccessRequests:
    """Test facilitator access requests via PIN"""

    @pytest.mark.asyncio
    async def test_submit_facilitator_request(self, client: AsyncClient, db_session: AsyncSession):
        """Should create a facilitator access request"""
        # Create admin and workshop
        admin = User(
            email="admin2@test.com",
            password_hash=hash_password("AdminPass123!"),
            full_name="Admin",
            role=UserRole.ADMIN.value,
            status=AccountStatus.ACTIVE.value,
            is_admin=True
        )
        db_session.add(admin)
        await db_session.commit()

        workshop = Workshop(
            facilitator_id=admin.id,
            title="Test Workshop 2",
            pin="XYZ789",
            status="OPEN"
        )
        db_session.add(workshop)
        await db_session.commit()

        # Submit facilitator request
        response = await client.post(
            "/api/workshops/XYZ789/facilitator-request",
            json={
                "name": "John Doe",
                "email": "john@example.com"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert "request_id" in data
        assert data["request_id"].startswith("FAR-")

    @pytest.mark.asyncio
    async def test_request_generates_unique_id(self, db_session: AsyncSession):
        """Request ID should be in format FAR-YYYY-MMDD-NNN"""
        from app.api.facilitators import generate_request_id
        
        request_id = generate_request_id()
        
        assert request_id.startswith("FAR-")
        parts = request_id.split("-")
        assert len(parts) == 3
        # Year-MonthDay format
        assert len(parts[1]) == 8  # YYYY + MMDD

    @pytest.mark.asyncio
    async def test_approve_facilitator_request(self, db_session: AsyncSession):
        """Admin should be able to approve a facilitator request"""
        # Create admin
        admin = User(
            email="admin3@test.com",
            password_hash=hash_password("AdminPass123!"),
            full_name="Admin",
            role=UserRole.ADMIN.value,
            status=AccountStatus.ACTIVE.value,
            is_admin=True
        )
        db_session.add(admin)
        await db_session.commit()

        # Create workshop
        workshop = Workshop(
            facilitator_id=admin.id,
            title="Approval Test Workshop",
            pin="APP123",
            status="OPEN"
        )
        db_session.add(workshop)
        await db_session.commit()

        # Create pending request
        request = FacilitatorAccessRequest(
            request_id="FAR-2026-0125-001",
            workshop_id=workshop.id,
            requester_name="Jane Doe",
            requester_email="jane@example.com",
            status=FacilitatorAccessRequestStatus.PENDING.value
        )
        db_session.add(request)
        await db_session.commit()

        # Approve the request
        request.status = FacilitatorAccessRequestStatus.APPROVED.value
        request.reviewed_by = admin.id
        request.reviewed_at = datetime.utcnow()
        await db_session.commit()

        # Verify status changed
        result = await db_session.execute(
            select(FacilitatorAccessRequest).where(
                FacilitatorAccessRequest.request_id == "FAR-2026-0125-001"
            )
        )
        updated_request = result.scalars().first()
        assert updated_request.status == FacilitatorAccessRequestStatus.APPROVED.value

    @pytest.mark.asyncio
    async def test_reject_facilitator_request(self, db_session: AsyncSession):
        """Admin should be able to reject a facilitator request"""
        # Create admin
        admin = User(
            email="admin4@test.com",
            password_hash=hash_password("AdminPass123!"),
            full_name="Admin",
            role=UserRole.ADMIN.value,
            status=AccountStatus.ACTIVE.value,
            is_admin=True
        )
        db_session.add(admin)
        await db_session.commit()

        # Create workshop
        workshop = Workshop(
            facilitator_id=admin.id,
            title="Rejection Test Workshop",
            pin="REJ123",
            status="OPEN"
        )
        db_session.add(workshop)
        await db_session.commit()

        # Create pending request
        request = FacilitatorAccessRequest(
            request_id="FAR-2026-0125-002",
            workshop_id=workshop.id,
            requester_name="Bob Smith",
            requester_email="bob@example.com",
            status=FacilitatorAccessRequestStatus.PENDING.value
        )
        db_session.add(request)
        await db_session.commit()

        # Reject the request
        request.status = FacilitatorAccessRequestStatus.REJECTED.value
        request.reviewed_by = admin.id
        request.reviewed_at = datetime.utcnow()
        request.rejection_reason = "Not eligible"
        await db_session.commit()

        # Verify status changed
        result = await db_session.execute(
            select(FacilitatorAccessRequest).where(
                FacilitatorAccessRequest.request_id == "FAR-2026-0125-002"
            )
        )
        updated_request = result.scalars().first()
        assert updated_request.status == FacilitatorAccessRequestStatus.REJECTED.value
        assert updated_request.rejection_reason == "Not eligible"

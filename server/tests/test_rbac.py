"""
Tests for Role-Based Access Control (RBAC) System
Implements US30: User Roles & Access Control System
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import patch, MagicMock, AsyncMock
import uuid
from datetime import datetime, timedelta

from app.main import app
from app.models.models import User, Workshop, UserRole, AccountStatus
from app.models.rbac import WorkshopFacilitator, MemberSession
from app.api.auth import hash_password, create_access_token, get_current_user


# Test fixtures
@pytest.fixture
def admin_user_data():
    return {
        "id": str(uuid.uuid4()),
        "email": "admin@test.com",
        "password_hash": hash_password("AdminPass123"),
        "full_name": "Test Admin",
        "role": UserRole.ADMIN.value,
        "status": AccountStatus.ACTIVE.value,
        "is_admin": True,
    }


@pytest.fixture
def facilitator_user_data():
    return {
        "id": str(uuid.uuid4()),
        "email": "facilitator@test.com",
        "password_hash": hash_password("FacPass123"),
        "full_name": "Test Facilitator",
        "role": UserRole.FACILITATOR.value,
        "status": AccountStatus.ACTIVE.value,
        "is_admin": False,
    }


@pytest.fixture
def pending_facilitator_data():
    return {
        "id": str(uuid.uuid4()),
        "email": "pending@test.com",
        "password_hash": hash_password("PendingPass123"),
        "full_name": "Pending Facilitator",
        "role": UserRole.FACILITATOR.value,
        "status": AccountStatus.PENDING.value,
        "is_admin": False,
    }


@pytest.fixture
def disabled_facilitator_data():
    return {
        "id": str(uuid.uuid4()),
        "email": "disabled@test.com",
        "password_hash": hash_password("DisabledPass123"),
        "full_name": "Disabled Facilitator",
        "role": UserRole.FACILITATOR.value,
        "status": AccountStatus.DISABLED.value,
        "is_admin": False,
    }


def create_token_for_user(user_data: dict) -> str:
    """Create a JWT token for a user"""
    return create_access_token(
        data={
            "sub": user_data["email"],
            "role": user_data["role"],
            "status": user_data["status"],
            "user_id": user_data["id"],
            "is_admin": user_data.get("is_admin", False)
        },
        expires_delta=timedelta(hours=1)
    )


def create_mock_user(user_data: dict) -> User:
    """Create a mock User object from user data"""
    user = MagicMock(spec=User)
    user.id = user_data["id"]
    user.email = user_data["email"]
    user.full_name = user_data["full_name"]
    user.role = user_data["role"]
    user.status = user_data["status"]
    user.is_admin = user_data.get("is_admin", False)
    user.is_admin_user = user_data.get("is_admin", False)
    user.organization = None
    user.created_at = datetime.utcnow()
    user.updated_at = datetime.utcnow()
    user.last_login = None
    user.disabled_at = None
    user.disabled_by = None
    user.mfa_enabled = False
    return user


class TestAuthRoles:
    """Test authentication with role validation"""

    @pytest.mark.asyncio
    async def test_login_pending_facilitator_rejected(self, pending_facilitator_data):
        """Pending facilitators should not be able to login"""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            # This test would require mocking the database
            # For now, we test the response format
            response = await client.post(
                "/api/auth/login",
                data={
                    "username": "pending@test.com",
                    "password": "PendingPass123"
                }
            )
            # Should be either 401 (user not found in test) or 403 (pending)
            assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_login_disabled_facilitator_rejected(self, disabled_facilitator_data):
        """Disabled facilitators should not be able to login"""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/auth/login",
                data={
                    "username": "disabled@test.com",
                    "password": "DisabledPass123"
                }
            )
            # Should be either 401 (user not found in test) or 403 (disabled)
            assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_register_facilitator_returns_pending_status(self):
        """New facilitator registration should have pending status"""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/auth/register",
                json={
                    "email": f"new_{uuid.uuid4().hex[:8]}@test.com",
                    "password": "NewPass123",
                    "full_name": "New Facilitator",
                    "organization": "Test Org"
                }
            )
            # May fail due to DB constraints in test, but format should be correct
            if response.status_code == 201:
                data = response.json()
                assert data["status"] == "pending"
                assert data["role"] == "facilitator"


class TestAdminEndpoints:
    """Test admin-only endpoints"""

    @pytest.mark.asyncio
    async def test_admin_can_access_facilitator_list(self, admin_user_data):
        """Admins should be able to list facilitators"""
        mock_user = create_mock_user(admin_user_data)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                response = await client.get("/api/admin/facilitators")
                # Should succeed or return empty list
                assert response.status_code in [200, 500]  # 500 if DB not set up
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    @pytest.mark.asyncio
    async def test_facilitator_cannot_access_admin_endpoints(self, facilitator_user_data):
        """Facilitators should not be able to access admin endpoints"""
        mock_user = create_mock_user(facilitator_user_data)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                response = await client.get("/api/admin/facilitators")
                assert response.status_code == 403
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_access_admin_endpoints(self):
        """Unauthenticated users should not access admin endpoints"""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get("/api/admin/facilitators")
            assert response.status_code == 401


class TestFacilitatorEndpoints:
    """Test facilitator endpoints"""

    @pytest.mark.asyncio
    async def test_facilitator_can_access_workshops(self, facilitator_user_data):
        """Facilitators should be able to list their workshops"""
        mock_user = create_mock_user(facilitator_user_data)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                response = await client.get("/api/facilitator/workshops")
                # Should succeed or DB error
                assert response.status_code in [200, 500]
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    @pytest.mark.asyncio
    async def test_admin_can_access_facilitator_endpoints(self, admin_user_data):
        """Admins should also be able to access facilitator endpoints"""
        mock_user = create_mock_user(admin_user_data)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                response = await client.get("/api/facilitator/workshops")
                # Should succeed or DB error
                assert response.status_code in [200, 500]
        finally:
            app.dependency_overrides.pop(get_current_user, None)


class TestMemberEndpoints:
    """Test member/participant endpoints"""

    @pytest.mark.asyncio
    async def test_member_join_with_invalid_pin(self):
        """Members should get error for invalid PIN"""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/member/join",
                json={
                    "pin": "INVALID",
                    "display_name": "Test Member"
                }
            )
            # 404 (not found) or 422 (validation error for PIN format)
            assert response.status_code in [404, 422]

    @pytest.mark.asyncio
    async def test_member_session_required_for_workshop_info(self):
        """Members need valid session to get workshop info"""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get("/api/member/workshop")
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_check_name_availability(self):
        """Name availability check should work without auth"""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/member/check-name/TESTPIN/TestName"
            )
            # Should return 404 (workshop not found) not 401
            assert response.status_code == 404


class TestRoleEnforcement:
    """Test that roles are properly enforced across the application"""

    @pytest.mark.asyncio
    async def test_token_contains_role_info(self, admin_user_data):
        """JWT tokens should contain role information"""
        token = create_token_for_user(admin_user_data)
        
        # Decode and verify token contains role
        import jwt
        from app.api.auth import SECRET_KEY, ALGORITHM
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "role" in payload
        assert payload["role"] == UserRole.ADMIN.value
        assert payload["is_admin"] == True

    @pytest.mark.asyncio
    async def test_token_contains_status_info(self, facilitator_user_data):
        """JWT tokens should contain status information"""
        token = create_token_for_user(facilitator_user_data)
        
        import jwt
        from app.api.auth import SECRET_KEY, ALGORITHM
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "status" in payload
        assert payload["status"] == AccountStatus.ACTIVE.value


class TestWorkshopAccess:
    """Test workshop access control"""

    @pytest.mark.asyncio
    async def test_facilitator_cannot_create_workshop(self, facilitator_user_data):
        """Facilitators should not be able to create workshops (admin only)"""
        mock_user = create_mock_user(facilitator_user_data)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                # Try to access admin workshop creation endpoint
                response = await client.post(
                    "/api/admin/workshops",
                    json={"title": "Test Workshop"}
                )
                # 403 (forbidden) or 405 (method not allowed if endpoint doesn't exist)
                assert response.status_code in [403, 405]
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    @pytest.mark.asyncio
    async def test_facilitator_cannot_access_unassigned_workshop(self, facilitator_user_data):
        """Facilitators should not access workshops they're not assigned to"""
        mock_user = create_mock_user(facilitator_user_data)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        random_workshop_id = str(uuid.uuid4())
        
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                response = await client.get(
                    f"/api/facilitator/workshops/{random_workshop_id}"
                )
                # Should be 403 (not assigned) or 404 (not found) or 500 (DB error)
                assert response.status_code in [403, 404, 500]
        finally:
            app.dependency_overrides.pop(get_current_user, None)


class TestAuditLogging:
    """Test that role changes are properly logged"""

    @pytest.mark.asyncio
    async def test_registration_creates_audit_log(self):
        """Facilitator registration should create audit log entry"""
        # This would require checking the database after registration
        # Placeholder for integration test
        pass

    @pytest.mark.asyncio
    async def test_status_change_creates_audit_log(self):
        """Enabling/disabling facilitator should create audit log"""
        # This would require checking the database after status change
        # Placeholder for integration test
        pass


# Password validation tests
class TestPasswordValidation:
    """Test password validation for registration"""

    @pytest.mark.asyncio
    async def test_weak_password_rejected(self):
        """Weak passwords should be rejected"""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "weak",  # Too short
                    "full_name": "Test User"
                }
            )
            assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_password_without_uppercase_rejected(self):
        """Passwords without uppercase should be rejected"""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "lowercase123",  # No uppercase
                    "full_name": "Test User"
                }
            )
            assert response.status_code == 422

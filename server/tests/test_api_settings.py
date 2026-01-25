"""
Integration tests for Settings API
Tests US33: Database-Driven Configuration Management API endpoints
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import User
from app.models.rbac import UserRole, AccountStatus
from app.services import settings_service
from app.api.auth import hash_password


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user for testing"""
    user = User(
        email="admin@test.com",
        password_hash=hash_password("adminpass123"),
        full_name="Admin User",
        role=UserRole.ADMIN,
        status=AccountStatus.ACTIVE
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def facilitator_user(db_session: AsyncSession) -> User:
    """Create a facilitator user for testing"""
    user = User(
        email="facilitator@test.com",
        password_hash=hash_password("facilitatorpass123"),
        full_name="Facilitator User",
        role=UserRole.FACILITATOR,
        status=AccountStatus.ACTIVE
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_token(client: AsyncClient, admin_user: User) -> str:
    """Get authentication token for admin user"""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "admin@test.com",
            "password": "adminpass123"
        }
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
async def facilitator_token(client: AsyncClient, facilitator_user: User) -> str:
    """Get authentication token for facilitator user"""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "facilitator@test.com",
            "password": "facilitatorpass123"
        }
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
@pytest.mark.integration
class TestSettingsAPI:
    """Integration tests for settings API endpoints"""

    async def test_get_all_settings_as_admin(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test getting all settings as admin"""
        # Seed settings
        await settings_service.seed_default_settings(db_session)
        
        response = await client.get(
            "/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "settings" in data
        assert "categories" in data
        assert len(data["settings"]) > 0
        assert len(data["categories"]) > 0

    async def test_get_settings_by_category(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test filtering settings by category"""
        await settings_service.seed_default_settings(db_session)
        
        response = await client.get(
            "/api/admin/settings?category=rate_limiting",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["settings"]) > 0
        for setting in data["settings"]:
            assert setting["category"] == "rate_limiting"

    async def test_get_settings_requires_admin(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        facilitator_token: str
    ):
        """Test that non-admin cannot access settings"""
        response = await client.get(
            "/api/admin/settings",
            headers={"Authorization": f"Bearer {facilitator_token}"}
        )
        
        assert response.status_code == 403

    async def test_get_specific_setting(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test getting a specific setting by key"""
        await settings_service.seed_default_settings(db_session)
        
        response = await client.get(
            "/api/admin/settings/rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["key"] == "rate_limit.registration.daily"
        assert data["value"] == 10

    async def test_get_nonexistent_setting(
        self,
        client: AsyncClient,
        admin_token: str
    ):
        """Test getting a setting that doesn't exist"""
        response = await client.get(
            "/api/admin/settings/nonexistent.setting",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404

    async def test_update_setting(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test updating a setting value"""
        await settings_service.seed_default_settings(db_session)
        
        response = await client.put(
            "/api/admin/settings/rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"value": 15}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["value"] == 15

    async def test_update_setting_validation_error(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test that validation errors are returned"""
        await settings_service.seed_default_settings(db_session)
        
        response = await client.put(
            "/api/admin/settings/rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"value": 9999}  # Exceeds max
        )
        
        assert response.status_code == 400
        assert "detail" in response.json()

    async def test_update_setting_creates_audit_log(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test that updating creates audit log"""
        await settings_service.seed_default_settings(db_session)
        
        # Update setting
        await client.put(
            "/api/admin/settings/rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"value": 20}
        )
        
        # Check audit log
        response = await client.get(
            "/api/admin/settings/audit/log?setting_key=rate_limit.registration.daily&limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["entries"]) > 0
        assert data["entries"][0]["setting_key"] == "rate_limit.registration.daily"
        assert data["entries"][0]["new_value"] == 20

    async def test_reset_setting_to_default(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test resetting a setting to default"""
        await settings_service.seed_default_settings(db_session)
        
        # Update setting
        await client.put(
            "/api/admin/settings/rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"value": 50}
        )
        
        # Reset to default
        response = await client.post(
            "/api/admin/settings/rate_limit.registration.daily/reset",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["value"] == data["default_value"]

    async def test_get_audit_log(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test retrieving audit log"""
        await settings_service.seed_default_settings(db_session)
        
        # Make some changes
        await client.put(
            "/api/admin/settings/rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"value": 15}
        )
        
        # Get audit log
        response = await client.get(
            "/api/admin/settings/audit/log",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "total" in data

    async def test_invalidate_cache(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test cache invalidation endpoint"""
        await settings_service.seed_default_settings(db_session)
        
        response = await client.post(
            "/api/admin/settings/cache/invalidate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    async def test_invalidate_specific_cache(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test invalidating cache for specific key"""
        await settings_service.seed_default_settings(db_session)
        
        response = await client.post(
            "/api/admin/settings/cache/invalidate?key=rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    async def test_seed_default_settings_endpoint(
        self,
        client: AsyncClient,
        admin_token: str
    ):
        """Test seeding default settings via API"""
        response = await client.post(
            "/api/admin/settings/seed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "message" in data

    async def test_sensitive_settings_masked(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test that sensitive settings are masked in responses"""
        await settings_service.seed_default_settings(db_session)
        
        # Create a sensitive setting
        from app.models.settings import SystemSetting
        sensitive_setting = SystemSetting(
            key="test.sensitive.key",
            value="secret_value",
            value_type="string",
            default_value="default_secret",
            category="security",
            description="A sensitive test setting",
            is_sensitive=True
        )
        db_session.add(sensitive_setting)
        await db_session.commit()
        
        # Get setting
        response = await client.get(
            "/api/admin/settings/test.sensitive.key",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["value"] == "***"  # Masked
        assert data["is_sensitive"] is True

    async def test_concurrent_updates(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test that concurrent updates are handled correctly"""
        await settings_service.seed_default_settings(db_session)
        
        # Make multiple updates
        response1 = await client.put(
            "/api/admin/settings/rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"value": 15}
        )
        
        response2 = await client.put(
            "/api/admin/settings/rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"value": 20}
        )
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Final value should be from last update
        response = await client.get(
            "/api/admin/settings/rate_limit.registration.daily",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.json()["value"] == 20

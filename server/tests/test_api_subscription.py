"""
Integration tests for Subscription and Feature Flag APIs
Tests US33: Subscription Tiers and Feature Flags
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import SubscriptionTier, FeatureFlag, FeatureFlagOverride
from app.models.organization import Organization


@pytest.fixture
async def sample_organization(db_session: AsyncSession) -> Organization:
    """Create a sample organization for testing"""
    org = Organization(
        name="Test Organization",
        slug="test-org",
        tier="FREE"
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


@pytest.mark.asyncio
@pytest.mark.integration
class TestSubscriptionTiersAPI:
    """Integration tests for subscription tiers API"""

    async def test_list_subscription_tiers(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test listing all subscription tiers"""
        # Create a tier
        tier = SubscriptionTier(
            name="TEST_TIER",
            display_name="Test Tier",
            description="A test tier",
            max_users=10,
            max_workshops_per_month=5,
            max_participants_per_workshop=30,
            max_use_cases_per_workshop=150,
            features=["feature1", "feature2"],
            price_monthly=19.99,
            price_yearly=199.99
        )
        db_session.add(tier)
        await db_session.commit()
        
        response = await client.get(
            "/api/admin/tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert any(t["name"] == "TEST_TIER" for t in data)

    async def test_create_subscription_tier(
        self,
        client: AsyncClient,
        admin_token: str
    ):
        """Test creating a new subscription tier"""
        tier_data = {
            "name": "CUSTOM",
            "display_name": "Custom Plan",
            "description": "A custom plan",
            "max_users": 25,
            "max_workshops_per_month": 12,
            "max_participants_per_workshop": 60,
            "max_use_cases_per_workshop": 250,
            "features": ["feature1", "feature2", "feature3"],
            "price_monthly": 49.99,
            "price_yearly": 499.99,
            "sort_order": 5
        }
        
        response = await client.post(
            "/api/admin/tiers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=tier_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "CUSTOM"
        assert data["max_users"] == 25
        assert len(data["features"]) == 3

    async def test_create_duplicate_tier_fails(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test that creating duplicate tier fails"""
        # Create first tier
        tier = SubscriptionTier(
            name="DUPLICATE",
            display_name="Duplicate",
            max_users=5,
            max_workshops_per_month=3,
            max_participants_per_workshop=25,
            max_use_cases_per_workshop=100
        )
        db_session.add(tier)
        await db_session.commit()
        
        # Try to create duplicate
        response = await client.post(
            "/api/admin/tiers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "DUPLICATE",
                "display_name": "Another Duplicate",
                "max_users": 10,
                "max_workshops_per_month": 5,
                "max_participants_per_workshop": 30,
                "max_use_cases_per_workshop": 150
            }
        )
        
        assert response.status_code == 400

    async def test_update_subscription_tier(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test updating a subscription tier"""
        # Create tier
        tier = SubscriptionTier(
            name="UPDATE_TEST",
            display_name="Update Test",
            max_users=10,
            max_workshops_per_month=5,
            max_participants_per_workshop=30,
            max_use_cases_per_workshop=150,
            price_monthly=29.99
        )
        db_session.add(tier)
        await db_session.commit()
        await db_session.refresh(tier)
        
        # Update tier
        response = await client.put(
            f"/api/admin/tiers/{tier.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "price_monthly": 39.99,
                "max_users": 15
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["price_monthly"] == 39.99
        assert data["max_users"] == 15

    async def test_delete_subscription_tier(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test soft deleting a subscription tier"""
        # Create tier
        tier = SubscriptionTier(
            name="DELETE_TEST",
            display_name="Delete Test",
            max_users=10,
            max_workshops_per_month=5,
            max_participants_per_workshop=30,
            max_use_cases_per_workshop=150
        )
        db_session.add(tier)
        await db_session.commit()
        await db_session.refresh(tier)
        
        # Delete tier
        response = await client.delete(
            f"/api/admin/tiers/{tier.id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 204
        
        # Verify soft delete
        await db_session.refresh(tier)
        assert tier.is_active is False


@pytest.mark.asyncio
@pytest.mark.integration
class TestFeatureFlagsAPI:
    """Integration tests for feature flags API"""

    async def test_list_feature_flags(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test listing all feature flags"""
        # Create a flag
        flag = FeatureFlag(
            name="test_feature",
            display_name="Test Feature",
            description="A test feature",
            default_enabled=True
        )
        db_session.add(flag)
        await db_session.commit()
        
        response = await client.get(
            "/api/admin/feature-flags",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert any(f["name"] == "test_feature" for f in data)

    async def test_create_feature_flag(
        self,
        client: AsyncClient,
        admin_token: str
    ):
        """Test creating a new feature flag"""
        flag_data = {
            "name": "new_feature",
            "display_name": "New Feature",
            "description": "A brand new feature",
            "default_enabled": False
        }
        
        response = await client.post(
            "/api/admin/feature-flags",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=flag_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "new_feature"
        assert data["default_enabled"] is False

    async def test_create_duplicate_flag_fails(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test that creating duplicate flag fails"""
        # Create first flag
        flag = FeatureFlag(
            name="duplicate_flag",
            display_name="Duplicate",
            default_enabled=True
        )
        db_session.add(flag)
        await db_session.commit()
        
        # Try to create duplicate
        response = await client.post(
            "/api/admin/feature-flags",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "duplicate_flag",
                "display_name": "Another Duplicate",
                "default_enabled": False
            }
        )
        
        assert response.status_code == 400

    async def test_update_feature_flag(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test updating a feature flag"""
        # Create flag
        flag = FeatureFlag(
            name="update_test",
            display_name="Update Test",
            default_enabled=False
        )
        db_session.add(flag)
        await db_session.commit()
        
        # Update flag
        response = await client.put(
            "/api/admin/feature-flags/update_test",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "default_enabled": True,
                "description": "Updated description"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["default_enabled"] is True
        assert data["description"] == "Updated description"

    async def test_list_feature_flag_overrides(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str,
        sample_organization: Organization
    ):
        """Test listing overrides for a feature flag"""
        # Create flag
        flag = FeatureFlag(
            name="override_test",
            display_name="Override Test",
            default_enabled=False
        )
        db_session.add(flag)
        await db_session.flush()
        
        # Create override
        override = FeatureFlagOverride(
            flag_id=flag.id,
            organization_id=sample_organization.id,
            is_enabled=True
        )
        db_session.add(override)
        await db_session.commit()
        
        # List overrides
        response = await client.get(
            "/api/admin/feature-flags/override_test/overrides",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert data[0]["is_enabled"] is True

    async def test_create_feature_flag_override(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str,
        sample_organization: Organization
    ):
        """Test creating a feature flag override"""
        # Create flag
        flag = FeatureFlag(
            name="override_create_test",
            display_name="Override Create Test",
            default_enabled=False
        )
        db_session.add(flag)
        await db_session.commit()
        
        # Create override
        response = await client.post(
            "/api/admin/feature-flags/override_create_test/override",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "organization_id": str(sample_organization.id),
                "is_enabled": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_enabled"] is True
        assert data["organization_id"] == str(sample_organization.id)

    async def test_update_existing_override(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str,
        sample_organization: Organization
    ):
        """Test updating an existing override"""
        # Create flag and override
        flag = FeatureFlag(
            name="override_update_test",
            display_name="Override Update Test",
            default_enabled=False
        )
        db_session.add(flag)
        await db_session.flush()
        
        override = FeatureFlagOverride(
            flag_id=flag.id,
            organization_id=sample_organization.id,
            is_enabled=True
        )
        db_session.add(override)
        await db_session.commit()
        
        # Update override (should update existing, not create new)
        response = await client.post(
            "/api/admin/feature-flags/override_update_test/override",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "organization_id": str(sample_organization.id),
                "is_enabled": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_enabled"] is False

    async def test_delete_feature_flag_override(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str,
        sample_organization: Organization
    ):
        """Test deleting a feature flag override"""
        # Create flag and override
        flag = FeatureFlag(
            name="override_delete_test",
            display_name="Override Delete Test",
            default_enabled=False
        )
        db_session.add(flag)
        await db_session.flush()
        
        override = FeatureFlagOverride(
            flag_id=flag.id,
            organization_id=sample_organization.id,
            is_enabled=True
        )
        db_session.add(override)
        await db_session.commit()
        
        # Delete override
        response = await client.delete(
            f"/api/admin/feature-flags/override_delete_test/override/{sample_organization.id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 204

    async def test_override_nonexistent_organization_fails(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        admin_token: str
    ):
        """Test that creating override for nonexistent org fails"""
        # Create flag
        flag = FeatureFlag(
            name="override_fail_test",
            display_name="Override Fail Test",
            default_enabled=False
        )
        db_session.add(flag)
        await db_session.commit()
        
        # Try to create override with fake org ID
        response = await client.post(
            "/api/admin/feature-flags/override_fail_test/override",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "organization_id": "00000000-0000-0000-0000-000000000000",
                "is_enabled": True
            }
        )
        
        assert response.status_code == 404

    async def test_feature_flags_require_admin(
        self,
        client: AsyncClient,
        facilitator_token: str
    ):
        """Test that feature flag endpoints require admin"""
        response = await client.get(
            "/api/admin/feature-flags",
            headers={"Authorization": f"Bearer {facilitator_token}"}
        )
        
        assert response.status_code == 403

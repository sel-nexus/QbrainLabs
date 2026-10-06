"""
Unit tests for Settings Service
Tests US33: Database-Driven Configuration Management
"""
import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import settings_service
from app.models.settings import SystemSetting, SettingsAuditLog, DEFAULT_SYSTEM_SETTINGS


@pytest.mark.asyncio
class TestSettingsService:
    """Test settings service functionality"""

    async def test_seed_default_settings(self, db_session: AsyncSession):
        """Test seeding default settings"""
        count = await settings_service.seed_default_settings(db_session)
        
        assert count > 0
        assert count == len(DEFAULT_SYSTEM_SETTINGS)

    async def test_get_setting(self, db_session: AsyncSession):
        """Test retrieving a setting value"""
        # Seed settings first
        await settings_service.seed_default_settings(db_session)
        
        # Get a setting
        value = await settings_service.get_setting(
            db_session, 
            "rate_limit.registration.daily",
            default=5
        )
        
        assert value is not None
        assert isinstance(value, int)
        assert value == 10  # Default value from seed data

    async def test_get_setting_with_cache(self, db_session: AsyncSession):
        """Test that caching works"""
        await settings_service.seed_default_settings(db_session)
        
        # First call - should hit database
        value1 = await settings_service.get_setting(
            db_session,
            "rate_limit.registration.daily",
            use_cache=True
        )
        
        # Second call - should hit cache
        value2 = await settings_service.get_setting(
            db_session,
            "rate_limit.registration.daily",
            use_cache=True
        )
        
        assert value1 == value2

    async def test_get_setting_default_fallback(self, db_session: AsyncSession):
        """Test fallback to default when setting doesn't exist"""
        value = await settings_service.get_setting(
            db_session,
            "nonexistent.setting",
            default=42
        )
        
        assert value == 42

    async def test_update_setting(self, db_session: AsyncSession, make_user):
        admin_id = str((await make_user(role="admin")).id)
        """Test updating a setting value"""
        await settings_service.seed_default_settings(db_session)
        
        # Update setting
        updated = await settings_service.update_setting(
            db_session,
            "rate_limit.registration.daily",
            15,
            updated_by=admin_id,
            ip_address="127.0.0.1"
        )
        
        assert updated is not None
        assert updated.value == 15
        assert str(updated.updated_by) == admin_id

    async def test_update_setting_creates_audit_log(self, db_session: AsyncSession, make_user):
        admin_id = str((await make_user(role="admin")).id)
        """Test that updating creates audit log entry"""
        await settings_service.seed_default_settings(db_session)
        
        # Update setting
        await settings_service.update_setting(
            db_session,
            "rate_limit.registration.daily",
            20,
            updated_by=admin_id,
            ip_address="127.0.0.1"
        )
        
        # Check audit log
        logs = await settings_service.get_settings_audit_log(
            db_session,
            setting_key="rate_limit.registration.daily",
            limit=1
        )
        
        assert len(logs) > 0
        assert logs[0].setting_key == "rate_limit.registration.daily"
        assert logs[0].new_value == 20
        assert str(logs[0].changed_by) == admin_id

    async def test_update_setting_validation(self, db_session: AsyncSession, make_user):
        admin_id = str((await make_user(role="admin")).id)
        """Test that validation rules are enforced"""
        await settings_service.seed_default_settings(db_session)
        
        # Try to set value outside validation range
        with pytest.raises(ValueError):
            await settings_service.update_setting(
                db_session,
                "rate_limit.registration.daily",
                9999,  # Exceeds max of 1000
                updated_by=admin_id
            )

    async def test_reset_setting_to_default(self, db_session: AsyncSession, make_user):
        admin_id = str((await make_user(role="admin")).id)
        """Test resetting a setting to default value"""
        await settings_service.seed_default_settings(db_session)
        
        # Update setting
        await settings_service.update_setting(
            db_session,
            "rate_limit.registration.daily",
            50
        )
        
        # Reset to default
        reset = await settings_service.reset_setting_to_default(
            db_session,
            "rate_limit.registration.daily",
            updated_by=admin_id
        )
        
        assert reset is not None
        assert reset.value == reset.default_value

    async def test_get_settings_by_category(self, db_session: AsyncSession):
        """Test retrieving settings by category"""
        await settings_service.seed_default_settings(db_session)
        
        settings = await settings_service.get_settings_by_category(
            db_session,
            "rate_limiting"
        )
        
        assert len(settings) > 0
        for setting in settings:
            assert setting.category == "rate_limiting"

    async def test_get_all_settings(self, db_session: AsyncSession):
        """Test retrieving all settings"""
        await settings_service.seed_default_settings(db_session)
        
        settings = await settings_service.get_all_settings(db_session)
        
        assert len(settings) == len(DEFAULT_SYSTEM_SETTINGS)

    async def test_get_rate_limit(self, db_session: AsyncSession):
        """Test get_rate_limit helper"""
        await settings_service.seed_default_settings(db_session)
        
        daily = await settings_service.get_rate_limit(db_session, "daily")
        weekly = await settings_service.get_rate_limit(db_session, "weekly")
        monthly = await settings_service.get_rate_limit(db_session, "monthly")
        
        assert daily == 10
        assert weekly == 20
        assert monthly == 50

    async def test_get_password_rules(self, db_session: AsyncSession):
        """Test get_password_rules helper"""
        await settings_service.seed_default_settings(db_session)
        
        rules = await settings_service.get_password_rules(db_session)
        
        assert "min_length" in rules
        assert "max_length" in rules
        assert "require_uppercase" in rules
        assert rules["min_length"] == 8
        assert rules["require_uppercase"] is True

    async def test_is_feature_enabled(self, db_session: AsyncSession):
        """Test is_feature_enabled helper"""
        await settings_service.seed_default_settings(db_session)
        
        ai_enabled = await settings_service.is_feature_enabled(
            db_session,
            "ai_enhancement"
        )
        
        assert ai_enabled is True

    async def test_get_limit(self, db_session: AsyncSession):
        """Test get_limit helper"""
        await settings_service.seed_default_settings(db_session)
        
        max_facilitators = await settings_service.get_limit(
            db_session,
            "workshop.max_facilitators"
        )
        
        assert max_facilitators == 10

    async def test_cache_invalidation(self, db_session: AsyncSession):
        """Test cache invalidation"""
        await settings_service.seed_default_settings(db_session)
        
        # Get setting (caches it)
        value1 = await settings_service.get_setting(
            db_session,
            "rate_limit.registration.daily",
            use_cache=True
        )
        
        # Invalidate cache
        settings_service.invalidate_cache("rate_limit.registration.daily")
        
        # Update in database
        await settings_service.update_setting(
            db_session,
            "rate_limit.registration.daily",
            25
        )
        
        # Get again (should get new value)
        value2 = await settings_service.get_setting(
            db_session,
            "rate_limit.registration.daily",
            use_cache=False
        )
        
        assert value2 == 25

    async def test_cache_invalidation_all(self, db_session: AsyncSession):
        """Test invalidating all cache"""
        await settings_service.seed_default_settings(db_session)
        
        # Cache some settings
        await settings_service.get_setting(db_session, "rate_limit.registration.daily")
        await settings_service.get_setting(db_session, "security.password.min_length")
        
        # Invalidate all
        settings_service.invalidate_cache()
        
        # Cache should be empty (tested implicitly by next calls hitting DB)
        value = await settings_service.get_setting(
            db_session,
            "rate_limit.registration.daily",
            use_cache=True
        )
        
        assert value is not None

    async def test_validation_rules_number_type(self, db_session: AsyncSession):
        """Test validation for number type settings"""
        await settings_service.seed_default_settings(db_session)
        
        # Valid update
        updated = await settings_service.update_setting(
            db_session,
            "rate_limit.registration.daily",
            15
        )
        assert updated.value == 15
        
        # Invalid: below minimum
        with pytest.raises(ValueError, match="at least"):
            await settings_service.update_setting(
                db_session,
                "rate_limit.registration.daily",
                0
            )
        
        # Invalid: above maximum
        with pytest.raises(ValueError, match="at most"):
            await settings_service.update_setting(
                db_session,
                "rate_limit.registration.daily",
                2000
            )

    async def test_validation_rules_boolean_type(self, db_session: AsyncSession):
        """Test validation for boolean type settings"""
        await settings_service.seed_default_settings(db_session)
        
        # Valid update
        updated = await settings_service.update_setting(
            db_session,
            "security.password.require_uppercase",
            False
        )
        assert updated.value is False
        
        # Invalid: wrong type
        with pytest.raises(ValueError, match="boolean"):
            await settings_service.update_setting(
                db_session,
                "security.password.require_uppercase",
                "yes"
            )

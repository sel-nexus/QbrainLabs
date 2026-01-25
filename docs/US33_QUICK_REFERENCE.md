# US33 Quick Reference Guide

## Admin Settings UI

### Accessing Settings
1. Log in as admin
2. Navigate to **Admin Panel** → **System Settings** (or `/admin/settings`)
3. Select a category tab:
   - **Rate Limiting** - Registration rate limits
   - **Security** - Password requirements
   - **Limits** - Workshop/participant/use case limits
   - **Features** - Feature toggles

### Editing Settings
1. Click on the input field to edit
2. Modify the value (respects validation rules)
3. Click **Save** button
4. Changes take effect immediately (cache is invalidated)

### Resetting to Default
- Click the **reset icon** (↻) next to any setting
- Confirm the action
- Setting reverts to its default value

## API Usage Examples

### System Settings

```bash
# Get all settings
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/settings

# Get settings by category
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/settings?category=rate_limiting

# Update a setting
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": 15}' \
  http://localhost:8000/api/admin/settings/rate_limit.registration.daily

# Reset to default
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/settings/rate_limit.registration.daily/reset

# View audit log
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/settings/audit/log?limit=50
```

### Subscription Tiers

```bash
# List all tiers
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/tiers

# Create new tier
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PREMIUM",
    "display_name": "Premium",
    "description": "Premium features for power users",
    "max_users": 25,
    "max_workshops_per_month": 15,
    "max_participants_per_workshop": 75,
    "max_use_cases_per_workshop": 300,
    "features": ["basic_surveys", "advanced_analytics", "export_csv", "export_pdf"],
    "price_monthly": 49,
    "price_yearly": 490,
    "sort_order": 2
  }' \
  http://localhost:8000/api/admin/tiers

# Update tier
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price_monthly": 59, "price_yearly": 590}' \
  http://localhost:8000/api/admin/tiers/{tier_id}

# Soft delete tier
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/tiers/{tier_id}
```

### Feature Flags

```bash
# List all feature flags
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/feature-flags

# Create new flag
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "beta_feature_x",
    "display_name": "Beta Feature X",
    "description": "New experimental feature",
    "default_enabled": false
  }' \
  http://localhost:8000/api/admin/feature-flags

# Toggle flag globally
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"default_enabled": true}' \
  http://localhost:8000/api/admin/feature-flags/ai_enhancement

# List overrides for a flag
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/feature-flags/ai_enhancement/overrides

# Create organization override
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org-uuid-here",
    "is_enabled": true
  }' \
  http://localhost:8000/api/admin/feature-flags/ai_enhancement/override

# Delete override
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/feature-flags/ai_enhancement/override/{org_id}
```

## Using Settings in Code

### Backend (Python)

```python
from app.services import settings_service

# Get a setting value
async def my_function(db: AsyncSession):
    # Get rate limit
    daily_limit = await settings_service.get_rate_limit(db, "daily")
    
    # Get password rules
    password_rules = await settings_service.get_password_rules(db)
    
    # Check if feature is enabled
    if await settings_service.is_feature_enabled(db, "ai_enhancement"):
        # Feature is enabled
        pass
    
    # Get a limit
    max_participants = await settings_service.get_limit(db, "workshop.max_participants")
    
    # Get any setting by key
    value = await settings_service.get_setting(db, "features.export_pdf", default=True)
```

### Invalidating Cache

```python
from app.services import settings_service

# Invalidate specific setting
settings_service.invalidate_cache("rate_limit.registration.daily")

# Invalidate all settings
settings_service.invalidate_cache()
```

## Default Values

### Subscription Tiers

| Tier | Users | Workshops/Month | Participants | Use Cases | Price/Month |
|------|-------|----------------|--------------|-----------|-------------|
| FREE | 5 | 3 | 25 | 100 | $0 |
| STARTER | 15 | 10 | 50 | 200 | $29 |
| PROFESSIONAL | 50 | 25 | 100 | 500 | $99 |
| ENTERPRISE | Unlimited | Unlimited | Unlimited | Unlimited | $299 |

### Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| ai_enhancement | ✅ Enabled | AI-powered use case enhancement |
| survey_management | ✅ Enabled | Survey creation and management |
| knowledge_base | ✅ Enabled | Access to AI knowledge base |
| export_pdf | ✅ Enabled | PDF export functionality |
| export_csv | ✅ Enabled | CSV export functionality |
| websocket_realtime | ✅ Enabled | Real-time collaboration |
| marketplace | ❌ Disabled | Template marketplace |
| advanced_analytics | ✅ Enabled | Advanced analytics features |
| custom_branding | ❌ Disabled | Custom organization branding |

### System Settings

#### Rate Limiting
- `rate_limit.registration.daily` = 10
- `rate_limit.registration.weekly` = 20
- `rate_limit.registration.monthly` = 50

#### Security
- `security.password.min_length` = 8
- `security.password.max_length` = 128
- `security.password.require_uppercase` = true
- `security.password.require_lowercase` = true
- `security.password.require_digit` = true
- `security.password.require_special` = false

#### Limits
- `limits.workshop.max_facilitators` = 10
- `limits.workshop.max_participants` = 100
- `limits.workshop.max_use_cases` = 200

#### Features
- `features.ai_enhancement` = true
- `features.knowledge_base` = true
- `features.survey_management` = true
- `features.export_pdf` = true
- `features.export_csv` = true

## Database Tables

### subscription_tiers
```sql
SELECT * FROM subscription_tiers ORDER BY sort_order;
```

### feature_flags
```sql
SELECT * FROM feature_flags WHERE is_active = true;
```

### feature_flag_overrides
```sql
SELECT ffo.*, ff.name, o.name as org_name
FROM feature_flag_overrides ffo
JOIN feature_flags ff ON ffo.flag_id = ff.id
JOIN organizations o ON ffo.organization_id = o.id;
```

### system_settings
```sql
SELECT * FROM system_settings ORDER BY category, key;
```

### settings_audit_log
```sql
SELECT * FROM settings_audit_log 
ORDER BY changed_at DESC 
LIMIT 50;
```

### kb_industries
```sql
SELECT * FROM kb_industries WHERE is_active = true ORDER BY sort_order;
```

### kb_use_cases
```sql
SELECT kbu.*, kbi.name as industry_name
FROM kb_use_cases kbu
JOIN kb_industries kbi ON kbu.industry_id = kbi.id
WHERE kbu.is_active = true;
```

## Troubleshooting

### Settings not updating
1. Check cache TTL (default 60 seconds)
2. Manually invalidate cache via API:
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/admin/settings/cache/invalidate
   ```

### Migration issues
```bash
# Re-run migration
cd server
python migrations/us33_subscription_kb.py

# Check database
psql -d hotspot_matrix -c "SELECT * FROM system_settings LIMIT 5;"
```

### Feature flag not working
1. Check if flag exists: `GET /api/admin/feature-flags`
2. Check if organization has override
3. Verify `is_active = true` on the flag

## Best Practices

1. **Always use the settings service** - Don't query database directly
2. **Cache invalidation** - Invalidate cache after bulk updates
3. **Audit logging** - All changes are automatically logged
4. **Validation** - Respect validation rules when updating settings
5. **Defaults** - Always provide fallback defaults in code
6. **Feature flags** - Use for gradual rollouts and A/B testing
7. **Tiers** - Update tier limits as business needs change

## Security Notes

- All endpoints require admin authentication
- IP addresses are logged for audit trail
- Sensitive settings are masked in responses
- Validation prevents dangerous values
- Rate limits are bounded to prevent abuse

## Support

For issues or questions:
1. Check the implementation summary: `docs/US33_IMPLEMENTATION_SUMMARY.md`
2. Review the checklist: `docs/US33_CHECKLIST.md`
3. Check the original user story: `docs/userstories/US33_Database_Driven_Configuration.md`

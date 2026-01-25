# US33: Database-Driven Configuration Management

**Epic:** Platform Operations & Administration  
**Module:** Configuration, System Settings, Knowledge Base  
**Story Type:** Enhancement  
**Priority:** Medium  
**Story Points:** 13  
**Status:** 📋 PLANNED  
**Target Sprint:** Sprint 17

---

## User Story

**As a** System Administrator,  
**I want to** manage application configurations, rate limits, and reference data through the database,  
**So that** I can modify system behavior without code deployments and enable dynamic, tenant-aware settings.

---

## Description

This enhancement migrates hardcoded configurations, static JSON data files, and system constants to PostgreSQL database tables. This enables:

1. **Dynamic Configuration** - Modify rate limits, password policies, and feature flags without redeployment
2. **Admin UI Management** - Configure system settings through the admin dashboard
3. **Tenant-Aware Settings** - Enable organization-specific configurations
4. **Knowledge Base CRUD** - Manage AI use case templates directly in the database

---

## Current State Analysis

### Items Currently Hardcoded

| Item | Location | Type |
|------|----------|------|
| Rate Limits (10/20/50) | `app/services/rate_limiting.py` | Constants |
| Password Rules | `app/core/security.py` | Class constants |
| Category Keywords | `app/api/knowledge_base.py` | Dict |
| Complexity Rules | `app/api/knowledge_base.py` | Dict |
| Timeline Estimates | `app/api/knowledge_base.py` | Dict |
| Security Headers | `app/core/security.py` | Dict |

### Items Currently in JSON Files

| File | Size | Description |
|------|------|-------------|
| `knowledge_base.json` | 132KB | AI use case templates by industry |
| `ai_use_cases.json` | 1.2KB | RAG reference data |
| `survey_templates.json` | 19KB | Already has seeder (partial migration) |

### Items with Implicit Defaults

| Item | Location | Default Value |
|------|----------|---------------|
| Subscription Tier Limits | `models/organization.py` | max_users=5, max_workshops=3 |
| Feature Flags | `.env.example` | ENABLE_AI_FEATURES=true |

---

## Requirements

### 1. System Settings Table

Create a centralized key-value configuration store for runtime-configurable settings.

**Settings Categories:**
- `rate_limiting` - Registration rate limits
- `security` - Password policies, session timeouts
- `features` - Feature flags
- `notifications` - Email/alert thresholds
- `limits` - System-wide limits

**Admin Capabilities:**
- View all system settings with descriptions
- Edit values with validation
- View change history (audit log)
- Reset to defaults

**Settings UI:**
```
┌─────────────────────────────────────────────────────────┐
│  Admin Panel > System Settings                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  RATE LIMITING                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ Registration - Daily Limit                         ││
│  │ Current: [10___] (Default: 10)                     ││
│  │ Max new facilitator registrations per 24 hours    ││
│  ├────────────────────────────────────────────────────┤│
│  │ Registration - Weekly Limit                        ││
│  │ Current: [20___] (Default: 20)                     ││
│  │ Max new facilitator registrations per 7 days      ││
│  ├────────────────────────────────────────────────────┤│
│  │ Registration - Monthly Limit                       ││
│  │ Current: [50___] (Default: 50)                     ││
│  │ Max new facilitator registrations per 30 days     ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  SECURITY                                               │
│  ┌────────────────────────────────────────────────────┐│
│  │ Password - Minimum Length                          ││
│  │ Current: [8____] (Default: 8)                      ││
│  ├────────────────────────────────────────────────────┤│
│  │ Password - Require Uppercase                       ││
│  │ Current: [✓] Enabled                              ││
│  ├────────────────────────────────────────────────────┤│
│  │ Password - Require Special Character              ││
│  │ Current: [ ] Disabled                             ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  [Save Changes] [Reset to Defaults]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 2. Subscription Tiers Table

Define subscription tiers with configurable limits instead of hardcoded defaults.

**Tier Attributes:**
- Name and display name
- Max users per organization
- Max workshops per month
- Max participants per workshop
- Enabled features (JSONB)
- Price (if applicable)

**Default Tiers:**
| Tier | Max Users | Workshops/Mo | Participants | Features |
|------|-----------|--------------|--------------|----------|
| FREE | 5 | 3 | 25 | Basic |
| STARTER | 15 | 10 | 50 | + Analytics |
| PROFESSIONAL | 50 | 25 | 100 | + AI, Export |
| ENTERPRISE | Unlimited | Unlimited | Unlimited | All |

---

### 3. Feature Flags Table

Enable/disable features globally or per-organization.

**Flag Types:**
- Global flags (apply to all)
- Organization-specific overrides
- User-specific overrides (future)

**Default Flags:**
- `ai_enhancement` - AI-powered use case refinement
- `survey_management` - Survey creation and analytics
- `knowledge_base` - Access to AI use case library
- `export_pdf` - PDF export capability
- `websocket_realtime` - Real-time collaboration
- `marketplace` - Template marketplace access

---

### 4. Knowledge Base Migration

Migrate `knowledge_base.json` to database tables for CRUD operations.

**New Tables:**
- `kb_industries` - Industry categories
- `kb_use_cases` - Use case templates
- `kb_technologies` - AI technology reference
- `kb_categories` - Use case categories

**Admin Capabilities:**
- Add/edit/delete industries
- Add/edit/delete use case templates
- Manage technology tags
- Import/export as JSON (for backup)

---

### 5. Category Keywords & Rules Tables

Migrate AI categorization logic to configurable tables.

**Tables:**
- `category_keywords` - Keywords for category matching
- `complexity_rules` - Keywords for complexity estimation
- `timeline_rules` - Complexity-to-timeline mapping

---

## Acceptance Criteria

### AC1: System Settings CRUD

**Scenario: Admin views system settings**
```gherkin
Given I am logged in as an Admin
When I navigate to Admin Panel > System Settings
Then I see all configurable settings grouped by category
And each setting shows its current value and default
And I can see a description of what each setting controls
```

**Scenario: Admin updates a rate limit**
```gherkin
Given I am on the System Settings page
When I change "Registration - Daily Limit" from 10 to 15
And I click "Save Changes"
Then the setting is updated in the database
And new registrations use the new limit of 15
And an audit log entry is created
```

**Scenario: Invalid setting value rejected**
```gherkin
Given I am editing system settings
When I enter a negative value for "Daily Limit"
And I click "Save Changes"
Then I see validation error "Value must be positive"
And the setting is not saved
```

---

### AC2: Subscription Tier Management

**Scenario: Admin creates new tier**
```gherkin
Given I am on Admin Panel > Subscription Tiers
When I click "Add Tier"
And I enter name "TEAM" with max_users=25, max_workshops=15
And I click "Save"
Then the new tier is created
And it appears in the tier list
And organizations can be assigned to this tier
```

**Scenario: Tier limits are enforced**
```gherkin
Given organization "Acme Corp" is on FREE tier (max 3 workshops/month)
And they have created 3 workshops this month
When they try to create another workshop
Then they see "Monthly workshop limit reached (3/3)"
And they are prompted to upgrade their plan
```

---

### AC3: Feature Flags

**Scenario: Disable feature globally**
```gherkin
Given feature "ai_enhancement" is globally enabled
When Admin disables "ai_enhancement"
Then the AI Magic Wand button disappears for all users
And the /api/ai/enhance endpoint returns 403
```

**Scenario: Organization-specific override**
```gherkin
Given feature "marketplace" is globally disabled
When Admin enables "marketplace" for organization "Beta Testers"
Then only users in "Beta Testers" can access the marketplace
And other organizations still cannot access it
```

---

### AC4: Knowledge Base CRUD

**Scenario: Admin adds new use case template**
```gherkin
Given I am on Admin Panel > Knowledge Base
When I click "Add Use Case"
And I fill in title, description, industry, category, technologies
And I click "Save"
Then the use case is saved to the database
And it appears in the Knowledge Base search results
And facilitators can use it as a template
```

**Scenario: Admin edits existing use case**
```gherkin
Given there is a use case "Invoice Processing" in the knowledge base
When I update its description and add new technologies
And I click "Save"
Then the changes are persisted
And the updated content is visible to users
```

---

## Technical Implementation

### Database Schema

```sql
-- System Settings (Key-Value Store)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    value_type VARCHAR(20) NOT NULL, -- 'string', 'number', 'boolean', 'json'
    default_value JSONB NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'rate_limiting', 'security', 'features'
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false, -- Hide value in logs
    validation_rules JSONB, -- {"min": 1, "max": 1000}
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_settings_category (category)
);

-- Settings Audit Log
CREATE TABLE settings_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_id UUID REFERENCES system_settings(id),
    setting_key VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    
    INDEX idx_audit_setting (setting_id),
    INDEX idx_audit_time (changed_at)
);

-- Subscription Tiers
CREATE TABLE subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    max_users INT NOT NULL,
    max_workshops_per_month INT NOT NULL,
    max_participants_per_workshop INT NOT NULL,
    max_use_cases_per_workshop INT DEFAULT 100,
    features JSONB DEFAULT '[]', -- List of enabled feature flags
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Feature Flags
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(150),
    description TEXT,
    default_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true, -- Can be used to soft-delete
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(name)
);

-- Feature Flag Overrides (per organization)
CREATE TABLE feature_flag_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(flag_id, organization_id)
);

-- Knowledge Base Industries
CREATE TABLE kb_industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon identifier (e.g., 'stethoscope', 'dollar-sign')
    color VARCHAR(7), -- Hex color
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge Base Use Cases
CREATE TABLE kb_use_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID REFERENCES kb_industries(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100), -- e.g., 'Process Automation', 'Predictive Analytics'
    complexity VARCHAR(20) DEFAULT 'Medium', -- Low, Medium, High
    typical_roi VARCHAR(255),
    implementation_time VARCHAR(100),
    technologies JSONB DEFAULT '[]', -- Array of technology names
    key_benefits JSONB DEFAULT '[]',
    prerequisites JSONB DEFAULT '[]',
    example_kpis JSONB DEFAULT '[]',
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    view_count INT DEFAULT 0,
    usage_count INT DEFAULT 0, -- Times used as template
    created_by VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_kb_industry (industry_id),
    INDEX idx_kb_category (category),
    INDEX idx_kb_complexity (complexity)
);

-- Category Keywords (for AI categorization)
CREATE TABLE category_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    keywords JSONB NOT NULL, -- Array of keywords
    weight DECIMAL(3,2) DEFAULT 1.0, -- Keyword matching weight
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(category)
);

-- Complexity Rules
CREATE TABLE complexity_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complexity VARCHAR(20) NOT NULL, -- Low, Medium, High
    keywords JSONB NOT NULL, -- Keywords that indicate this complexity
    threshold INT DEFAULT 2, -- How many keywords needed to match
    timeline_estimate VARCHAR(50), -- e.g., "1-2 months"
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(complexity)
);
```

### Default Data Seed

```python
# Default system settings
DEFAULT_SETTINGS = [
    # Rate Limiting
    {
        "key": "rate_limit.registration.daily",
        "value": 10,
        "value_type": "number",
        "category": "rate_limiting",
        "description": "Maximum facilitator registrations per 24 hours",
        "validation_rules": {"min": 1, "max": 1000}
    },
    {
        "key": "rate_limit.registration.weekly",
        "value": 20,
        "value_type": "number",
        "category": "rate_limiting",
        "description": "Maximum facilitator registrations per 7 days",
        "validation_rules": {"min": 1, "max": 5000}
    },
    {
        "key": "rate_limit.registration.monthly",
        "value": 50,
        "value_type": "number",
        "category": "rate_limiting",
        "description": "Maximum facilitator registrations per 30 days",
        "validation_rules": {"min": 1, "max": 10000}
    },
    # Security
    {
        "key": "security.password.min_length",
        "value": 8,
        "value_type": "number",
        "category": "security",
        "description": "Minimum password length",
        "validation_rules": {"min": 6, "max": 128}
    },
    {
        "key": "security.password.require_uppercase",
        "value": True,
        "value_type": "boolean",
        "category": "security",
        "description": "Require at least one uppercase letter"
    },
    {
        "key": "security.password.require_lowercase",
        "value": True,
        "value_type": "boolean",
        "category": "security",
        "description": "Require at least one lowercase letter"
    },
    {
        "key": "security.password.require_digit",
        "value": True,
        "value_type": "boolean",
        "category": "security",
        "description": "Require at least one digit"
    },
    {
        "key": "security.password.require_special",
        "value": False,
        "value_type": "boolean",
        "category": "security",
        "description": "Require at least one special character"
    },
    # Limits
    {
        "key": "limits.workshop.max_facilitators",
        "value": 10,
        "value_type": "number",
        "category": "limits",
        "description": "Maximum facilitators per workshop",
        "validation_rules": {"min": 1, "max": 50}
    },
    {
        "key": "limits.workshop.max_participants",
        "value": 100,
        "value_type": "number",
        "category": "limits",
        "description": "Maximum participants per workshop",
        "validation_rules": {"min": 1, "max": 1000}
    },
]

# Default subscription tiers
DEFAULT_TIERS = [
    {
        "name": "FREE",
        "display_name": "Free",
        "max_users": 5,
        "max_workshops_per_month": 3,
        "max_participants_per_workshop": 25,
        "features": ["basic_surveys", "basic_analytics"],
        "price_monthly": 0
    },
    {
        "name": "STARTER",
        "display_name": "Starter",
        "max_users": 15,
        "max_workshops_per_month": 10,
        "max_participants_per_workshop": 50,
        "features": ["basic_surveys", "basic_analytics", "advanced_analytics", "export_csv"],
        "price_monthly": 29
    },
    {
        "name": "PROFESSIONAL",
        "display_name": "Professional",
        "max_users": 50,
        "max_workshops_per_month": 25,
        "max_participants_per_workshop": 100,
        "features": ["basic_surveys", "basic_analytics", "advanced_analytics", 
                     "export_csv", "export_pdf", "ai_enhancement", "knowledge_base"],
        "price_monthly": 99
    },
    {
        "name": "ENTERPRISE",
        "display_name": "Enterprise",
        "max_users": -1,  # Unlimited
        "max_workshops_per_month": -1,
        "max_participants_per_workshop": -1,
        "features": ["all"],
        "price_monthly": 299
    },
]

# Default feature flags
DEFAULT_FEATURE_FLAGS = [
    {"name": "ai_enhancement", "display_name": "AI Use Case Enhancement", "default_enabled": True},
    {"name": "survey_management", "display_name": "Survey Management", "default_enabled": True},
    {"name": "knowledge_base", "display_name": "Knowledge Base Access", "default_enabled": True},
    {"name": "export_pdf", "display_name": "PDF Export", "default_enabled": True},
    {"name": "export_csv", "display_name": "CSV Export", "default_enabled": True},
    {"name": "websocket_realtime", "display_name": "Real-time Collaboration", "default_enabled": True},
    {"name": "marketplace", "display_name": "Template Marketplace", "default_enabled": False},
    {"name": "advanced_analytics", "display_name": "Advanced Analytics", "default_enabled": True},
    {"name": "custom_branding", "display_name": "Custom Organization Branding", "default_enabled": False},
]
```

### API Endpoints

```typescript
// ============== System Settings ==============

// Get all settings (Admin only)
GET /api/admin/settings
Query: ?category=rate_limiting
Response: {
  "settings": [
    {
      "id": "uuid",
      "key": "rate_limit.registration.daily",
      "value": 10,
      "value_type": "number",
      "default_value": 10,
      "category": "rate_limiting",
      "description": "Maximum facilitator registrations per 24 hours",
      "validation_rules": {"min": 1, "max": 1000},
      "updated_at": "2026-01-25T10:00:00Z"
    }
  ],
  "categories": ["rate_limiting", "security", "limits", "features"]
}

// Update setting (Admin only)
PUT /api/admin/settings/:key
Request: {
  "value": 15
}
Response: {
  "success": true,
  "setting": {...},
  "audit_id": "uuid"
}

// Get setting (for internal service use)
GET /api/internal/settings/:key
Response: {
  "value": 10
}

// Reset setting to default (Admin only)
POST /api/admin/settings/:key/reset
Response: {
  "success": true,
  "setting": {...}
}

// Get settings audit log (Admin only)
GET /api/admin/settings/audit
Query: ?setting_key=rate_limit.registration.daily&limit=50
Response: {
  "entries": [
    {
      "id": "uuid",
      "setting_key": "rate_limit.registration.daily",
      "old_value": 10,
      "new_value": 15,
      "changed_by": "admin@example.com",
      "changed_at": "2026-01-25T10:30:00Z"
    }
  ]
}

// ============== Subscription Tiers ==============

// List all tiers (Admin only)
GET /api/admin/tiers
Response: {
  "tiers": [...]
}

// Create tier (Admin only)
POST /api/admin/tiers
Request: {
  "name": "TEAM",
  "display_name": "Team",
  "max_users": 25,
  ...
}

// Update tier (Admin only)
PUT /api/admin/tiers/:id
Request: {...}

// ============== Feature Flags ==============

// List all flags (Admin only)
GET /api/admin/feature-flags
Response: {
  "flags": [
    {
      "id": "uuid",
      "name": "ai_enhancement",
      "display_name": "AI Use Case Enhancement",
      "default_enabled": true,
      "overrides": [
        {"organization_id": "uuid", "organization_name": "Beta Corp", "is_enabled": false}
      ]
    }
  ]
}

// Update flag default (Admin only)
PUT /api/admin/feature-flags/:name
Request: {
  "default_enabled": false
}

// Set organization override (Admin only)
POST /api/admin/feature-flags/:name/override
Request: {
  "organization_id": "uuid",
  "is_enabled": true
}

// Check if feature enabled (for current user's organization)
GET /api/features/:name
Response: {
  "enabled": true
}

// ============== Knowledge Base CRUD ==============

// List industries (Admin CRUD)
GET /api/admin/kb/industries
POST /api/admin/kb/industries
PUT /api/admin/kb/industries/:id
DELETE /api/admin/kb/industries/:id

// List/manage use cases (Admin CRUD)
GET /api/admin/kb/use-cases
POST /api/admin/kb/use-cases
PUT /api/admin/kb/use-cases/:id
DELETE /api/admin/kb/use-cases/:id

// Import knowledge base from JSON
POST /api/admin/kb/import
Request: {
  "data": {...} // JSON matching knowledge_base.json format
}

// Export knowledge base to JSON
GET /api/admin/kb/export
Response: {
  // Full knowledge base as JSON
}
```

### Settings Service

```python
# app/services/settings_service.py

from typing import Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from functools import lru_cache

from app.models.settings import SystemSetting

# In-memory cache with TTL
_settings_cache: dict = {}
_cache_ttl = 60  # seconds

async def get_setting(db: AsyncSession, key: str, use_cache: bool = True) -> Any:
    """
    Get a setting value by key.
    Uses in-memory cache for performance.
    """
    if use_cache and key in _settings_cache:
        cached_value, cached_at = _settings_cache[key]
        if (datetime.utcnow() - cached_at).seconds < _cache_ttl:
            return cached_value
    
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if setting:
        value = setting.value
        _settings_cache[key] = (value, datetime.utcnow())
        return value
    
    return None

async def get_rate_limit(db: AsyncSession, limit_type: str) -> int:
    """Get rate limit from settings, with fallback to defaults."""
    key = f"rate_limit.registration.{limit_type}"
    value = await get_setting(db, key)
    
    # Fallback defaults
    defaults = {"daily": 10, "weekly": 20, "monthly": 50}
    return value if value is not None else defaults.get(limit_type, 10)

def invalidate_cache(key: Optional[str] = None):
    """Invalidate settings cache."""
    if key:
        _settings_cache.pop(key, None)
    else:
        _settings_cache.clear()
```

### Migration Script

```python
# migrations/us33_database_driven_config.py

async def migrate_knowledge_base(db: AsyncSession):
    """Migrate knowledge_base.json to database tables."""
    import json
    from pathlib import Path
    
    kb_path = Path("app/data/knowledge_base.json")
    if not kb_path.exists():
        print("knowledge_base.json not found, skipping migration")
        return
    
    with open(kb_path) as f:
        data = json.load(f)
    
    # Migrate industries
    for ind in data.get("industries", []):
        industry = KBIndustry(
            slug=ind["id"],
            name=ind["name"],
            description=ind.get("description"),
            icon=ind.get("icon"),
        )
        db.add(industry)
        await db.flush()
        
        # Migrate use cases for this industry
        for uc in ind.get("use_cases", []):
            use_case = KBUseCase(
                industry_id=industry.id,
                title=uc["title"],
                description=uc["description"],
                category=uc.get("category"),
                complexity=uc.get("complexity", "Medium"),
                typical_roi=uc.get("typical_roi"),
                implementation_time=uc.get("implementation_time"),
                technologies=uc.get("technologies", []),
            )
            db.add(use_case)
    
    await db.commit()
    print(f"Migrated {len(data.get('industries', []))} industries to database")
```

---

## Frontend Components

```typescript
// New Components
- SystemSettingsPage.tsx          // Admin settings management
- SettingsCategory.tsx            // Grouped settings display
- SettingInput.tsx               // Type-aware setting input
- SubscriptionTiersPage.tsx      // Tier management
- FeatureFlagsPage.tsx           // Feature flag management
- KnowledgeBaseCRUD.tsx          // KB admin interface
- IndustryEditor.tsx             // Industry CRUD
- UseCaseEditor.tsx              // Use case CRUD
- SettingsAuditLog.tsx           // Audit log viewer

// Modified Components
- AdminPanel.tsx                 // Add Settings menu item
- rate_limiting.py               // Read limits from DB
- security.py                    // Read password rules from DB
- knowledge_base.py              // Read from DB instead of JSON
```

---

## Dependencies

### Prerequisites
- US30: User Roles & Access Control System (IMPLEMENTED)
- US32: Facilitator Approval & Rate Limiting (rate limit model exists)
- PostgreSQL database (already in use)

### Dependent Features
- All features using rate limits
- All features using password validation
- Knowledge Base API

---

## Testing Requirements

### Unit Tests
- Settings CRUD operations
- Cache invalidation
- Default value fallback
- Validation rule enforcement
- Knowledge base migration

### Integration Tests
- Rate limiting with DB-backed limits
- Password validation with DB-backed rules
- Feature flag enforcement
- Settings audit logging

### E2E Tests
- Admin settings page workflow
- Tier management
- Feature flag toggle effects
- Knowledge base CRUD

---

## Security Considerations

- Admin-only access for all configuration endpoints
- Audit logging for all setting changes
- Sensitive settings masked in logs/exports
- Validation to prevent dangerous values
- Rate limit settings bounded to prevent abuse

---

## Migration Strategy

1. **Phase 1:** Create tables and seed with current hardcoded values
2. **Phase 2:** Update services to read from DB with fallback to constants
3. **Phase 3:** Build admin UI for settings management
4. **Phase 4:** Migrate knowledge base JSON to database
5. **Phase 5:** Remove hardcoded constants (keep as fallbacks)

---

## Definition of Done

- [ ] System settings table created with seed data
- [ ] Settings service with caching implemented
- [ ] Rate limiting reads from database
- [ ] Password validation reads from database
- [ ] Subscription tiers table created
- [ ] Feature flags table with override support
- [ ] Knowledge base migrated to database
- [ ] Admin UI for settings management
- [ ] Admin UI for knowledge base CRUD
- [ ] Audit logging for setting changes
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Documentation updated

---

## Estimated Effort

| Component | Hours |
|-----------|-------|
| Database schema & migrations | 8 |
| Settings service with caching | 6 |
| Settings API endpoints | 8 |
| Subscription tiers implementation | 6 |
| Feature flags implementation | 8 |
| Knowledge base migration | 10 |
| Admin UI - Settings page | 12 |
| Admin UI - KB CRUD | 14 |
| Update existing services | 8 |
| Testing | 12 |
| Documentation | 4 |
| **Total** | **96 hours** |

---

## Related User Stories

- **US30:** User Roles & Access Control System
- **US32:** Facilitator Approval & Rate Limiting
- **US26:** Knowledge Base Research Refresh
- **US14:** AI Knowledge Base & Enhanced Insights

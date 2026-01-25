# Database Design Documentation

## Overview

The HotspotMatrix application uses **PostgreSQL** as its primary database, leveraging native PostgreSQL features including JSONB for flexible data storage, UUID types for identifiers, and advanced indexing capabilities.

## Database Technology Stack

- **Database**: PostgreSQL 14+
- **ORM**: SQLAlchemy (Async)
- **Migration Strategy**: Python-based migration scripts
- **Connection**: Async connection pool via asyncpg

## Core Design Principles

1. **UUID Primary Keys**: All tables use VARCHAR(36) UUID primary keys for distributed system compatibility
2. **JSONB for Flexibility**: Complex data structures stored as JSONB for efficient querying
3. **Soft Deletes**: Critical entities support soft deletion for data retention
4. **Audit Trails**: Comprehensive audit logging for security and compliance
5. **Indexing Strategy**: Strategic indexes on foreign keys, status fields, and frequently queried columns
6. **Timestamps**: All tables include created_at and updated_at timestamps

---

## Database Schema

### 1. Core Workshop Tables

#### 1.1 `users`
Stores registered user accounts (Admins and Facilitators).

```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    
    -- RBAC fields
    role VARCHAR(20) DEFAULT 'facilitator' NOT NULL,  -- 'admin' | 'facilitator'
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,    -- 'pending' | 'active' | 'disabled' | 'suspended'
    is_admin BOOLEAN DEFAULT FALSE,                   -- Legacy field
    
    -- Organization
    organization VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    
    -- Account management
    disabled_at TIMESTAMPTZ,
    disabled_by VARCHAR(36) REFERENCES users(id),
    
    -- MFA (optional)
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255)
);

CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_role_status ON users(role, status);
```

**Key Features**:
- Email-based authentication
- Role-based access control (RBAC)
- Multi-factor authentication support
- Account status tracking
- Soft delete capability

---

#### 1.2 `workshops`
Main workshop entity containing configuration and state.

```sql
CREATE TABLE workshops (
    id VARCHAR(36) PRIMARY KEY,
    facilitator_id VARCHAR(36) NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    pin VARCHAR(6) UNIQUE,
    status VARCHAR(20) DEFAULT 'DRAFT',              -- 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
    current_phase VARCHAR(20) DEFAULT 'INTAKE',      -- 'INTAKE' | 'SCORING' | 'ANALYSIS'
    config JSONB DEFAULT '{}',                        -- Criteria weights and settings
    active_use_case_id VARCHAR(36) REFERENCES use_cases(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_workshops_facilitator ON workshops(facilitator_id);
CREATE INDEX ix_workshops_pin ON workshops(pin);
CREATE INDEX ix_workshops_status ON workshops(status);
```

**Config JSONB Structure**:
```json
{
  "criteria": {
    "Feasibility": 50,
    "Value": 50
  },
  "settings": {
    "allowAnonymousSubmissions": true,
    "requireApproval": false
  }
}
```

---

#### 1.3 `participants`
Anonymous workshop participants (PIN-based access).

```sql
CREATE TABLE participants (
    id VARCHAR(36) PRIMARY KEY,
    workshop_id VARCHAR(36) NOT NULL REFERENCES workshops(id),
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'PARTICIPANT',  -- 'PARTICIPANT' | 'FACILITATOR' | 'PENDING_FACILITATOR'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_participants_workshop ON participants(workshop_id);
```

---

#### 1.4 `use_cases`
Use case submissions within workshops.

```sql
CREATE TABLE use_cases (
    id VARCHAR(36) PRIMARY KEY,
    workshop_id VARCHAR(36) NOT NULL REFERENCES workshops(id),
    participant_id VARCHAR(36) REFERENCES participants(id),
    added_by_facilitator BOOLEAN DEFAULT FALSE,
    
    -- Content
    title TEXT NOT NULL,
    description TEXT NOT NULL,           -- Problem statement
    proposed_solution TEXT,
    kpi TEXT,                            -- Success metric
    target_user VARCHAR(255),
    category VARCHAR(100),               -- AI technique/category
    
    status VARCHAR(20) DEFAULT 'PENDING',  -- 'PENDING' | 'APPROVED' | 'REJECTED'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_use_cases_workshop ON use_cases(workshop_id);
CREATE INDEX ix_use_cases_participant ON use_cases(participant_id);
CREATE INDEX ix_use_cases_status ON use_cases(status);
```

---

#### 1.5 `votes`
Participant votes on use cases.

```sql
CREATE TABLE votes (
    id VARCHAR(36) PRIMARY KEY,
    use_case_id VARCHAR(36) NOT NULL REFERENCES use_cases(id),
    participant_id VARCHAR(36) NOT NULL REFERENCES participants(id),
    scores JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_votes_use_case ON votes(use_case_id);
CREATE INDEX ix_votes_participant ON votes(participant_id);
CREATE UNIQUE INDEX ix_votes_unique ON votes(use_case_id, participant_id);
```

**Scores JSONB Structure**:
```json
{
  "Feasibility": 80,
  "Value": 60
}
```

---

### 2. Role-Based Access Control (RBAC)

#### 2.1 `workshop_facilitators`
Many-to-many relationship for workshop facilitator assignments.

```sql
CREATE TABLE workshop_facilitators (
    id VARCHAR(36) PRIMARY KEY,
    workshop_id VARCHAR(36) NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    facilitator_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by VARCHAR(36) NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    can_edit BOOLEAN DEFAULT TRUE,
    can_delete BOOLEAN DEFAULT FALSE,
    
    UNIQUE(workshop_id, facilitator_id)
);

CREATE INDEX ix_workshop_facilitators_workshop ON workshop_facilitators(workshop_id);
CREATE INDEX ix_workshop_facilitators_facilitator ON workshop_facilitators(facilitator_id);
```

---

#### 2.2 `member_sessions`
Anonymous member session tracking for PIN-based access.

```sql
CREATE TABLE member_sessions (
    id VARCHAR(36) PRIMARY KEY,
    workshop_id VARCHAR(36) NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    participant_id VARCHAR(36) REFERENCES participants(id)
);

CREATE INDEX ix_member_sessions_workshop ON member_sessions(workshop_id);
CREATE INDEX ix_member_sessions_token ON member_sessions(session_token);
```

---

#### 2.3 `permissions`
Permission matrix for role-based access control.

```sql
CREATE TABLE permissions (
    id VARCHAR(36) PRIMARY KEY,
    role VARCHAR(20) NOT NULL,           -- 'admin' | 'facilitator' | 'member'
    resource VARCHAR(100) NOT NULL,      -- 'workshop' | 'user' | 'settings'
    action VARCHAR(50) NOT NULL,         -- 'create' | 'read' | 'update' | 'delete'
    allowed BOOLEAN DEFAULT FALSE,
    
    UNIQUE(role, resource, action)
);

CREATE INDEX ix_permissions_role ON permissions(role);
```

---

#### 2.4 `role_audit_logs`
Audit trail for all role-related changes.

```sql
CREATE TABLE role_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(36) REFERENCES users(id),
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_role_audit_logs_user ON role_audit_logs(user_id);
CREATE INDEX ix_role_audit_logs_created ON role_audit_logs(created_at);
```

---

#### 2.5 `facilitator_registration_log`
Rate limiting for facilitator registrations.

```sql
CREATE TABLE facilitator_registration_log (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_facilitator_reg_email ON facilitator_registration_log(email);
CREATE INDEX ix_facilitator_reg_created ON facilitator_registration_log(created_at);
```

---

#### 2.6 `facilitator_access_requests`
Facilitator access requests from PIN-based workshop joins.

```sql
CREATE TABLE facilitator_access_requests (
    id VARCHAR(36) PRIMARY KEY,
    workshop_id VARCHAR(36) NOT NULL REFERENCES workshops(id),
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
    reviewed_by VARCHAR(36) REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_facilitator_requests_workshop ON facilitator_access_requests(workshop_id);
CREATE INDEX ix_facilitator_requests_status ON facilitator_access_requests(status);
```

---

### 3. Organization & Multi-Tenancy

#### 3.1 `organizations`
Organization entities for multi-tenant support.

```sql
CREATE TABLE organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#6366f1',
    secondary_color VARCHAR(7) DEFAULT '#8b5cf6',
    
    -- Contact
    contact_email VARCHAR(255),
    website VARCHAR(500),
    industry VARCHAR(100),
    
    -- Subscription & Limits
    tier VARCHAR(20) DEFAULT 'FREE',     -- 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
    max_users INT DEFAULT 5,
    max_workshops_per_month INT DEFAULT 3,
    max_participants_per_workshop INT DEFAULT 25,
    
    -- Features
    settings JSONB DEFAULT '{}',
    features_enabled JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_organizations_slug ON organizations(slug);
CREATE INDEX ix_organizations_tier ON organizations(tier);
```

---

#### 3.2 `organization_members`
Links users to organizations with role-based permissions.

```sql
CREATE TABLE organization_members (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(20) DEFAULT 'MEMBER',   -- 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
    title VARCHAR(100),
    department VARCHAR(100),
    
    -- Permissions
    can_create_workshops BOOLEAN DEFAULT TRUE,
    can_manage_templates BOOLEAN DEFAULT FALSE,
    can_invite_members BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT TRUE,
    can_export_data BOOLEAN DEFAULT TRUE,
    
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    
    UNIQUE(organization_id, user_id)
);

CREATE INDEX ix_org_members_org ON organization_members(organization_id);
CREATE INDEX ix_org_members_user ON organization_members(user_id);
```

---

#### 3.3 `organization_invitations`
Pending organization invitations.

```sql
CREATE TABLE organization_invitations (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'MEMBER',
    invited_by_id VARCHAR(36) NOT NULL REFERENCES users(id),
    invitation_token VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',  -- 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ
);

CREATE INDEX ix_org_invitations_org ON organization_invitations(organization_id);
CREATE INDEX ix_org_invitations_email ON organization_invitations(email);
CREATE INDEX ix_org_invitations_token ON organization_invitations(invitation_token);
```

---

#### 3.4 `organization_workshops`
Links workshops to organizations for tracking.

```sql
CREATE TABLE organization_workshops (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workshop_id VARCHAR(36) NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    department VARCHAR(100),
    project VARCHAR(255),
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_org_workshops_org ON organization_workshops(organization_id);
CREATE INDEX ix_org_workshops_workshop ON organization_workshops(workshop_id);
```

---

#### 3.5 `organization_usage_logs`
Tracks organization usage for billing and analytics.

```sql
CREATE TABLE organization_usage_logs (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,           -- Format: YYYY-MM
    workshops_created INT DEFAULT 0,
    total_participants INT DEFAULT 0,
    total_use_cases INT DEFAULT 0,
    total_votes INT DEFAULT 0,
    ai_enhancements_used INT DEFAULT 0,
    storage_used_mb INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_org_usage_org ON organization_usage_logs(organization_id);
CREATE INDEX ix_org_usage_month ON organization_usage_logs(month);
```

---

### 4. Configuration & Settings

#### 4.1 `system_settings`
Centralized key-value configuration store.

```sql
CREATE TABLE system_settings (
    id VARCHAR(36) PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    value_type VARCHAR(20) NOT NULL,     -- 'string' | 'number' | 'boolean' | 'json'
    default_value JSONB NOT NULL,
    category VARCHAR(50) NOT NULL,       -- 'general' | 'security' | 'features' | 'limits'
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    validation_rules JSONB,
    updated_by VARCHAR(36) REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settings_category ON system_settings(category);
CREATE INDEX idx_settings_key ON system_settings(key);
```

---

#### 4.2 `settings_audit_log`
Audit trail for system settings changes.

```sql
CREATE TABLE settings_audit_log (
    id VARCHAR(36) PRIMARY KEY,
    setting_id VARCHAR(36) REFERENCES system_settings(id) ON DELETE SET NULL,
    setting_key VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by VARCHAR(36) REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET
);

CREATE INDEX idx_audit_setting ON settings_audit_log(setting_id);
CREATE INDEX idx_audit_time ON settings_audit_log(changed_at);
CREATE INDEX idx_audit_key ON settings_audit_log(setting_key);
```

---

#### 4.3 `subscription_tiers`
Subscription tier definitions with configurable limits.

```sql
CREATE TABLE subscription_tiers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    max_users INT NOT NULL DEFAULT 5,
    max_workshops_per_month INT NOT NULL DEFAULT 3,
    max_participants_per_workshop INT NOT NULL DEFAULT 25,
    max_use_cases_per_workshop INT NOT NULL DEFAULT 100,
    features JSONB DEFAULT '[]',
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 4.4 `feature_flags`
Global feature flags for enabling/disabling features.

```sql
CREATE TABLE feature_flags (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150),
    description TEXT,
    default_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 4.5 `feature_flag_overrides`
Organization-specific feature flag overrides.

```sql
CREATE TABLE feature_flag_overrides (
    id VARCHAR(36) PRIMARY KEY,
    flag_id VARCHAR(36) NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL,
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_override_flag_org ON feature_flag_overrides(flag_id, organization_id);
```

---

### 5. Knowledge Base

#### 5.1 `kb_industries`
Industry categories for organizing use case templates.

```sql
CREATE TABLE kb_industries (
    id VARCHAR(36) PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 5.2 `kb_use_cases`
AI use case templates for workshops.

```sql
CREATE TABLE kb_use_cases (
    id VARCHAR(36) PRIMARY KEY,
    industry_id VARCHAR(36) NOT NULL REFERENCES kb_industries(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    complexity VARCHAR(20) DEFAULT 'Medium',
    typical_roi VARCHAR(255),
    implementation_time VARCHAR(100),
    technologies JSONB DEFAULT '[]',
    key_benefits JSONB DEFAULT '[]',
    prerequisites JSONB DEFAULT '[]',
    example_kpis JSONB DEFAULT '[]',
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    view_count INT DEFAULT 0,
    usage_count INT DEFAULT 0,
    created_by VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_industry ON kb_use_cases(industry_id);
CREATE INDEX idx_kb_category ON kb_use_cases(category);
CREATE INDEX idx_kb_complexity ON kb_use_cases(complexity);
CREATE INDEX idx_kb_active ON kb_use_cases(is_active);
```

---

#### 5.3 `category_keywords`
Keywords for AI-based category matching.

```sql
CREATE TABLE category_keywords (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(100) UNIQUE NOT NULL,
    keywords JSONB NOT NULL,
    weight INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE
);
```

---

#### 5.4 `complexity_rules`
Rules for determining use case complexity.

```sql
CREATE TABLE complexity_rules (
    id VARCHAR(36) PRIMARY KEY,
    complexity VARCHAR(20) UNIQUE NOT NULL,
    keywords JSONB NOT NULL,
    threshold INT DEFAULT 2,
    timeline_estimate VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);
```

---

## Data Types & Custom Types

### GUID Type
```python
# Stores UUIDs as VARCHAR(36) for compatibility
# Converts to/from Python uuid.UUID objects
```

### JSONType
```python
# Uses PostgreSQL's native JSONB in production
# Provides efficient querying and indexing
# Falls back to TEXT for SQLite (testing only)
```

### InetType
```python
# Uses PostgreSQL's INET type for IP addresses
# Falls back to VARCHAR(45) for compatibility
```

---

## Indexing Strategy

### Primary Indexes
- All primary keys are indexed by default (UUID)
- Unique constraints on email, slug, token fields

### Foreign Key Indexes
- All foreign key columns have indexes for join performance

### Composite Indexes
- `(role, status)` on users table
- `(flag_id, organization_id)` on feature_flag_overrides
- `(use_case_id, participant_id)` on votes (unique)

### Query Optimization Indexes
- Status fields (workshop.status, user.status)
- Timestamp fields for audit logs
- Category and complexity fields on knowledge base

---

## Migration Strategy

### Migration Files Location
`/server/migrations/`

### Key Migrations
1. `add_rbac_tables.py` - RBAC system (US30)
2. `us33_system_settings.py` - System settings
3. `us33_subscription_kb.py` - Subscription tiers and knowledge base
4. `fix_usecase_facilitator_fields.py` - Use case schema updates
5. `us32_facilitator_approval.py` - Facilitator approval workflow

### Running Migrations
```bash
# Run specific migration
python -m migrations.add_rbac_tables

# Seed default data
python -m migrations.add_rbac_tables --seed
```

---

## Data Relationships

### One-to-Many Relationships
- User → Workshops (facilitator_id)
- Workshop → Participants
- Workshop → Use Cases
- Use Case → Votes
- Organization → Members
- Organization → Workshops

### Many-to-Many Relationships
- Workshop ↔ Facilitators (via workshop_facilitators)
- Organization ↔ Users (via organization_members)

### Self-Referencing Relationships
- User.disabled_by → User
- Workshop.active_use_case_id → UseCase

---

## Security Considerations

### Password Storage
- Passwords hashed using bcrypt
- Never stored in plain text

### Session Management
- JWT tokens for authenticated users
- Session tokens for anonymous members
- Token expiration and refresh

### Audit Logging
- All role changes logged
- Settings changes tracked
- IP address and user agent captured

### Data Privacy
- Soft deletes for user data
- GDPR compliance considerations
- Sensitive settings flagged

---

## Performance Optimization

### Connection Pooling
- Async connection pool via asyncpg
- Configurable pool size

### Query Optimization
- Strategic use of JSONB indexes
- Eager loading for relationships
- Pagination for large result sets

### Caching Strategy
- Application-level caching for settings
- Knowledge base content caching
- Session data caching

---

## Backup & Recovery

### Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Transaction log archiving

### Data Retention
- Audit logs: 1 year
- Soft-deleted records: 90 days
- Workshop data: Indefinite (unless deleted)

---

## Future Enhancements

### Planned Features
1. **Partitioning**: Partition audit logs by date
2. **Full-Text Search**: PostgreSQL full-text search on use cases
3. **Analytics Tables**: Materialized views for reporting
4. **Archive Tables**: Historical data archiving
5. **Replication**: Read replicas for scaling

### Scalability Considerations
- Horizontal scaling via read replicas
- Sharding by organization_id for multi-tenancy
- CDN for static knowledge base content

---

## Appendix

### Database Diagram
```
users ──┬──> workshops ──┬──> use_cases ──> votes
        │                └──> participants ──┘
        │
        ├──> organization_members ──> organizations
        │
        └──> role_audit_logs
```

### Version History
- **v1.0** (2026-01): Initial schema with core workshop functionality
- **v1.1** (2026-01): Added RBAC system (US30)
- **v1.2** (2026-01): Added organization multi-tenancy
- **v1.3** (2026-01): Added system settings and knowledge base (US33)

### References
- User Stories: `/docs/userstories/`
- API Documentation: `/docs/techspec/api-design.md`
- Migration Scripts: `/server/migrations/`

# US30: User Roles & Access Control System

**Epic:** Enterprise Security & Access Management  
**Module:** Authentication & Authorization  
**Story Type:** Core Infrastructure  
**Priority:** Critical  
**Story Points:** 13  
**Status:** ✅ IMPLEMENTED  
**Target Sprint:** Sprint 14 (Foundation)

---

## User Story

**As a** System Administrator,  
**I want to** define and enforce three distinct user roles (Admin, Facilitator, Member) with specific capabilities and access levels,  
**So that** users can access only the features appropriate to their role and the application maintains proper security boundaries.

---

## Description

The HotspotMatrix application requires a clear three-tier user hierarchy to support different levels of access and functionality:

| Role | Authentication | Workshop Access | Key Capabilities |
|------|---------------|-----------------|------------------|
| **Admin** | Email/Password + MFA | All workshops | Full system control |
| **Facilitator** | Email/Password (Registered) | Assigned workshops only | Workshop management |
| **Member** | Workshop PIN only | Single workshop per session | Participation only | Surveys assigned to the workshop

This user story establishes the foundational role-based access control (RBAC) system that all other features will depend on.

---

## User Roles Definition

### 1. Admin (System Administrator)

**Authentication:**
- Email/password with optional MFA
- System-level credentials managed separately from workshop access
- Account created by existing admin or system setup

**Capabilities:**
- **Workshop Management:**
  - Create new workshops
  - Archive/delete workshops
  - View all workshops in the system
  - Transfer workshop ownership between facilitators
  
- **Facilitator Management:**
  - Enable/disable facilitator access to the application
  - Approve new facilitator registrations
  - Assign facilitators to workshops
  - Remove facilitator assignments
  - View facilitator activity logs
  
- **System Configuration:**
  - Configure global application settings
  - Manage email templates and notifications
  - Access system-wide analytics and reports
  - Export data for compliance/auditing
  - Manage trusted domains for auto-approval
  
- **User Administration:**
  - View all user activity across workshops
  - Reset facilitator passwords
  - Deactivate user accounts
  - Manage role assignments

**Dashboard View:**
- System-wide metrics (total workshops, active users, etc.)
- Facilitator management panel
- Workshop overview with assignment controls
- Pending facilitator approval queue
- System health and audit logs

---

### 2. Facilitator (Registered User)

**Authentication:**
- Email/password registration (requires admin approval)
- Must be explicitly activated by an Admin post registration
- Session-based authentication with secure tokens

**Access Control:**
- Can only access workshops they are assigned to
- Cannot create workshops (Admin-only capability)
- Account status can be enabled/disabled by Admin

**Capabilities:**
- **Workshop Facilitation:**
  - View list of all assigned workshops
  - Select and enter any assigned workshop
  - Ability to add use cases and insights for the workshop
  - Ability to view and manage surveys for the workshop
  - Ability to view and manage participants for the workshop
  - Ability to view and manage results for the workshop
  - Ability to view and manage insights for the workshop
  - Ability to view and manage knowledge base for the workshop
  - Ability to view and manage analytics for the workshop
  - Access full facilitator dashboard for assigned workshops
  
- **Survey Management:**
  - Create and manage surveys within assigned workshops
  - Activate/deactivate surveys
  - View survey results and analytics
  
- **Use Case Management:**
  - Add use cases on behalf of members
  - Edit/delete use cases within assigned workshops
  - Configure prioritization criteria
  - Manage the scoring interface
  
- **Insights & Documentation:**
  - Add insights and notes to workshops
  - Export workshop data and reports
  - Generate presentation materials
  - Access workshop analytics

**Dashboard View:**
- List of assigned workshops with status indicators
- Quick actions for each workshop (Enter, View Analytics, Export)
- Recent activity across all assigned workshops
- Notification center for workshop events

---

### 3. Member (Workshop Participant)

**Authentication:**
- PIN-only access (no registration required)
- Single workshop session at a time
- Session expires when browser closes or workshop ends

**Access Control:**
- Can only access ONE workshop per PIN entry
- No persistence between sessions (anonymous by default)
- Limited to participant-level features

**Capabilities:**
- **Workshop Participation:**
  - Join workshop using 6-character PIN.
  - Name will be unique across all members in the workshop.
  - Submit use cases via Digital Use Case Canvas
  - prioritize use cases available in the workshop dashboard
  - Drag and drop use cases to prioritize them on the 2*2 canvas or use the scoring interface
  - Participate in active surveys, which is available in the workshop dashboard
  - Score/prioritize their own use cases
  - Ability to add new use cases to the workshop
  
- **View Access:**
  - View workshop information and instructions
  - See their own submitted use cases
  - View active surveys assigned to them
  - See workshop results (if facilitator allows)

**Interface:**
- Simple PIN entry screen
- Participant dashboard with submitted use cases
- Survey participation interface
- Limited navigation (no access to admin/facilitator features)

---

## Acceptance Criteria

### AC1: Admin User Management

**Scenario: Admin creates a new workshop**
```gherkin
Given I am logged in as an Admin
When I navigate to the "Create Workshop" page
And I fill in workshop details (name, description, date)
And I assign facilitators from the approved facilitator list
And I click "Create Workshop"
Then the workshop is created with a unique PIN
And assigned facilitators can see the workshop in their list
And I can view the workshop in the Admin dashboard
```

**Scenario: Admin enables/disables facilitator access**
```gherkin
Given I am logged in as an Admin
And there is a facilitator account for "john@company.com"
When I navigate to Facilitator Management
And I toggle the "Active" status for "john@company.com" to disabled
Then the facilitator cannot log in to the application
And they see "Account disabled. Contact administrator." message
When I toggle their status back to enabled
Then the facilitator can log in again
```

**Scenario: Admin approves new facilitator registration**
```gherkin
Given a new user has registered as a facilitator
And their request is pending approval
When I view the pending approvals queue
And I click "Approve" for the new facilitator
Then their account is activated
And they receive an email notification
And they can log in and access assigned workshops
```

---

### AC2: Facilitator Multi-Workshop Access

**Scenario: Facilitator views assigned workshops**
```gherkin
Given I am logged in as a Facilitator
And I am assigned to 3 workshops: "Innovation Summit", "Q4 Planning", "Product Review"
When I view my Facilitator Dashboard
Then I see a list of all 3 workshops
And each workshop shows: name, PIN, date, participant count, status
And I can click on any workshop to enter it
```

**Scenario: Facilitator manages surveys across workshops**
```gherkin
Given I am logged in as a Facilitator
And I am in the "Innovation Summit" workshop
When I create a new survey with 5 questions
And I activate the survey
Then members in this workshop see the survey notification
And I can view real-time survey responses
When I switch to "Q4 Planning" workshop
Then I see a different set of surveys for that workshop
```

**Scenario: Facilitator adds use cases and insights**
```gherkin
Given I am a Facilitator in an active workshop
When I click "Add Use Case"
And I fill in use case details
Then the use case is added to the workshop
When I add insights/notes to a use case
Then the insights are saved and visible to other facilitators
```

---

### AC3: Member Single-Workshop Access

**Scenario: Member joins workshop with PIN**
```gherkin
Given I am a new visitor to the application
When I enter PIN "8821AF" on the landing page
And the PIN is valid and workshop is active
Then I am taken to the Member Dashboard for that workshop
And I can only see features for this workshop
And I cannot access any other workshop
```

**Scenario: Member submits use case**
```gherkin
Given I am a Member in workshop "Innovation Summit"
When I click "Submit Use Case"
And I fill in the Digital Use Case Canvas form
And I submit my use case
Then my use case appears in my dashboard
And I can see it in my "Submitted Use Cases" list
And I cannot edit or delete other members' use cases
```

**Scenario: Member cannot access facilitator features**
```gherkin
Given I am a Member in a workshop
When I try to access /facilitator/dashboard directly
Then I am redirected to the Member Dashboard
And I see a message "Access denied. Facilitator login required."
When I try to access /admin/dashboard
Then I see "Access denied. Admin login required."
```

---

### AC4: Role Enforcement

**Scenario: Disabled facilitator cannot access system**
```gherkin
Given my facilitator account has been disabled by an Admin
When I try to log in with my email/password
Then I see "Your account has been disabled. Please contact your administrator."
And I cannot access any facilitator features
```

**Scenario: Facilitator cannot create workshops**
```gherkin
Given I am logged in as a Facilitator
When I navigate to any workshop listing page
Then I do not see a "Create Workshop" button
When I try to access /admin/workshops/create directly
Then I am redirected with "Access denied. Admin privileges required."
```

**Scenario: Facilitator cannot access unassigned workshops**
```gherkin
Given I am logged in as a Facilitator
And I am not assigned to workshop with PIN "9922BC"
When I try to access the dashboard for workshop "9922BC"
Then I see "You are not assigned to this workshop"
And I am redirected to my facilitator dashboard
```

---

## Technical Implementation

### Database Schema

```sql
-- User Roles Enum
CREATE TYPE user_role AS ENUM ('admin', 'facilitator', 'member');
CREATE TYPE account_status AS ENUM ('pending', 'active', 'disabled', 'suspended');

-- Users Table (for Admin and Facilitator accounts)
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  status account_status DEFAULT 'pending',
  organization VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  disabled_at TIMESTAMP,
  disabled_by UUID REFERENCES users(user_id),
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255)
);

-- Workshop Facilitator Assignments
CREATE TABLE workshop_facilitators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(workshop_id),
  facilitator_id UUID NOT NULL REFERENCES users(user_id),
  assigned_by UUID NOT NULL REFERENCES users(user_id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  can_edit BOOLEAN DEFAULT TRUE,
  can_delete BOOLEAN DEFAULT FALSE,
  UNIQUE(workshop_id, facilitator_id)
);

-- Member Sessions (Anonymous, PIN-based)
CREATE TABLE member_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(workshop_id),
  display_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

-- Role Permission Matrix
CREATE TABLE permissions (
  permission_id SERIAL PRIMARY KEY,
  role user_role NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  allowed BOOLEAN DEFAULT FALSE,
  UNIQUE(role, resource, action)
);

-- Audit Log for Role Changes
CREATE TABLE role_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id),
  action VARCHAR(100) NOT NULL,
  performed_by UUID REFERENCES users(user_id),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Permission Matrix

| Resource | Action | Admin | Facilitator | Member |
|----------|--------|-------|-------------|--------|
| Workshop | Create | ✅ | ❌ | ❌ |
| Workshop | View All | ✅ | ❌ | ❌ |
| Workshop | View Assigned | ✅ | ✅ | ❌ |
| Workshop | View Current | ✅ | ✅ | ✅ |
| Workshop | Delete | ✅ | ❌ | ❌ |
| Workshop | Archive | ✅ | ✅ | ❌ |
| Facilitator | Create | ✅ | ❌ | ❌ |
| Facilitator | Approve | ✅ | ❌ | ❌ |
| Facilitator | Enable/Disable | ✅ | ❌ | ❌ |
| Facilitator | Assign Workshop | ✅ | ❌ | ❌ |
| Survey | Create | ✅ | ✅ | ❌ |
| Survey | Respond | ✅ | ✅ | ✅ |
| Survey | View Results | ✅ | ✅ | ❌ |
| Use Case | Submit | ✅ | ✅ | ✅ |
| Use Case | Edit Any | ✅ | ✅ | ❌ |
| Use Case | Delete | ✅ | ✅ | ❌ |
| Analytics | System-wide | ✅ | ❌ | ❌ |
| Analytics | Workshop | ✅ | ✅ | ❌ |
| Settings | System | ✅ | ❌ | ❌ |

### API Endpoints

```typescript
// Authentication
POST /api/auth/login                    // Admin & Facilitator login
POST /api/auth/register                 // Facilitator registration (pending approval)
POST /api/auth/pin                      // Member PIN entry
POST /api/auth/logout                   // Logout current session
GET  /api/auth/me                       // Get current user info & role

// Admin - User Management
GET  /api/admin/facilitators            // List all facilitators
POST /api/admin/facilitators/:id/enable // Enable facilitator
POST /api/admin/facilitators/:id/disable// Disable facilitator
GET  /api/admin/facilitators/pending    // Pending approval queue
POST /api/admin/facilitators/:id/approve// Approve registration
POST /api/admin/facilitators/:id/reject // Reject registration

// Admin - Workshop Management
POST /api/admin/workshops               // Create workshop
GET  /api/admin/workshops               // List all workshops
POST /api/admin/workshops/:id/assign    // Assign facilitator to workshop
DELETE /api/admin/workshops/:id/assign/:fid // Remove facilitator assignment

// Facilitator - Workshop Access
GET  /api/facilitator/workshops         // List assigned workshops
GET  /api/facilitator/workshops/:pin    // Get workshop details (if assigned)

// Member - Workshop Access
POST /api/member/join                   // Join workshop with PIN
GET  /api/member/workshop               // Get current workshop info

// Middleware
authMiddleware(requiredRole: 'admin' | 'facilitator' | 'member')
workshopAccessMiddleware(workshopId: string)
```

### Frontend Routes & Guards

```typescript
// Route Configuration with Role Guards
const routes = [
  // Public Routes
  { path: '/', component: LandingPage },
  { path: '/login', component: LoginPage },
  { path: '/register', component: FacilitatorRegisterPage },
  { path: '/join', component: MemberPinEntry },
  
  // Admin Routes (requires: admin)
  { 
    path: '/admin/*', 
    component: AdminLayout,
    guard: requireRole('admin'),
    children: [
      { path: 'dashboard', component: AdminDashboard },
      { path: 'facilitators', component: FacilitatorManagement },
      { path: 'workshops', component: WorkshopManagement },
      { path: 'workshops/create', component: CreateWorkshop },
      { path: 'settings', component: SystemSettings },
    ]
  },
  
  // Facilitator Routes (requires: facilitator + active status)
  {
    path: '/facilitator/*',
    component: FacilitatorLayout,
    guard: requireRole('facilitator'),
    children: [
      { path: 'dashboard', component: FacilitatorDashboard },
      { path: 'workshops/:pin', component: WorkshopFacilitatorView },
      { path: 'workshops/:pin/surveys', component: SurveyManagement },
      { path: 'workshops/:pin/analytics', component: WorkshopAnalytics },
    ]
  },
  
  // Member Routes (requires: valid session)
  {
    path: '/workshop/*',
    component: MemberLayout,
    guard: requireValidSession(),
    children: [
      { path: 'dashboard', component: MemberDashboard },
      { path: 'use-cases', component: UseCaseSubmission },
      { path: 'surveys', component: SurveyParticipation },
    ]
  }
];

// Role Guard Implementation
function requireRole(role: UserRole) {
  return (to, from, next) => {
    const user = getCurrentUser();
    if (!user || user.role !== role) {
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }
    if (role === 'facilitator' && user.status !== 'active') {
      return next({ path: '/account-disabled' });
    }
    next();
  };
}
```

---

## UI/UX Design

### Landing Page Role Selection
```
┌─────────────────────────────────────────────────────────┐
│                    HotspotMatrix                        │
│                                                         │
│     ┌─────────────────┐  ┌─────────────────┐           │
│     │   JOIN WORKSHOP │  │  FACILITATOR    │           │
│     │                 │  │     LOGIN       │           │
│     │  [Enter PIN]    │  │                 │           │
│     │  [   JOIN   ]   │  │  [Email]        │           │
│     │                 │  │  [Password]     │           │
│     │  For Members    │  │  [   LOGIN  ]   │           │
│     └─────────────────┘  └─────────────────┘           │
│                                                         │
│              [New Facilitator? Register]                │
│                    [Admin Login]                        │
└─────────────────────────────────────────────────────────┘
```

### Facilitator Dashboard - Multi-Workshop View
```
┌─────────────────────────────────────────────────────────┐
│  Facilitator Dashboard           Welcome, Jane Smith    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MY WORKSHOPS (3)                                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ 🟢 Innovation Summit        PIN: 8821AF        │    │
│  │    12 participants • 5 use cases • Active      │    │
│  │    [Enter Workshop] [View Analytics] [Export]  │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │ 🟡 Q4 Planning Session      PIN: 9922BC        │    │
│  │    0 participants • 0 use cases • Scheduled    │    │
│  │    [Enter Workshop] [View Analytics] [Export]  │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │ ⚫ Product Review 2024      PIN: 7733DE        │    │
│  │    25 participants • 18 use cases • Completed  │    │
│  │    [View Results] [Export]                     │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Admin Dashboard - Full System Control
```
┌─────────────────────────────────────────────────────────┐
│  Admin Dashboard                           System Admin │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 12       │ │ 8        │ │ 156      │ │ 3        │   │
│  │ Workshops│ │ Facilitat│ │ Members  │ │ Pending  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  QUICK ACTIONS                                          │
│  [+ Create Workshop] [Manage Facilitators] [Settings]  │
│                                                         │
│  PENDING APPROVALS (3)                                  │
│  ┌────────────────────────────────────────────────┐    │
│  │ john@company.com - Requested Jan 20, 2026      │    │
│  │ [Approve] [Reject] [View Details]              │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  FACILITATOR STATUS                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │ jane@corp.com    🟢 Active   [Disable]         │    │
│  │ bob@corp.com     🟢 Active   [Disable]         │    │
│  │ sam@external.com 🔴 Disabled [Enable]          │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Dependencies

### Prerequisites
- US00: Infrastructure & Database Setup
- US02: PIN-Based Entry (for member access)
- Authentication system foundation

### Dependent Stories
- US06: Workshop Access Control (extends this foundation)
- US12: Participant Dashboard
- US13: Facilitator Enhancements
- All future role-specific features

---

## Testing Requirements

### Unit Tests
- Role validation middleware
- Permission matrix enforcement
- JWT token generation with role claims
- Session management for members

### Integration Tests
- Admin creates workshop → Assigns facilitator → Facilitator accesses
- Facilitator disabled → Cannot login → Re-enabled → Can login
- Member joins with PIN → Limited to workshop → Session expires

### Security Tests
- Role escalation prevention
- Cross-workshop access prevention for facilitators
- Invalid PIN rejection
- Session hijacking prevention

---

## Security Considerations

- JWT tokens include role and permissions
- Facilitator tokens include workshop assignment list
- Member sessions are workshop-scoped
- Admin actions require MFA for sensitive operations
- All role changes logged to audit trail
- Rate limiting on login attempts

---

## Definition of Done

- [x] Three user roles defined and enforced (Admin, Facilitator, Member)
- [x] Admin can create workshops and manage facilitators
- [x] Admin can enable/disable facilitator accounts
- [x] Facilitators see only assigned workshops in their dashboard
- [x] Facilitators can manage surveys/use cases in assigned workshops
- [x] Members can only access one workshop via PIN
- [x] Members cannot access facilitator or admin features
- [x] Role-based route guards implemented
- [x] Permission matrix enforced on all endpoints
- [x] Audit logging for all role changes
- [ ] All acceptance criteria met (requires integration testing)
- [ ] Security review completed
- [x] Documentation updated

---

## Related User Stories

- **US06:** Workshop Access Control & Facilitator Queue
- **US12:** Participant Dashboard & Survey Management
- **US13:** Facilitator Enhancements
- **US02:** PIN-Based Entry

---

## Questions/Clarifications

1. Should Members be able to optionally register for a persistent account?
2. Can a Facilitator be assigned to multiple workshops simultaneously?
3. Should there be a "Super Admin" role above Admin?
4. Can Admins also act as Facilitators for workshops?
5. Should workshop assignments have expiration dates?
6. Can Members switch workshops without re-entering PIN?

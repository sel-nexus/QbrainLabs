# US32: Facilitator Approval Workflow & Rate Limiting

**Epic:** Enterprise Security & Access Management  
**Module:** Authentication, Authorization & Onboarding  
**Story Type:** Enhancement  
**Priority:** High  
**Story Points:** 13  
**Status:** 🚧 IN PROGRESS  
**Target Sprint:** Sprint 16  
**Last Updated:** January 25, 2026

---

## User Story

**As a** System Administrator,  
**I want to** control facilitator registration through approval workflows, rate limits, and workshop-level facilitator management,  
**So that** the platform maintains security, prevents abuse, and ensures proper access control for workshop facilitation.

---

## Description

This enhancement expands the facilitator management capabilities with four key features:

1. **Facilitator Registration Approval Flow** - Registered facilitators remain in pending status until admin approval; can login but cannot see workshops
2. **Registration Rate Limiting** - Prevents abuse by limiting facilitator registrations to 10/day, 20/week, 50/month
3. **Workshop Facilitator Management** - Add approved facilitators to existing workshops (max 10 per workshop)
4. **Join as Facilitator via PIN** - Participants can request facilitator access when joining via PIN, requiring admin approval

---

## Requirements

### 1. Facilitator Registration Approval Flow

#### Current Behavior (Already Implemented)
- User registers as facilitator → Account created with `pending` status
- Admin approves → Status changes to `active`
- User can login and access assigned workshops

#### Enhanced Behavior (New)
- **Pending facilitators CAN login** to the application
- **Pending facilitators see an empty dashboard** with a message indicating approval is pending
- **Pending facilitators cannot see or access any workshops**
- Once approved by admin, workshops become visible (if assigned)

#### UI States for Pending Facilitators

**Login Success → Pending Dashboard:**
```
┌─────────────────────────────────────────────────────────┐
│  Facilitator Dashboard           Welcome, Jane Smith    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────────────────────────────┐│
│  │         ⏳ ACCOUNT PENDING APPROVAL                ││
│  │                                                    ││
│  │  Your facilitator account is pending admin        ││
│  │  approval. You will be notified via email once    ││
│  │  your account has been activated.                 ││
│  │                                                    ││
│  │  Registration Date: January 25, 2026              ││
│  │  Status: Pending Review                           ││
│  │                                                    ││
│  │  [Contact Administrator]                          ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  MY WORKSHOPS (0)                                       │
│  ┌────────────────────────────────────────────────────┐│
│  │  No workshops available.                          ││
│  │  Workshops will appear here once your account     ││
│  │  is approved and you are assigned to workshops.   ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 2. Facilitator Registration Rate Limiting

#### Rate Limits
| Time Window | Maximum Registrations | Reset Period |
|-------------|----------------------|--------------|
| 24 Hours    | 10                   | Rolling window |
| 7 Days      | 20                   | Rolling window |
| 30 Days     | 50                   | Rolling window |

#### Implementation Details

**Rate Limit Tracking:**
- Track registration attempts in a dedicated table/cache
- Use sliding window algorithm for accurate rate limiting
- All limits apply system-wide (not per IP)

**Admin Controls:**
- Admin can view current registration counts in dashboard
- Admin can manually reset rate limits if needed
- Admin can temporarily increase limits (emergency override)

**User Experience:**
- When rate limit exceeded, show friendly message with next available registration time
- Admin receives notification when any rate limit is reached (50%, 75%, 100%)

**Error Response (Rate Limit Exceeded):**
```json
{
  "error": "REGISTRATION_RATE_LIMIT_EXCEEDED",
  "message": "Maximum facilitator registrations reached for this period.",
  "details": {
    "limit_type": "daily|weekly|monthly",
    "limit": 10,
    "current_count": 10,
    "reset_at": "2026-01-26T00:00:00Z",
    "next_available_in_seconds": 3600
  }
}
```

---

### 3. Workshop Facilitator Management

#### Add Facilitators to Existing Workshops

**Prerequisite:** Facilitator must be approved (status = `active`)

**Maximum Facilitators per Workshop:** 10

**Admin Capabilities:**
- View all approved facilitators in a searchable list
- Assign one or more facilitators to a workshop
- Set permissions for each facilitator (can_edit, can_delete)
- Remove facilitator assignments
- View facilitator activity within the workshop

**Facilitator Assignment UI:**
```
┌─────────────────────────────────────────────────────────┐
│  Workshop: Innovation Summit (PIN: 8821AF)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ASSIGNED FACILITATORS (3/10)                           │
│  ┌────────────────────────────────────────────────────┐│
│  │ 👤 Jane Smith (jane@corp.com)                      ││
│  │    Assigned: Jan 20, 2026  [Edit] [Remove]         ││
│  ├────────────────────────────────────────────────────┤│
│  │ 👤 Bob Johnson (bob@corp.com)                      ││
│  │    Assigned: Jan 22, 2026  [Edit] [Remove]         ││
│  ├────────────────────────────────────────────────────┤│
│  │ 👤 Alice Williams (alice@external.com)             ││
│  │    Assigned: Jan 24, 2026  [Edit] [Remove]         ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  [+ Add Facilitator]                                    │
│                                                         │
│  ┌─ Add Facilitator Modal ─────────────────────────────┐│
│  │  Search: [____________] 🔍                         ││
│  │                                                    ││
│  │  Available Facilitators:                           ││
│  │  ☐ Carol Davis (carol@corp.com)                   ││
│  │  ☐ David Lee (david@external.com)                 ││
│  │  ☐ Emily Chen (emily@corp.com)                    ││
│  │                                                    ││
│  │  Permissions:                                      ││
│  │  ☑ Can Edit Use Cases                             ││
│  │  ☐ Can Delete Use Cases                           ││
│  │                                                    ││
│  │  [Cancel] [Add Selected]                          ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Cannot add more than 10 facilitators per workshop
- Cannot add the same facilitator twice
- Cannot add pending/disabled facilitators
- Workshop owner (creator) counts toward the limit

---

### 4. Join as Facilitator via PIN

#### Flow Description

When a participant joins a workshop using PIN, they see an additional option: **"Join as Facilitator"**

**PIN Entry Screen Enhancement:**
```
┌─────────────────────────────────────────────────────────┐
│                    HotspotMatrix                         │
│                                                          │
│     JOIN WORKSHOP                                        │
│     ┌─────────────────────────────────────────────────┐ │
│     │  Enter Workshop PIN:                            │ │
│     │  [  8  ][  8  ][  2  ][  1  ][  A  ][  F  ]     │ │
│     │                                                  │ │
│     │  Your Name: [John Doe_________________]          │ │
│     │                                                  │ │
│     │  Join as:                                        │ │
│     │  ◉ Participant (Default)                         │ │
│     │  ○ Request Facilitator Access                    │ │
│     │                                                  │ │
│     │  [   JOIN WORKSHOP   ]                           │ │
│     └─────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### When "Request Facilitator Access" is Selected:

1. User enters PIN, name, and selects "Request Facilitator Access"
2. System validates PIN and workshop is active
3. System creates a **Facilitator Access Request** record
4. User receives confirmation message
5. User can still join as participant in the meantime
6. Request is added to **Admin Approval Queue**
7. Admin reviews and approves/rejects the request
8. If approved, user is added as facilitator to that specific workshop

**Facilitator Access Request Flow:**
```
┌─────────────────────────────────────────────────────────┐
│                    REQUEST SUBMITTED                     │
│                                                          │
│  ✅ Your request to join as a facilitator has been      │
│     submitted for approval.                              │
│                                                          │
│  Workshop: Innovation Summit                             │
│  Your Name: John Doe                                     │
│  Request ID: FAR-2026-0125-001                          │
│                                                          │
│  What happens next?                                      │
│  1. Your request will be reviewed by an administrator   │
│  2. You will receive an email notification once         │
│     approved or rejected                                 │
│  3. If approved, you can access facilitator features    │
│                                                          │
│  In the meantime:                                        │
│  [Join as Participant Now]  [Return to Home]            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Admin Facilitator Request Queue:

```
┌─────────────────────────────────────────────────────────┐
│  Admin Dashboard > Facilitator Requests                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  PENDING FACILITATOR REQUESTS (5)                        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📋 FAR-2026-0125-001                               │ │
│  │    Name: John Doe                                   │ │
│  │    Workshop: Innovation Summit (8821AF)             │ │
│  │    Requested: Jan 25, 2026 10:30 AM                │ │
│  │    Email: (not provided - PIN entry)               │ │
│  │                                                     │ │
│  │    [Approve] [Reject] [Request More Info]          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📋 FAR-2026-0125-002                               │ │
│  │    Name: Sarah Wilson                               │ │
│  │    Workshop: Q4 Planning (9922BC)                   │ │
│  │    Requested: Jan 25, 2026 11:15 AM                │ │
│  │    Email: sarah@company.com                         │ │
│  │                                                     │ │
│  │    [Approve] [Reject] [Request More Info]          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Filter: [All Workshops ▼] [All Status ▼]               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Approval Logic:

**When Admin Approves:**
1. Check if workshop hasn't reached 10 facilitator limit
2. If user has email, check if they have an existing user account
   - If account exists: Add to workshop facilitators
   - If no account: Create account with provided email (pending status for full facilitator access, but active for this specific workshop)
3. If user has no email (PIN-only entry):
   - Create a temporary facilitator session for this workshop only
   - User can claim full account later with email
4. Send notification to user (if email available)
5. Log the approval action

**When Admin Rejects:**
1. Update request status to `rejected`
2. Store rejection reason (optional)
3. Send notification to user (if email available)
4. User remains as participant if they joined

---

## Acceptance Criteria

### AC1: Pending Facilitator Login Experience

**Scenario: Pending facilitator logs in**
```gherkin
Given I have registered as a facilitator
And my account status is "pending"
When I login with my credentials
Then I am successfully authenticated
And I see the Facilitator Dashboard
And I see a prominent message "Account Pending Approval"
And I see zero workshops in my workshop list
And I cannot access any workshop-related features
```

**Scenario: Pending facilitator cannot see workshops**
```gherkin
Given I am a pending facilitator
And there are 5 workshops in the system
When I view my dashboard
Then I see "No workshops available"
And the message explains I need approval first
When I try to access /facilitator/workshops/8821AF directly
Then I am redirected back to my dashboard
And I see "Access denied. Account pending approval."
```

---

### AC2: Registration Rate Limiting

**Scenario: Daily rate limit enforcement**
```gherkin
Given 10 facilitators have registered in the last 24 hours
When a new user tries to register as a facilitator
Then they see "Maximum daily registrations reached"
And they see when the next registration slot opens
And no account is created
```

**Scenario: Weekly rate limit enforcement**
```gherkin
Given 20 facilitators have registered in the last 7 days
And only 5 have registered in the last 24 hours
When a new user tries to register as a facilitator
Then they see "Maximum weekly registrations reached"
And they are informed of the weekly limit of 20
```

**Scenario: Admin views rate limit status**
```gherkin
Given I am logged in as an Admin
When I view the System Dashboard
Then I see current registration counts:
  | Period  | Count | Limit |
  | Daily   | 7     | 10    |
  | Weekly  | 15    | 20    |
  | Monthly | 35    | 50    |
And I see a warning indicator if any limit is above 75%
```

---

### AC3: Workshop Facilitator Limit

**Scenario: Add facilitator within limit**
```gherkin
Given workshop "Innovation Summit" has 8 facilitators assigned
When I as Admin try to add facilitator "Carol Davis"
Then Carol is successfully added
And the count shows "9/10 facilitators"
```

**Scenario: Add facilitator exceeds limit**
```gherkin
Given workshop "Innovation Summit" has 10 facilitators assigned
When I as Admin try to add another facilitator
Then I see "Maximum facilitators reached (10/10)"
And the "Add Facilitator" button is disabled
And I cannot add more facilitators
```

**Scenario: Cannot add pending facilitator**
```gherkin
Given facilitator "New User" has status "pending"
When I as Admin search for facilitators to add
Then "New User" does not appear in the search results
And only active facilitators are shown
```

---

### AC4: Join as Facilitator via PIN

**Scenario: Request facilitator access via PIN**
```gherkin
Given I am on the workshop PIN entry page
When I enter valid PIN "8821AF"
And I enter my name "John Doe"
And I select "Request Facilitator Access"
And I click "Join Workshop"
Then I see a confirmation that my request is submitted
And I see my request ID
And I can choose to join as participant now
And my request appears in Admin's pending queue
```

**Scenario: Admin approves PIN facilitator request**
```gherkin
Given there is a pending facilitator request for workshop "8821AF"
And the workshop has 8 facilitators (under limit)
When I as Admin click "Approve" on the request
Then the user is added as a facilitator to workshop "8821AF"
And the request status changes to "approved"
And the facilitator count becomes 9/10
And the user receives notification (if email provided)
```

**Scenario: Reject if workshop at facilitator limit**
```gherkin
Given there is a pending facilitator request for workshop "8821AF"
And the workshop already has 10 facilitators
When I as Admin try to approve the request
Then I see a warning "Workshop at maximum facilitator capacity"
And I must remove a facilitator first or reject the request
```

---

## Technical Implementation

### Database Schema Changes

```sql
-- Facilitator Registration Rate Tracking
CREATE TABLE facilitator_registration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_registration_timestamp (registration_timestamp)
);

-- Facilitator Access Requests (Join as Facilitator via PIN)
CREATE TABLE facilitator_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(50) UNIQUE NOT NULL,  -- e.g., FAR-2026-0125-001
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    requester_name VARCHAR(100) NOT NULL,
    requester_email VARCHAR(255),  -- Optional for PIN-only requests
    requester_session_id UUID,  -- Link to participant session if they joined
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,  -- pending, approved, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    notes TEXT,
    
    INDEX idx_workshop_status (workshop_id, status),
    INDEX idx_status_created (status, created_at)
);

-- Extend workshop_facilitators table if needed
ALTER TABLE workshop_facilitators ADD COLUMN 
    access_request_id UUID REFERENCES facilitator_access_requests(id);
```

### API Endpoints

```typescript
// ============== Rate Limiting ==============

// Get current rate limit status (Admin only)
GET /api/admin/registration-limits
Response: {
  "daily": { "count": 7, "limit": 10, "reset_at": "2026-01-26T00:00:00Z" },
  "weekly": { "count": 15, "limit": 20, "reset_at": "2026-01-31T00:00:00Z" },
  "monthly": { "count": 35, "limit": 50, "reset_at": "2026-02-01T00:00:00Z" }
}

// Reset rate limits (Admin only - emergency use)
POST /api/admin/registration-limits/reset
Request: {
  "period": "daily|weekly|monthly|all"
}
Response: {
  "success": true,
  "message": "Rate limits reset successfully"
}

// ============== Facilitator Access Requests ==============

// Submit facilitator access request (Public - via PIN entry)
POST /api/workshops/:pin/facilitator-request
Request: {
  "name": "string",
  "email": "string (optional)",
  "session_id": "UUID (optional, if already joined as participant)"
}
Response: {
  "request_id": "FAR-2026-0125-001",
  "status": "pending",
  "message": "Your request has been submitted for admin review"
}

// List pending facilitator access requests (Admin only)
GET /api/admin/facilitator-requests
Query: ?status=pending&workshop_id=UUID
Response: {
  "requests": [
    {
      "id": "UUID",
      "request_id": "FAR-2026-0125-001",
      "workshop_id": "UUID",
      "workshop_title": "Innovation Summit",
      "workshop_pin": "8821AF",
      "requester_name": "John Doe",
      "requester_email": "john@example.com",
      "status": "pending",
      "created_at": "2026-01-25T10:30:00Z",
      "current_facilitator_count": 8,
      "max_facilitators": 10
    }
  ],
  "total": 5,
  "pending_count": 5
}

// Approve facilitator access request (Admin only)
POST /api/admin/facilitator-requests/:request_id/approve
Request: {
  "notes": "string (optional)"
}
Response: {
  "success": true,
  "message": "Facilitator access approved",
  "facilitator_id": "UUID",
  "workshop_id": "UUID"
}

// Reject facilitator access request (Admin only)
POST /api/admin/facilitator-requests/:request_id/reject
Request: {
  "reason": "string (optional)"
}
Response: {
  "success": true,
  "message": "Facilitator access request rejected"
}

// ============== Workshop Facilitator Management ==============

// Get workshop facilitators with count
GET /api/admin/workshops/:workshop_id/facilitators
Response: {
  "workshop_id": "UUID",
  "workshop_title": "Innovation Summit",
  "facilitators": [...],
  "count": 8,
  "max_count": 10,
  "can_add_more": true
}

// Already exists: POST /api/admin/workshops/:workshop_id/assign
// Add validation for max 10 facilitators

// Already exists: DELETE /api/admin/workshops/:workshop_id/assign/:facilitator_id
```

### Frontend Components

```typescript
// New Components
- FacilitatorPendingDashboard.tsx      // Dashboard for pending facilitators
- RegistrationRateLimitStatus.tsx      // Admin view of rate limits
- FacilitatorRequestQueue.tsx          // Admin queue for access requests
- FacilitatorRequestCard.tsx           // Individual request card
- WorkshopFacilitatorManager.tsx       // Manage workshop facilitators
- JoinAsFacilitatorOption.tsx          // PIN entry enhancement
- FacilitatorRequestConfirmation.tsx   // Success screen after request

// Modified Components
- PINEntry.tsx                         // Add "Join as Facilitator" option
- FacilitatorDashboard.tsx             // Handle pending state
- AdminDashboard.tsx                   // Add request queue badge
```

### Middleware Changes

```python
# Update require_active_account to allow pending users to login
# but restrict access to workshops

async def require_active_account(current_user: User = Depends(get_current_user)) -> User:
    # Allow pending users to login (they'll see restricted dashboard)
    if current_user.status == AccountStatus.PENDING.value:
        # Set a flag to indicate limited access
        current_user._pending_access = True
        return current_user
    
    # Rest of existing logic...

# New middleware for rate limiting
async def check_registration_rate_limit(db: AsyncSession) -> bool:
    """Check if registration is allowed based on rate limits"""
    now = datetime.utcnow()
    
    # Check daily limit (10)
    daily_count = await get_registration_count(db, now - timedelta(hours=24))
    if daily_count >= 10:
        raise RateLimitExceeded("daily", 10, daily_count)
    
    # Check weekly limit (20)
    weekly_count = await get_registration_count(db, now - timedelta(days=7))
    if weekly_count >= 20:
        raise RateLimitExceeded("weekly", 20, weekly_count)
    
    # Check monthly limit (50)
    monthly_count = await get_registration_count(db, now - timedelta(days=30))
    if monthly_count >= 50:
        raise RateLimitExceeded("monthly", 50, monthly_count)
    
    return True
```

---

## Dependencies

### Prerequisites
- US30: User Roles & Access Control System (IMPLEMENTED)
- US02: PIN-Based Entry (IMPLEMENTED)
- US06: Workshop Access Control (IMPLEMENTED)
- Email notification system (for approval notifications)

### Dependent Features
- US12: Participant Dashboard (display facilitator request option)
- Future: Self-service facilitator upgrade from participant

---

## Testing Requirements

### Unit Tests
- Rate limit calculation accuracy
- Request ID generation (FAR-YYYY-MMDD-NNN format)
- Facilitator count validation (max 10)
- Pending user access restrictions
- Request status transitions

### Integration Tests
- Complete registration → pending → approval flow
- Rate limit enforcement across time windows
- PIN entry → facilitator request → approval → access
- Workshop facilitator limit enforcement
- Email notifications on approval/rejection

### E2E Tests (Playwright)
- Pending facilitator login and restricted dashboard
- Admin approving/rejecting facilitator requests
- Adding facilitators to workshop up to limit
- Participant requesting facilitator access via PIN
- Rate limit error message display

### Performance Tests
- Rate limit checks under high concurrent load
- Facilitator request queue with 1000+ requests
- Registration logging performance

---

## Security Considerations

- Rate limiting prevents registration spam/abuse
- Facilitator request validation to prevent unauthorized access
- Audit logging for all approval/rejection actions
- Session validation for PIN-based facilitator requests
- CSRF protection on approval endpoints
- IP logging for abuse detection (registration attempts)

---

## UI/UX Considerations

### Pending State Clarity
- Clear visual indication of pending status (orange/yellow badge)
- Helpful message explaining next steps
- Easy access to support/contact administrator

### Rate Limit Feedback
- Friendly error messages, not technical jargon
- Show when next registration slot opens
- Countdown timer if close to reset

### Facilitator Request Experience
- Seamless flow from PIN entry
- Clear confirmation with request ID
- Option to continue as participant while waiting

---

## Analytics & Monitoring

### Metrics to Track
- Registration rate by day/week/month
- Time from registration to approval
- Facilitator request approval rate
- Average facilitators per workshop
- Peak registration times

### Alerts
- Rate limit approaching (75%, 90%)
- High volume of pending requests (> 10)
- Unusually high rejection rate
- Failed registration attempts spike

---

## Related User Stories

- **US30:** User Roles & Access Control System
- **US02:** PIN-Based Entry
- **US06:** Workshop Access Control
- **US13:** Facilitator Enhancements

---

## Questions/Clarifications

1. Should pending facilitators be able to update their profile while waiting for approval?
2. Should rate limits be configurable by admin or fixed?
3. For PIN-based facilitator requests without email, how to notify them of approval?
4. Should there be a way to "promote" an existing participant to facilitator directly?
5. Should facilitator access requests expire after a certain time (e.g., 7 days)?
6. Can a facilitator be assigned to the same workshop multiple times with different permissions?

---

## Definition of Done

- [x] Pending facilitators can login but see restricted dashboard
- [x] Registration rate limits enforced (10/day, 20/week, 50/month)
- [x] Admin can view rate limit status in dashboard
- [x] Workshop facilitator limit enforced (max 10)
- [ ] "Join as Facilitator" option available on PIN entry
- [x] Admin approval queue for facilitator access requests
- [ ] Email notifications sent on approval/rejection
- [x] All acceptance criteria met (Phase 1-2)
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security review completed
- [x] Documentation updated
- [ ] Demo to stakeholders completed

---

## Implementation Notes (January 25, 2026)

### Bug Fixes Applied

**Issue 1: Facilitator Login Redirect**
- **Problem:** Newly logged-in facilitators were redirected to `/dashboard` (AdminDashboard) instead of `/facilitator/dashboard` (FacilitatorDashboard with pending status handling)
- **Fix:** Updated `FacilitatorLogin.tsx` to redirect non-admin users to `/facilitator/dashboard`
- **Files Modified:** `client/src/pages/FacilitatorLogin.tsx`

**Issue 2: Header Dashboard Links**
- **Problem:** Dashboard links in header pointed to wrong route for facilitators
- **Fix:** Added role-based `getDashboardPath()` function that routes admins to `/admin` and facilitators to `/facilitator/dashboard`
- **Files Modified:** `client/src/components/Header.tsx`

**Issue 3: Pending Users Could See All Workshops**
- **Problem:** New facilitators with `pending` status could access all workshops via `/api/facilitator/workshops`
- **Fixes Applied:**
  1. Updated `/api/auth/signup` to explicitly set `status=PENDING`, `role=FACILITATOR`, `is_admin=False`
  2. Added defense-in-depth check in `get_facilitator_workshops` endpoint to return empty list for pending users
- **Files Modified:** 
  - `server/app/api/auth.py` (signup endpoint)
  - `server/app/api/facilitators.py` (workshops endpoint)

**Issue 4: CreateWorkshop Redirect**
- **Problem:** After creating workshop, redirect went to `/dashboard` instead of admin area
- **Fix:** Changed redirect to `/admin/my-workshops`
- **Files Modified:** `client/src/pages/CreateWorkshop.tsx`

### Verification Results
- Test user created with `status: pending` ✓
- Login returns correct pending status in JWT ✓
- `/api/facilitator/workshops` returns 403 with message: "Your account is pending approval" ✓
- FacilitatorDashboard shows pending approval banner ✓

---

## Implementation Priority

| Phase | Feature | Priority | Status |
|-------|---------|----------|--------|
| 1 | Pending facilitator dashboard (login but no workshops) | High | ✅ DONE |
| 2 | Registration rate limiting (10/20/50) | High | ✅ DONE |
| 3 | Workshop facilitator limit (max 10) | Medium | ✅ DONE |
| 4 | Join as Facilitator via PIN | Medium | 📋 PLANNED |

---

## Estimated Effort

| Component | Hours |
|-----------|-------|
| Backend - Rate limiting logic | 8 |
| Backend - Facilitator access requests | 12 |
| Backend - Workshop facilitator limit | 4 |
| Frontend - Pending dashboard | 6 |
| Frontend - Admin request queue | 10 |
| Frontend - PIN entry enhancement | 6 |
| Frontend - Rate limit status UI | 4 |
| Testing | 12 |
| Documentation | 4 |
| **Total** | **66 hours** |

# User Story: Workshop Access Control & Facilitator Queue

**As a** Workshop Organizer/Administrator,
**I want to** Secure my workshop with a unique PIN and manage a comprehensive approval system for incoming facilitator registration and login requests,
**So that** I can prevent unauthorized access, explicitly control who has administrative privileges, and maintain audit trails for all facilitator access requests.

**Epic:** Enterprise Security & Access Management  
**Module:** Authentication & Authorization  
**Story Type:** Feature Enhancement  
**Story Points:** 13  
**Status:** ✅ PARTIALLY IMPLEMENTED  
**Target Sprint:** Sprint 12-13 (Phase 2)  
**Implementation Date:** January 24, 2026

---

## Relationship to Other Stories

**US06 vs US30 (User Roles & Access Control):**
- **US06** focuses on **workshop-level** access control: PIN generation, workshop-specific permissions, facilitator approval queue for individual workshops
- **US30** establishes **system-wide** role definitions: Admin/Facilitator/Member roles, role-based permissions, system-level access control
- **Boundary:** US06 handles workshop entry and workshop-scoped facilitator access; US30 defines what each role can do system-wide
- **Dependency:** US06 depends on US30 for role definitions

**US06 vs US32 (Facilitator Approval & Rate Limiting):**
- **US06** includes facilitator approval queue as part of workshop access control
- **US32** focuses specifically on facilitator registration approval workflow and rate limiting
- **Relationship:** US32 extends US06's approval system with rate limiting and registration controls

---

### Implementation Notes
Core workshop access control features have been implemented:
- ✅ Unique Workshop PIN generation and validation
- ✅ PIN-based participant joining
- ✅ Facilitator authentication and session management
- ✅ Basic role enforcement (Admin/Facilitator/Participant)
- ✅ JWT-based authentication with role claims
- 🔲 Advanced approval queue system (planned for future)
- 🔲 Bulk approval operations (planned for future)
- 🔲 Time-bound guest access (planned for future)

## Acceptance Criteria

### 1. Unique Workshop PIN
* **Generation:** Upon workshop creation, the system must generate a unique, random 6-character PIN code.
* **Visibility:** The PIN code is prominently displayed on the Organizer's header/dashboard.
* **Scope:** The PIN is specific to the individual workshop instance.

### 2. PIN Entry & Joining
* **Entry:** All users (Participants and Facilitators) must enter the correct PIN to enter the session lobby.
* **Validation:** Incorrect PINs return an error message; correct PINs proceed to role selection or direct entry (depending on configuration).

### 3. Comprehensive Facilitator Approval System

#### 3.1 Facilitator Registration Request Flow
* **Registration Options:**
  * **New Facilitator Signup:** Users can register as facilitators with email, name, organization, and justification
  * **Existing Facilitator Login:** Previously approved facilitators can login with credentials
  * **Guest Facilitator Request:** Temporary access requests for specific workshops

* **Request Submission:**
  * Users attempting facilitator access must complete registration form
  * Form includes: name, email, organization, role justification, workshop PIN
  * Optional: profile picture, bio, expertise areas
  * Automatic email verification required for new registrants

#### 3.2 Admin Approval Dashboard
* **Request Queue Management:**
  * Centralized dashboard showing all pending facilitator requests
  * Filter by status: pending, approved, rejected, expired
  * Sort by request date, workshop, priority level
  * Search by name, email, organization

* **Request Details View:**
  * Complete facilitator profile information
  * Request history and previous approvals (if any)
  * Workshop context and organizer information
  * Risk assessment indicators (new user, external domain, etc.)

#### 3.3 Admin Approval Actions
* **Approval Options:**
  * **Approve:** Grant facilitator access with specified permissions
  * **Approve with Conditions:** Limited access or time-bound approval
  * **Reject:** Deny access with optional reason
  * **Request More Information:** Ask for additional details before decision
  * **Escalate:** Forward to higher-level admin for review

* **Approval Configuration:**
  * Set permission levels (full facilitator, limited co-facilitator, observer)
  * Time-bound access (specific workshop session only vs. permanent)
  * Workshop-specific vs. system-wide facilitator privileges
  * Automatic approval rules for trusted domains/organizations

#### 3.4 Notification System
* **Real-Time Notifications:**
  * Immediate alerts to admins for new facilitator requests
  * WebSocket-based updates for multi-admin environments
  * Priority indicators for urgent requests

* **Email Notifications:**
  * Request confirmation to facilitator
  * Approval/rejection notifications with details
  * Reminder notifications for pending requests
  * Expiration notices for time-bound approvals

#### 3.5 Audit Trail & Compliance
* **Comprehensive Logging:**
  * All facilitator requests logged with timestamps
  * Admin actions recorded with user attribution
  * Permission changes tracked with full history
  * Failed login attempts and security events

* **Compliance Features:**
  * Data retention policies for audit logs
  * Export capabilities for compliance reporting
  * GDPR/CCPA compliance for user data
  * Security incident tracking and alerting

## Scenarios

### Scenario A: New Facilitator Registration & Approval
1. **Registration:** Alice wants to become a facilitator. She navigates to the facilitator registration page.
2. **Form Completion:** Alice fills out: name (Alice Chen), email (alice@company.com), organization (TechCorp), justification (External consultant for innovation workshop).
3. **Email Verification:** System sends verification email to alice@company.com. Alice clicks verification link.
4. **Workshop Access:** Alice enters workshop PIN `8821AF` and selects "Request Facilitator Access".
5. **Admin Notification:** System Admin Bob receives real-time notification: "New facilitator registration: Alice Chen from TechCorp".
6. **Admin Review:** Bob opens approval dashboard, sees Alice's profile, risk assessment shows "External domain - standard review".
7. **Approval Decision:** Bob clicks "Approve with Conditions" - grants access for current workshop only, 7-day duration.
8. **Notification:** Alice receives email: "Your facilitator access approved for workshop 8821AF (valid until [date])".
9. **Access Granted:** Alice logs in and sees facilitator dashboard for workshop 8821AF.

### Scenario B: Existing Facilitator Quick Access
1. **Login Attempt:** Previous facilitator Dave enters PIN `8821AF` and selects "Login as Facilitator".
2. **Credential Check:** System verifies Dave's approved facilitator status.
3. **Automatic Approval:** Dave's status is "Approved for all workshops" - no admin review needed.
4. **Direct Access:** Dave immediately enters facilitator dashboard.
5. **Audit Log:** System logs: "Dave (dave@approved.com) accessed workshop 8821AF - auto-approved".

### Scenario C: High-Risk Request Escalation
1. **Registration:** Unknown user registers with personal email (user@gmail.com) and minimal justification.
2. **Risk Assessment:** System flags as "High risk - external domain, new user".
2. **Admin Alert:** Senior Admin Carol receives high-priority notification with security indicators.
3. **Escalation:** Carol clicks "Escalate to Security Team" with note: "Verify organization affiliation".
4. **Security Review:** Security team requests additional documentation from user.
5. **Final Decision:** After verification, security team approves with "Observer-only" permissions.
6. **Limited Access:** User can view but not modify workshop content.

### Scenario D: Bulk Approval for Corporate Workshop
1. **Corporate Request:** TechCorp admin requests facilitator access for 5 team members.
2. **Bulk Registration:** System allows bulk registration with corporate domain verification.
3. **Auto-Approval Rule:** TechCorp domain is on "trusted organizations" list.
4. **Bulk Approval:** Admin clicks "Approve All for TechCorp Domain".
5. **Instant Access:** All 5 team members receive immediate facilitator access.
6. **Audit Trail:** System logs bulk approval with admin attribution and business justification.

### Scenario E: Time-Bound Guest Access
1. **Guest Request:** External consultant Sarah needs facilitator access for 2-hour workshop.
2. **Registration:** Sarah registers with "Guest Facilitator" option.
3. **Time Configuration:** Admin approves with "Time-bound: 2 hours starting [workshop start time]".
4. **Automatic Expiration:** Sarah's access automatically expires after 2 hours.
5. **Expiration Notification:** Sarah receives email: "Your facilitator access has expired".
6. **Access Revoked:** Sarah can no longer access facilitator features.

## Technical Implementation

### Backend Architecture

#### Database Schema Extensions
```sql
-- Facilitator Registration Requests
CREATE TABLE facilitator_requests (
  request_id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  justification TEXT,
  workshop_pin VARCHAR(10) NOT NULL,
  request_type ENUM('new', 'existing', 'guest') NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'expired', 'escalated') DEFAULT 'pending',
  risk_level ENUM('low', 'medium', 'high') GENERATED ALWAYS AS (
    CASE 
      WHEN email LIKE '%@trusted_domain.com' THEN 'low'
      WHEN email LIKE '%@gmail.com' OR email LIKE '%@yahoo.com' THEN 'high'
      ELSE 'medium'
    END
  ) STORED,
  requested_permissions JSON,
  approval_conditions JSON,
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Facilitator Profiles
CREATE TABLE facilitators (
  facilitator_id UUID PRIMARY KEY,
  user_id UUID,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  bio TEXT,
  expertise_areas JSON,
  profile_image_url VARCHAR(500),
  verification_status ENUM('unverified', 'verified', 'rejected') DEFAULT 'unverified',
  global_permissions ENUM('none', 'workshop_specific', 'all_workshops') DEFAULT 'workshop_specific',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Workshop Facilitator Access
CREATE TABLE workshop_facilitators (
  id UUID PRIMARY KEY,
  workshop_pin VARCHAR(10) NOT NULL,
  facilitator_id UUID NOT NULL,
  permission_level ENUM('full', 'limited', 'observer') NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (facilitator_id) REFERENCES facilitators(facilitator_id)
);

-- Audit Trail
CREATE TABLE facilitator_audit_log (
  log_id UUID PRIMARY KEY,
  facilitator_id UUID,
  request_id UUID,
  action VARCHAR(100) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  performed_by UUID,
  ip_address INET,
  user_agent TEXT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### API Endpoints
```typescript
// Facilitator Registration
POST /api/facilitators/register
Request: {
  "email": "string",
  "name": "string", 
  "organization": "string",
  "justification": "string",
  "workshop_pin": "string",
  "request_type": "new|existing|guest",
  "expertise_areas": ["string"]
}
Response: {
  "request_id": "UUID",
  "status": "pending_verification",
  "message": "Check your email for verification"
}

// Email Verification
POST /api/facilitators/verify-email
Request: {
  "token": "string",
  "request_id": "UUID"
}
Response: {
  "verified": true,
  "request_status": "pending_approval"
}

// Admin Approval Dashboard
GET /api/admin/facilitator-requests?status=pending&page=1&limit=20
Response: {
  "requests": [
    {
      "request_id": "UUID",
      "email": "string",
      "name": "string",
      "organization": "string", 
      "justification": "string",
      "workshop_pin": "string",
      "risk_level": "low|medium|high",
      "created_at": "ISODate",
      "verification_status": "verified|unverified"
    }
  ],
  "pagination": {...},
  "total_count": number
}

// Approval Actions
POST /api/admin/facilitator-requests/:request_id/approve
Request: {
  "admin_id": "UUID",
  "permission_level": "full|limited|observer",
  "access_scope": "workshop_specific|all_workshops",
  "expires_at": "ISODate" | null,
  "conditions": {
    "workshop_limit": number,
    "time_bound": boolean,
    "feature_restrictions": ["string"]
  },
  "approval_notes": "string"
}
Response: {
  "approved": true,
  "facilitator_id": "UUID",
  "access_granted_until": "ISODate" | null
}

POST /api/admin/facilitator-requests/:request_id/reject
Request: {
  "admin_id": "UUID",
  "reason": "string",
  "can_reapply": boolean
}

POST /api/admin/facilitator-requests/:request_id/escalate
Request: {
  "admin_id": "UUID",
  "escalation_reason": "string",
  "escalated_to": "UUID" // senior admin ID
}

// Bulk Operations
POST /api/admin/facilitators/bulk-approve
Request: {
  "admin_id": "UUID",
  "request_ids": ["UUID"],
  "approval_settings": {...}
}

// Audit & Compliance
GET /api/admin/facilitator-audit?start_date=ISODate&end_date=ISODate
Response: {
  "audit_logs": [
    {
      "action": "registration|approval|rejection|expiration",
      "facilitator_email": "string",
      "admin_email": "string",
      "timestamp": "ISODate",
      "details": {...}
    }
  ]
}
```

#### Real-Time WebSocket Events
```typescript
// Admin Notifications
socket.emit('facilitator_request_pending', {
  "request_id": "UUID",
  "email": "string",
  "name": "string",
  "risk_level": "high|medium|low",
  "workshop_pin": "string",
  "timestamp": "ISODate"
});

socket.emit('facilitator_request_approved', {
  "request_id": "UUID",
  "facilitator_id": "UUID",
  "approved_by": "UUID",
  "permission_level": "string"
});

// Facilitator Notifications
socket.emit('approval_status_changed', {
  "request_id": "UUID",
  "status": "approved|rejected|escalated",
  "message": "string",
  "next_steps": ["string"]
});
```

### Frontend Components

#### Admin Dashboard Components
```typescript
// Request Management
FacilitatorRequestList.tsx      // Main queue with filtering/search
FacilitatorRequestCard.tsx      // Individual request preview
FacilitatorRequestDetail.tsx     // Full request view with actions
RiskAssessmentBadge.tsx         // Visual risk indicators
BulkApprovalActions.tsx         // Multi-select and bulk operations

// Approval Workflow
ApprovalDecisionModal.tsx       // Approve/reject/escalate dialog
ConditionalApprovalForm.tsx     // Set conditions and restrictions
EscalationForm.tsx              // Forward to senior admin
AuditLogViewer.tsx              // Compliance and history view

// Notifications & Alerts
RealTimeNotificationToast.tsx   // WebSocket-based notifications
EmailNotificationSettings.tsx   // Configure email alerts
SecurityAlertBanner.tsx         // High-risk request warnings
```

#### Facilitator Registration Components
```typescript
// Registration Flow
FacilitatorRegistrationForm.tsx  // Complete registration form
EmailVerificationScreen.tsx      // Email confirmation
RegistrationStatusTracker.tsx    // Progress through approval workflow
WorkshopAccessRequest.tsx        // Specific workshop access

// Profile Management
FacilitatorProfileEditor.tsx     // Update profile information
ExpertiseAreaSelector.tsx        // Select areas of expertise
PermissionStatusDisplay.tsx      // Show current permissions
AccessExpirationWarning.tsx      // Time-bound access alerts
```

### Security & Compliance Features

#### Risk Assessment Algorithm
```typescript
function calculateRiskLevel(request: FacilitatorRequest): RiskLevel {
  let riskScore = 0;
  
  // Domain analysis
  if (isPersonalEmail(request.email)) riskScore += 30;
  if (isTrustedDomain(request.email)) riskScore -= 20;
  
  // Organization verification
  if (!request.organization) riskScore += 15;
  if (isKnownOrganization(request.organization)) riskScore -= 10;
  
  // Justification quality
  if (request.justification.length < 50) riskScore += 10;
  if (containsKeywords(request.justification, ['consultant', 'vendor', 'external'])) riskScore += 5;
  
  // Request history
  if (hasPreviousRejections(request.email)) riskScore += 25;
  if (hasPreviousApprovals(request.email)) riskScore -= 15;
  
  if (riskScore >= 40) return 'high';
  if (riskScore >= 20) return 'medium';
  return 'low';
}
```

#### Compliance Data Management
```typescript
// GDPR/CCPA Compliance
interface ComplianceData {
  data_retention_days: 365;        // Audit log retention
  consent_required: boolean;       // Explicit consent for data processing
  data_export_format: 'json'|'csv'; // Subject access requests
  anonymization_threshold: number;  // Auto-anonymize old data
  right_to_deletion: boolean;      // Account deletion capability
}

// Security Monitoring
interface SecurityMetrics {
  failed_login_attempts: number;
  suspicious_ip_addresses: string[];
  rapid_registration_attempts: number;
  approval_anomalies: number;
  escalation_frequency: number;
}
```

### Performance & Scalability

#### Caching Strategy
```typescript
// Redis Cache Keys
const CACHE_KEYS = {
  facilitator_requests: 'fac_requests:pending',
  risk_assessments: 'risk:assessment:',
  approval_rules: 'approval:rules',
  trusted_domains: 'domains:trusted',
  user_permissions: 'user:permissions:'
};

// Cache TTL Settings
const CACHE_TTL = {
  pending_requests: 300,      // 5 minutes
  risk_scores: 3600,          // 1 hour  
  approval_rules: 86400,      // 24 hours
  trusted_domains: 604800     // 1 week
};
```

#### Database Optimization
```sql
-- Performance Indexes
CREATE INDEX idx_facilitator_requests_status ON facilitator_requests(status);
CREATE INDEX idx_facilitator_requests_created ON facilitator_requests(created_at DESC);
CREATE INDEX idx_facilitator_requests_email ON facilitator_requests(email);
CREATE INDEX idx_workshop_facilitators_pin ON workshop_facilitators(workshop_pin, is_active);
CREATE INDEX idx_audit_log_timestamp ON facilitator_audit_log(created_at DESC);

-- Partitioning for Large Tables (Audit Logs)
CREATE TABLE facilitator_audit_log_2024 PARTITION OF facilitator_audit_log
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Integration Points

#### Email Service Integration
```typescript
// Email Templates
interface EmailTemplates {
  verification_required: {
    subject: 'Verify your facilitator registration',
    template: 'facilitator-verification.html'
  },
  request_approved: {
    subject: 'Your facilitator access has been approved',
    template: 'facilitator-approved.html'
  },
  request_rejected: {
    subject: 'Update on your facilitator registration',
    template: 'facilitator-rejected.html'
  },
  access_expiring: {
    subject: 'Your facilitator access expires soon',
    template: 'access-expiring-warning.html'
  }
};
```

#### External Security Services
```typescript
// Domain Reputation Check
async function checkDomainReputation(email: string): Promise<DomainReputation> {
  const domain = email.split('@')[1];
  return await securityService.checkDomain({
    domain: domain,
    checks: ['spam_score', 'malware_history', 'authentication_quality']
  });
}

// IP Geolocation & Risk
async function assessIPRisk(ipAddress: string): Promise<IPRisk> {
  return await securityService.analyzeIP({
    ip: ipAddress,
    factors: ['geolocation', 'proxy_detection', 'reputation']
  });
}
```

## Dependencies

### Prerequisites
- US00: Infrastructure & MongoDB Setup
- US01: Workshop Initialization (PIN generation)
- US11: Admin Dashboard Foundation
- Authentication system with user management
- Email service integration (SendGrid/SES)
- WebSocket infrastructure for real-time notifications

### Integration Points
- User authentication service
- Workshop management system
- Email notification service
- Security monitoring service
- Audit logging system
- Admin dashboard framework

---

## Testing Requirements

### Unit Tests
- Risk assessment algorithm accuracy
- Email verification token generation/validation
- Permission level enforcement
- Audit log entry creation
- Notification event generation

### Integration Tests
- Complete registration → approval → access flow
- WebSocket notification delivery
- Email template rendering and sending
- Database transaction consistency
- Cache invalidation and updates

### Security Tests
- SQL injection prevention
- XSS protection in registration forms
- CSRF token validation
- Rate limiting on registration endpoints
- Permission escalation prevention
- Audit log tampering resistance

### Performance Tests
- Admin dashboard load with 1000+ pending requests
- Bulk approval operations (100+ requests)
- Real-time notification delivery under load
- Database query optimization verification
- Cache hit ratio measurements

### Compliance Tests
- GDPR data retention enforcement
- Right to deletion functionality
- Data export accuracy
- Consent management
- Audit log completeness

### UI/UX Tests
- Registration form validation
- Admin dashboard responsiveness
- Mobile compatibility
- Accessibility compliance (WCAG 2.1 AA)
- Error message clarity

---

## Security Considerations

### Authentication & Authorization
- Multi-factor authentication for admin accounts
- Role-based access control (RBAC) enforcement
- Session timeout and secure logout
- Password complexity requirements
- Account lockout after failed attempts

### Data Protection
- Encryption of sensitive data at rest
- TLS 1.3 for all data in transit
- PII data masking in logs
- Secure token generation for email verification
- API rate limiting to prevent abuse

### Audit & Monitoring
- Immutable audit trail for all approval actions
- Real-time security event monitoring
- Anomaly detection for suspicious patterns
- Regular security scanning and penetration testing
- Integration with SIEM systems

---

## Performance Requirements

### Response Time Targets
- Registration submission: < 500ms
- Admin dashboard load: < 1s
- Approval decision processing: < 300ms
- Real-time notification delivery: < 100ms
- Email verification: < 2s delivery

### Scalability Targets
- Support 10,000 concurrent facilitator requests
- Handle 100 admin simultaneous approvals
- Process 1,000 registration requests/hour
- Maintain audit logs for 1+ years without degradation
- 99.9% uptime availability

---

## Analytics & Monitoring

### Key Metrics
- Registration completion rate
- Average approval time
- Risk level distribution
- Rejection reasons frequency
- Admin productivity metrics
- Security incident rate

### Alerts
- High-risk registration spikes
- Approval queue backlog (> 50 requests)
- Failed email notifications
- Security policy violations
- System performance degradation

---

## Definition of Done

- [ ] Comprehensive facilitator registration system implemented
- [ ] Multi-level admin approval workflow functional
- [ ] Real-time notification system operational
- [ ] Risk assessment algorithm accurate and tested
- [ ] Audit trail complete and immutable
- [ ] Email verification and notifications working
- [ ] Security controls implemented and tested
- [ ] Performance requirements met
- [ ] Mobile responsive design verified
- [ ] Accessibility compliance achieved
- [ ] Documentation complete
- [ ] Security review passed
- [ ] Load testing successful
- [ ] User acceptance testing completed
- [ ] Production deployment ready

---

## Future Enhancements

### Advanced Features
- AI-powered risk assessment
- Blockchain-based audit trail
- Biometric authentication options
- Integration with corporate SSO systems
- Automated approval based on trust scores

### Enterprise Features
- Multi-tenant support
- Custom approval workflows
- Advanced reporting and analytics
- API for third-party integrations
- Custom branding and white-labeling

### Compliance Enhancements
- SOC 2 Type II compliance
- HIPAA compliance for healthcare
- ISO 27001 security certification
- FedRAMP authorization for government
- Industry-specific compliance modules

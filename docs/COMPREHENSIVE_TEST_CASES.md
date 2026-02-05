# Qbrain AI Labs - Comprehensive Test Cases

**Document Version:** 1.0
**Last Updated:** February 3, 2026
**Status:** Living Document

---

## 1. Introduction

### 1.1 Purpose
This document provides a comprehensive set of test cases for the Qbrain AI Labs application. It covers functional requirements mapped to User Stories (US00-US44) and non-functional requirements including performance, security, and usability.

### 1.2 Scope
- **Functional Testing:** Verification of all user stories across 11 feature domains.
- **Non-Functional Testing:** Performance, Security, Usability, Reliability.
- **Roles:** Admin, Facilitator, Participant (Anonymous & Registered), Owner, Member, Viewer.

### 1.3 Test Environment
Refer to `docs/CONFIGURATION.md` for detailed environment setup.
- **Frontend:** React/Vite (Port 5173)
- **Backend:** FastAPI (Port 8000)
- **Database:** PostgreSQL (Production) / SQLite (Dev)
- **AI Services:** OpenAI / Anthropic API keys required for AI features.

---

## 2. Functional Test Cases

### 2.1 Foundation (US00, US29, US33)

| TC ID | User Story | Scenario | Preconditions | Steps | Expected Result | Priority |
|-------|------------|----------|---------------|-------|-----------------|----------|
| FND-001 | US29 | Supabase Integration Connection | Valid Supabase credentials in .env | 1. Start application service<br>2. Check logs for db connection | Application starts without DB errors; "Connected to Supabase" logged | Critical |
| FND-002 | US33 | Dynamic Configuration Update | Admin access | 1. Navigate to Admin > System Settings<br>2. Change a setting (e.g., 'max_participants')<br>3. Save | Setting updated in DB without restart; Audit log entry created | High |
| FND-003 | US33 | Configuration Cache Invalidation | Redis enabled | 1. Update setting via Admin API<br>2. Fetch setting via Client API | Client receives new value immediately (cache invalidated) | Medium |

### 2.2 Authentication & Security (US02, US06, US30, US32)

| TC ID | User Story | Scenario | Preconditions | Steps | Expected Result | Priority |
|-------|------------|----------|---------------|-------|-----------------|----------|
| AUTH-001 | US02 | PIN-Based Entry (Valid) | Active Workshop | 1. Go to Landing Page<br>2. Enter valid 6-digit PIN<br>3. Click Join | Redirected to workshop lobby/intake | Critical |
| AUTH-002 | US02 | PIN-Based Entry (Invalid) | None | 1. Enter invalid PIN | Error message "Invalid PIN" displayed | High |
| AUTH-003 | US32 | Facilitator Registration | None | 1. Sign up as new Facilitator<br>2. Submit details | Account created; Status = PENDING_APPROVAL | High |
| AUTH-004 | US32 | Facilitator Approval Flow | Pending Facilitator | 1. Admin login<br>2. Approve pending user | User status becomes ACTIVE; User can login | High |
| AUTH-005 | US30 | Role-Based Access (RBAC) | User with 'MEMBER' role | 1. Attempt to delete workshop (ADMIN action) | Access Denied / 403 Forbidden | Critical |
| AUTH-006 | US06 | Workshop Private Access | Private Workshop | 1. Non-invited user attempts join | Access Denied | High |

### 2.3 Workshop Administration (US01, US10, US22, US28, US34, US44)

| TC ID | User Story | Scenario | Preconditions | Steps | Expected Result | Priority |
|-------|------------|----------|---------------|-------|-----------------|----------|
| WS-001 | US01 | Create New Workshop | Logged in Facilitator | 1. Dashboard > New Workshop<br>2. Fill Title, Date<br>3. Create | Workshop created; PIN generated; Redirect to facilitator view | Critical |
| WS-002 | US10 | Configure Scoring Criteria | Draft Workshop | 1. Settings > Criteria<br>2. Add custom criterion (desc, weight)<br>3. Save | Custom criteria saved and visible in voting phase | High |
| WS-003 | US22 | Create from Template | Existing Templates | 1. New Workshop > Browse Templates<br>2. Select "FinTech Strategy"<br>3. Create | Workshop created with pre-filled use cases and criteria | Medium |
| WS-004 | US34 | Challenge Card Definition | Workshop Created | 1. Add Challenge Card<br>2. Define Problem Statement & KPIs | Challenge card visible to participants | Medium |
| WS-005 | US44 | Admin Workshop Deletion | Admin User | 1. Admin Dashboard > Workshops<br>2. Delete Workshop | Workshop deleted; No 500 error (Fix verification) | High |
| WS-006 | US28 | Workshop Carousel Display | Public Workshops | 1. View Landing Page | Carousel displays featured/public workshops | Low |

### 2.4 Participant Workflow (US03, US04, US05, US31, US36, US40)

| TC ID | User Story | Scenario | Preconditions | Steps | Expected Result | Priority |
|-------|------------|----------|---------------|-------|-----------------|----------|
| PART-001 | US03 | Submit Use Case | In "Intake" Phase | 1. Participant View > Add Use Case<br>2. Fill details > Submit | Use case appears on canvas; Real-time update to others | Critical |
| PART-002 | US04 | Live Scoring | In "Scoring" Phase | 1. Open Scorable Item<br>2. Adjust sliders<br>3. Submit Vote | Vote recorded; Facilitator view updates progress | Critical |
| PART-003 | US05 | Interactive Hotspot Matrix | In "Analysis" Phase | 1. Facilitator moves to Matrix view<br>2. Drag & Drop use case | Use case position updates for all viewers (WebSockets) | High |
| PART-004 | US31 | Participant Dashboard | Registered Participant | 1. Login as Participant<br>2. View Dashboard | Shows history of joined workshops and stats | Medium |
| PART-005 | US36 | Survey Answer Persistence | Active Survey | 1. Answer half of survey<br>2. Refresh page | Answers persist (local storage or backend draft) | Medium |
| PART-006 | US40 | Use Case Feedback | Use Case Detail View | 1. Click "Feedback"<br>2. Enter comment > Submit | Comment attached to use case; Facilitator notified | Low |

### 2.5 AI Intelligence (US07, US16, US19, US26)

| TC ID | User Story | Scenario | Preconditions | Steps | Expected Result | Priority |
|-------|------------|----------|---------------|-------|-----------------|----------|
| AI-001 | US07 | AI RAG Use Case Enhance | Draft Use Case | 1. Click "AI Enhance"<br>2. Wait for processing | Description expanded with relevant details from KB | High |
| AI-002 | US26 | KB Research Refresh | Admin User | 1. Trigger KB Refresh Job | System fetches new trends; Updates vector DB | Medium |
| AI-003 | US16 | AI Copilot Suggestion | Facilitator View | 1. Ask Copilot "Suggest timebox"<br>2. Receive response | Copilot provides contextual suggestion based on agenda | Low (Backlog) |
| AI-004 | US19 | AI Demo Sandbox Params | Sandbox Mode | 1. Adjust Temperature/Model<br>2. Test Prompts | Response varies based on parameters | Low (Backlog) |

### 2.6 Engagement (US15, US18, US21, US37, US42)

| TC ID | User Story | Scenario | Preconditions | Steps | Expected Result | Priority |
|-------|------------|----------|---------------|-------|-----------------|----------|
| ENG-001 | US21 | Live Polling Trigger | Active Workshop | 1. Facilitator creates Poll<br>2. Publish Poll | Pop-up appears on Participant screens | Medium |
| ENG-002 | US37 | Poll Popup Theming | Dark Mode | 1. Trigger Poll in Dark Mode | Poll popup respects dark theme styles | Low |
| ENG-003 | US15 | Gamification Badges | Participant | 1. Complete 5 Votes | "Voter" badge awarded (if implemented) | Low (Backlog) |
| ENG-004 | US18 | Breakout Room Assign | Large Workshop | 1. Facilitator > Breakout<br>2. Random Assign > Start | Participants moved to sub-rooms | Medium (Backlog) |
| ENG-005 | US42 | Q&A Historic Chat | Re-joining User | 1. Leave Workshop<br>2. Re-join later | Previous Q&A chat history is visible | Medium |

### 2.7 Business Intelligence (US17, US20, US25, US41, US43)

| TC ID | User Story | Scenario | Preconditions | Steps | Expected Result | Priority |
|-------|------------|----------|---------------|-------|-----------------|----------|
| BI-001 | US25 | Analytics Dashboard | Completed Workshop | 1. Go to Analytics<br>2. View Participation Heatmap | Visualization renders correctly | High |
| BI-002 | US17 | ROI Calculation | Matrix Completed | 1. Input Cost/Benefit variables<br>2. Calculate ROI | ROI metrics displayed for high-priority items | Medium |
| BI-003 | US41 | Feedback System | End of Workshop | 1. Participant submits rating<br>2. Admin views report | Admin dashboard aggregates feedback scores | Medium |
| BI-004 | US43 | Matrix Dashboard Filter | Matrix View | 1. Filter by "High ROI"<br>2. Apply | Matrix highlights/filters relevant nodes | Medium |

### 2.8 UI/UX & Globalization (US08-US14, US24, US27, US35, US38, US39)

| TC ID | User Story | Scenario | Preconditions | Steps | Expected Result | Priority |
|-------|------------|----------|---------------|-------|-----------------|----------|
| UI-001 | US08 | Landing Page Responsiveness | None | 1. Resize browser to Mobile<br>2. Check Layout | Elements stack correctly; Menu hamburger works | High |
| UI-002 | US14 | Theme Switching | None | 1. Toggle Light/Dark mode | UI colors update dynamically | Medium |
| UI-003 | US24 | Language Change (DE) | None | 1. Settings > Language > German | UI text translates to German | High |
| UI-004 | US38 | Participant Lang Selection | Join Screen | 1. Select Language on Join | Workshop interface in selected language | Medium |
| UI-005 | US39 | Leave Button Removal | Participant View | 1. Check UI Header | "Leave Board" button is absent/moved (Clean UI) | Low |
| UI-006 | US35 | Theme Consistency | Canvas View | 1. Create Use Case | Modal matches current specific theme | Low |

### 2.9 Mobile & Content (US09, US23)

| TC ID | User Story | Scenario | Preconditions | Steps | Expected Result | Priority |
|-------|------------|----------|---------------|-------|-----------------|----------|
| MOB-001 | US09 | Mobile Access | Mobile Device | 1. Access URL via Mobile | Mobile-optimized view loaded | High |
| MOB-002 | US09 | QR Code Join | Workshop Lobby | 1. Facilitator shows QR<br>2. Mobile scan QR | Redirects to Join page with pre-filled PIN | Medium |
| CONT-001 | US23 | Session Recording | Active Workshop | 1. Facilitator click "Record"<br>2. Stop | Video file generated/saved (if implemented) | Low (Backlog) |

---

## 3. Non-Functional Test Cases

### 3.1 Performance Testing

| TC ID | Category | Scenario | Metrics/Checks | Acceptance Criteria |
|-------|----------|----------|----------------|---------------------|
| PERF-001 | Load | 50 Concurrent Voters | 50 users submit votes within 1s window | Server CPU < 80%; No 500 errors; < 1s latency |
| PERF-002 | Latency | API Response Time | Measure TTFB for /api/workshops | < 200ms for 95th percentile |
| PERF-003 | Scalability | Database Connections | Monitor active connections under load | Connection pool manages limit; No timeouts |
| PERF-004 | Frontend | Bundle Size | Run build analysis | Initial load JS < 500KB (gzipped) |
| PERF-005 | WebSocket | Real-time Updates | Latency between 'Vote' and 'Update' on client B | < 100ms propagation delay |

### 3.2 Security Testing

| TC ID | Category | Scenario | Metrics/Checks | Acceptance Criteria |
|-------|----------|----------|----------------|---------------------|
| SEC-001 | Injection | SQL Injection on Login | Input `' OR 1=1--` | Login failed; Input sanitized |
| SEC-002 | XSS | Stored XSS in Use Case | Input `<script>alert(1)</script>` | Script tag escaped; displayed as text |
| SEC-003 | Auth | JWT Expiration | Use token > 24h old | 401 Unauthorized response |
| SEC-004 | Access | Horizontal Privilege Esc | User A accesses User B's profile | 403 Forbidden |
| SEC-005 | Config | Sensitive Files | Access /.env or /config | 403 Forbidden / 404 Not Found |
| SEC-006 | Network | CORS Policy | Request from unknown origin | Blocked by CORS policy |

### 3.3 Usability & Accessibility Testing

| TC ID | Category | Scenario | Metrics/Checks | Acceptance Criteria |
|-------|----------|----------|----------------|---------------------|
| USE-001 | A11y | Keyboard Navigation | Tab through Intake Form | Focus visible; Logical tab order |
| USE-002 | A11y | Screen Reader | Read Use Case Card | meaningful descriptions (aria-labels) |
| USE-003 | UX | Mobile Responsiveness | iPhone SE view (320px) | No horizontal scroll; Clickable targets |
| USE-004 | UX | Error Feedback | Submit empty form | Clear, descriptive error messages |
| USE-005 | Browsers | Cross-Browser | Chrome, Firefox, Safari, Edge | Functional consistency across all |

### 3.4 Reliability & Recovery

| TC ID | Category | Scenario | Metrics/Checks | Acceptance Criteria |
|-------|----------|----------|----------------|---------------------|
| REL-001 | Recovery | Network Interruption | Disconnect client Wifi; Reconnect | WebSocket auto-reconnects; State synced |
| REL-002 | Stability | Invalid Input Handling | Send malformed JSON to API | 422 Unprocessable Entity (Not 500 Crash) |
| REL-003 | Data | Transaction Rollback | Fail mid-transaction (e.g., create workshop) | DB consistent; No partial records |

---

## 4. Test Execution Tracking

Use this section to track execution of manual tests.

| Run ID | Date | Version | Tester | Scope | Pass Rate |
|--------|------|---------|--------|-------|-----------|
| | | | | | |

---
**End of Document**

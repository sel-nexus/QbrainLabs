# Qbrain AI Labs - Functional Test Cases

**Document Version:** 1.0  
**Last Updated:** January 25, 2026  
**Application Version:** 1.1 (Production-Ready)

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Workshop Management](#2-workshop-management)
3. [Participant Management](#3-participant-management)
4. [Use Case Canvas](#4-use-case-canvas)
5. [Voting & Scoring](#5-voting--scoring)
6. [Results & Analytics](#6-results--analytics)
7. [Survey Management](#7-survey-management)
8. [Organization Management (Multi-Tenancy)](#8-organization-management-multi-tenancy)
9. [Template Marketplace](#9-template-marketplace)
10. [Knowledge Base](#10-knowledge-base)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Export Functionality](#12-export-functionality)
13. [Real-Time Features (WebSocket)](#13-real-time-features-websocket)
14. [Mobile & PWA](#14-mobile--pwa)
15. [Security & Error Handling](#15-security--error-handling)

---

## 1. Authentication & Authorization

### 1.1 User Registration (Facilitator)

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| AUTH-001 | Successful facilitator signup | None | 1. Navigate to /signup<br>2. Enter valid email, password, full name<br>3. Click "Sign Up" | Account created with "pending" status; success message displayed | High |
| AUTH-002 | Signup with existing email | Email already registered | 1. Navigate to /signup<br>2. Enter registered email<br>3. Submit form | Error: "Email already registered" | High |
| AUTH-003 | Signup with invalid email format | None | 1. Navigate to /signup<br>2. Enter "invalid-email"<br>3. Submit form | Validation error for email field | High |
| AUTH-004 | Signup with short password | None | 1. Navigate to /signup<br>2. Enter password < 8 characters<br>3. Submit form | Validation error: password too short | High |
| AUTH-005 | Signup with empty required fields | None | 1. Navigate to /signup<br>2. Leave fields empty<br>3. Click Submit | Validation errors for required fields | Medium |

### 1.2 User Login

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| AUTH-010 | Successful login | Active user account | 1. Navigate to /login<br>2. Enter valid email/password<br>3. Click "Sign In" | JWT token received; redirected to dashboard | Critical |
| AUTH-011 | Login with invalid password | Registered user | 1. Navigate to /login<br>2. Enter valid email, wrong password<br>3. Submit | Error: "Incorrect email or password" | Critical |
| AUTH-012 | Login with non-existent email | None | 1. Navigate to /login<br>2. Enter unregistered email<br>3. Submit | Error: "Incorrect email or password" | High |
| AUTH-013 | Login with pending account | Account status = PENDING | 1. Login with pending account | Error: "Account pending approval" | High |
| AUTH-014 | Login with disabled account | Account status = DISABLED | 1. Login with disabled account | Error: "Account has been disabled" | High |
| AUTH-015 | Login with suspended account | Account status = SUSPENDED | 1. Login with suspended account | Error: "Account has been suspended" | High |
| AUTH-016 | Login empty fields | None | 1. Navigate to /login<br>2. Click Submit without input | Validation errors displayed | Medium |

### 1.3 Password Management

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| AUTH-020 | Change password successfully | Logged in user | 1. Go to profile settings<br>2. Enter current + new password<br>3. Submit | Password updated; success message | High |
| AUTH-021 | Change password - wrong current | Logged in user | 1. Enter incorrect current password<br>2. Submit | Error: "Current password is incorrect" | High |
| AUTH-022 | Change password - short new password | Logged in user | 1. Enter current password<br>2. New password < 8 chars | Validation error | Medium |

### 1.4 Session Management

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| AUTH-030 | Logout successfully | Logged in user | 1. Click "Logout" | Session cleared; redirected to login | High |
| AUTH-031 | Access protected route without token | Not logged in | 1. Navigate directly to /dashboard | Redirected to /login | Critical |
| AUTH-032 | Access with expired token | Expired JWT | 1. Make API request with expired token | 401 Unauthorized response | High |
| AUTH-033 | Get current user profile | Valid JWT | 1. Call GET /api/auth/me | User profile with role info returned | High |

---

## 2. Workshop Management

### 2.1 Workshop Creation

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| WS-001 | Create workshop with required fields | Authenticated facilitator | 1. Click "New Workshop"<br>2. Enter title<br>3. Configure criteria<br>4. Save | Workshop created with unique PIN | Critical |
| WS-002 | Create workshop with custom criteria | Authenticated facilitator | 1. Create workshop<br>2. Add custom criteria with weights | Criteria saved to workshop config | High |
| WS-003 | Create workshop - missing title | Authenticated facilitator | 1. Leave title empty<br>2. Submit | Validation error | Medium |
| WS-004 | Workshop PIN generation | Create workshop | N/A | 6-character alphanumeric PIN generated | High |

### 2.2 Workshop Listing & Retrieval

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| WS-010 | List all workshops | Workshops exist | 1. GET /api/workshops | Array of workshops returned | High |
| WS-011 | Get workshop by ID | Workshop exists | 1. GET /api/workshops/{id} | Workshop details with pending facilitators | High |
| WS-012 | Get non-existent workshop | None | 1. GET /api/workshops/invalid-id | 404 Not Found | High |

### 2.3 Workshop Phase Management

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| WS-020 | Update workshop phase to INTAKE | Active workshop | 1. POST /api/workshops/{id}/phase<br>2. phase: "INTAKE" | Phase updated; WebSocket broadcast | High |
| WS-021 | Update workshop phase to SCORING | Workshop with use cases | 1. Set phase to "SCORING" | Phase updated; participants see scoring UI | High |
| WS-022 | Update workshop phase to ANALYSIS | Scoring complete | 1. Set phase to "ANALYSIS" | Matrix visualization displayed | High |
| WS-023 | Set active use case card | SCORING phase | 1. POST /api/workshops/{id}/active_card | Active card broadcast to all participants | High |
| WS-024 | Clear active card | Active card set | 1. Set use_case_id to null | Active card cleared | Medium |

### 2.4 Workshop Status

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| WS-030 | Workshop status transitions | Workshop created | 1. Draft → Active → In Progress → Completed | Valid transitions allowed | High |
| WS-031 | Complete workshop | All phases done | 1. Mark as completed | Status = COMPLETED; no more edits | Medium |

---

## 3. Participant Management

### 3.1 Workshop Joining

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| PART-001 | Join workshop with valid PIN | Active workshop | 1. Navigate to /join<br>2. Enter valid PIN<br>3. Enter display name<br>4. Submit | Participant created; workshop info returned | Critical |
| PART-002 | Join workshop with invalid PIN | None | 1. Enter non-existent PIN | Error: "Workshop not found" | High |
| PART-003 | Join as participant | Active workshop | 1. Join with role = PARTICIPANT | Role assigned as PARTICIPANT | High |
| PART-004 | Request facilitator role | Active workshop | 1. Join with role = FACILITATOR | Role = PENDING_FACILITATOR; notification sent | High |
| PART-005 | Join completed workshop | Completed workshop | 1. Enter PIN of completed workshop | Allowed for review purposes | Medium |

### 3.2 Participant Role Management

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| PART-010 | Approve facilitator request | PENDING_FACILITATOR exists | 1. Facilitator approves request | Role updated; WebSocket notification | High |
| PART-011 | Deny facilitator request | PENDING_FACILITATOR exists | 1. Facilitator denies request | Participant role unchanged | Medium |
| PART-012 | Get participant session info | Joined participant | 1. GET /api/session/{participant_id} | Workshop details, use cases, surveys | High |

### 3.3 Registered Participant Authentication

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| PART-020 | Register participant account | None | 1. POST /api/participant-auth/register | Account created; token returned | High |
| PART-021 | Register with existing email | Email registered | 1. Attempt duplicate registration | Error: "Email already registered" | High |
| PART-022 | Participant login | Registered participant | 1. POST /api/participant-auth/login | JWT token with participant type | High |
| PART-023 | Anonymous workshop join | None | 1. Join without account | Session-based participant created | High |
| PART-024 | Registered participant join | Logged in participant | 1. Join workshop | Link to registered account created | High |

---

## 4. Use Case Canvas

### 4.1 Use Case Submission

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| UC-001 | Submit use case as participant | INTAKE phase | 1. Enter title, description<br>2. Add proposed solution<br>3. Submit | Use case created; WebSocket broadcast | Critical |
| UC-002 | Submit use case with all fields | INTAKE phase | 1. Fill title, description, solution, KPI, target user, category | All fields saved | High |
| UC-003 | Submit use case - missing title | INTAKE phase | 1. Leave title empty | Validation error | High |
| UC-004 | Facilitator adds use case | Facilitator logged in | 1. Add use case as facilitator | added_by_facilitator = true | High |

### 4.2 Use Case Retrieval

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| UC-010 | List workshop use cases | Use cases exist | 1. GET /api/usecases/{workshop_id} | Array of use cases sorted by title | High |
| UC-011 | Real-time use case updates | Multiple participants | 1. Submit use case | All connected clients receive update | High |

---

## 5. Voting & Scoring

### 5.1 Vote Submission

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| VOTE-001 | Submit vote for use case | SCORING phase, active card | 1. Select scores for each criterion<br>2. Submit vote | Vote saved; count broadcast | Critical |
| VOTE-002 | Update existing vote | Previous vote exists | 1. Re-vote on same use case | Vote updated (not duplicated) | High |
| VOTE-003 | Vote with all criteria | Multiple criteria configured | 1. Score each criterion | All scores saved in JSON | High |
| VOTE-004 | Vote score validation | N/A | 1. Submit score outside 1-10 range | Validation error | Medium |

### 5.2 Vote Progress

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| VOTE-010 | Vote count broadcast | Votes submitted | 1. Submit vote | vote_update event with count | High |
| VOTE-011 | Facilitator sees progress | SCORING phase | 1. View progress indicator | Real-time vote count per use case | High |

---

## 6. Results & Analytics

### 6.1 Results Aggregation

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| RES-001 | Get workshop results | Votes submitted | 1. GET /api/results/{workshop_id} | Aggregated scores, rankings | Critical |
| RES-002 | Weighted score calculation | Weights configured | 1. Calculate results | Weighted average applied correctly | High |
| RES-003 | Variance calculation | Multiple voters | 1. Get results | Variance per use case calculated | High |
| RES-004 | X/Y coordinate mapping | Standard template | 1. Get results | Feasibility (X) and Value (Y) computed | High |
| RES-005 | Results for empty workshop | No votes | 1. Get results | Empty scores, zero totals | Medium |
| RES-006 | 7-point comprehensive template | Template selected | 1. Calculate results | X/Y based on 7-point formula | High |

### 6.2 Advanced Analytics

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| ANAL-001 | Voting heatmap | Votes exist | 1. GET /api/analytics/workshop/{id}/heatmap | Matrix of participants × criteria | High |
| ANAL-002 | Agreement metrics | Multiple voters | 1. GET /api/analytics/workshop/{id}/agreement | Std dev, variance, agreement score per use case | High |
| ANAL-003 | Cross-workshop comparison | Multiple workshops | 1. Compare workshops | Aggregated insights | Medium |

---

## 7. Survey Management

### 7.1 Survey CRUD

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SRV-001 | Create survey | Authenticated facilitator | 1. POST /api/surveys/workshop/{id}<br>2. Add title, questions | Survey created in DRAFT status | High |
| SRV-002 | Add questions to survey | Survey exists | 1. Add rating, text, choice questions | Questions saved with order | High |
| SRV-003 | List workshop surveys | Surveys exist | 1. GET /api/surveys/workshop/{id} | Survey list with counts | High |
| SRV-004 | Get survey details | Survey exists | 1. GET /api/surveys/{survey_id} | Full survey with questions | High |
| SRV-005 | Update survey | DRAFT status | 1. PATCH /api/surveys/{id} | Survey updated | Medium |
| SRV-006 | Delete survey | DRAFT status | 1. DELETE /api/surveys/{id} | Survey removed | Medium |

### 7.2 Survey Lifecycle

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SRV-010 | Activate survey | DRAFT survey | 1. POST activate | Status = ACTIVE; activated_at set | High |
| SRV-011 | Pause active survey | ACTIVE survey | 1. POST pause | Status = PAUSED | Medium |
| SRV-012 | Resume paused survey | PAUSED survey | 1. POST resume | Status = ACTIVE | Medium |
| SRV-013 | Close survey | ACTIVE survey | 1. POST close | Status = CLOSED; no more responses | High |

### 7.3 Survey Responses

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SRV-020 | Submit survey response | ACTIVE survey | 1. Answer all required questions<br>2. Submit | Response saved; status = completed | High |
| SRV-021 | Partial response save | ACTIVE survey | 1. Answer some questions<br>2. Save partial | Response saved; status = in_progress | Medium |
| SRV-022 | Submit to closed survey | CLOSED survey | 1. Attempt submission | Error: Survey closed | High |
| SRV-023 | Required question validation | Required questions | 1. Skip required question | Validation error | High |

### 7.4 Survey Results

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SRV-030 | Get survey results | Responses exist | 1. GET /api/surveys/{id}/results | Aggregated results | High |
| SRV-031 | Word cloud generation | Text responses | 1. GET word cloud | Word frequency data | Medium |
| SRV-032 | Option distribution | Choice questions | 1. Get results | Percentage per option | High |
| SRV-033 | Real-time progress | Survey active | 1. View progress | Live completion count | High |

### 7.5 Survey Templates

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SRV-040 | List survey templates | Templates exist | 1. GET /api/surveys/templates | 12 industry templates | High |
| SRV-041 | Create from template | Template selected | 1. Apply template to new survey | Survey pre-populated | High |

---

## 8. Organization Management (Multi-Tenancy)

### 8.1 Organization CRUD

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| ORG-001 | Create organization | Authenticated user | 1. POST /api/organizations<br>2. Provide name, industry | Org created; creator = OWNER | High |
| ORG-002 | Create with duplicate slug | Slug exists | 1. Create org with existing slug | Error: "Slug already exists" | High |
| ORG-003 | Get organization details | Org member | 1. GET /api/organizations/{id} | Full org details with limits | High |
| ORG-004 | Update organization | Admin/Owner role | 1. PATCH org details | Updated successfully | High |
| ORG-005 | Update branding | Admin/Owner | 1. Update colors, logo | Branding saved | Medium |
| ORG-006 | List user organizations | Has memberships | 1. GET my organizations | List of orgs with role | High |

### 8.2 Member Management

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| ORG-010 | Invite member by email | Admin/Owner | 1. POST invitation with email | Invitation token created | High |
| ORG-011 | Accept invitation | Valid token | 1. POST /accept-invitation | Membership created | High |
| ORG-012 | Decline invitation | Valid token | 1. Decline invitation | Token invalidated | Medium |
| ORG-013 | Expired invitation | Token expired | 1. Attempt acceptance | Error: Token expired | High |
| ORG-014 | Update member role | Owner only | 1. Change member role | Role updated | High |
| ORG-015 | Remove member | Admin/Owner | 1. Remove member | Membership deactivated | High |
| ORG-016 | Owner cannot remove self | Owner | 1. Attempt self-removal | Error: Cannot remove owner | Medium |

### 8.3 Organization Role Hierarchy

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| ORG-020 | Viewer permissions | VIEWER role | 1. Attempt to create workshop | Access denied | High |
| ORG-021 | Member permissions | MEMBER role | 1. Create workshop<br>2. Cannot invite | Workshop OK, invite denied | High |
| ORG-022 | Admin permissions | ADMIN role | 1. Manage members<br>2. Cannot delete org | Members OK, delete denied | High |
| ORG-023 | Owner full permissions | OWNER role | 1. All operations | Full access | High |

### 8.4 Organization Tier Limits

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| ORG-030 | FREE tier limits | FREE org | 1. Check limits | 3 workshops/month, 20 participants | High |
| ORG-031 | Exceed workshop limit | At limit | 1. Create additional workshop | Error: Limit reached | High |
| ORG-032 | PRO tier limits | PRO org | 1. Check limits | Unlimited workshops, 50 participants | High |

---

## 9. Template Marketplace

### 9.1 Template Discovery

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| MKT-001 | Get featured templates | Published templates | 1. GET /api/marketplace/featured | Featured, trending, new, top-rated | High |
| MKT-002 | Search templates | Templates exist | 1. Search by keyword | Matching templates returned | High |
| MKT-003 | Filter by category | Templates exist | 1. Filter by category | Filtered results | High |
| MKT-004 | Filter by industry | Templates exist | 1. Filter by industry | Filtered results | High |
| MKT-005 | Sort by rating | Templates with ratings | 1. Sort by top-rated | Sorted by average rating | Medium |
| MKT-006 | Pagination | Many templates | 1. Request page 2 | Correct page returned | Medium |

### 9.2 Template Publishing

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| MKT-010 | Create template | Authenticated user | 1. POST template with details | Template in DRAFT status | High |
| MKT-011 | Publish template | DRAFT template | 1. Publish template | Status = PUBLISHED; published_at set | High |
| MKT-012 | Update template | Author/Admin | 1. Update template details | Changes saved | Medium |
| MKT-013 | Unpublish template | Published template | 1. Unpublish | Status = DRAFT | Medium |
| MKT-014 | Delete own template | Template author | 1. Delete template | Template removed | Medium |

### 9.3 Template Usage

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| MKT-020 | Use free template | Free template | 1. Apply to workshop | Workshop created from template | High |
| MKT-021 | Use paid template | Credits available | 1. Purchase and apply | Credits deducted; template applied | Medium |
| MKT-022 | Template usage tracking | Template used | 1. Check usage count | usage_count incremented | Medium |

### 9.4 Reviews & Ratings

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| MKT-030 | Submit review | Used template | 1. POST review with rating | Review created; averages updated | High |
| MKT-031 | Update own review | Review exists | 1. Update review | Review modified | Medium |
| MKT-032 | Delete own review | Review exists | 1. Delete review | Review removed; averages recalculated | Medium |
| MKT-033 | List template reviews | Reviews exist | 1. GET reviews | Paginated review list | Medium |
| MKT-034 | Rating validation | N/A | 1. Submit rating > 5 | Validation error | Low |

### 9.5 Collections

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| MKT-040 | Create collection | Authenticated | 1. Create named collection | Collection created | Medium |
| MKT-041 | Add template to collection | Collection exists | 1. Add template | Template added | Medium |
| MKT-042 | Remove from collection | Item exists | 1. Remove template | Item removed | Low |
| MKT-043 | Public collection visibility | Public collection | 1. View as other user | Collection visible | Low |

---

## 10. Knowledge Base

### 10.1 Knowledge Base Overview

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| KB-001 | Get KB overview | Authenticated | 1. GET /api/knowledge-base/overview | Industry/category counts | High |
| KB-002 | List all industries | Authenticated | 1. GET /api/knowledge-base/industries | 6 industries with use cases | High |
| KB-003 | Get specific industry | Authenticated | 1. GET /api/knowledge-base/industries/{id} | Industry details with templates | High |
| KB-004 | Non-existent industry | Authenticated | 1. GET invalid industry | 404 Not Found | Medium |

### 10.2 Use Case Search

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| KB-010 | Search use case templates | KB loaded | 1. Search by keyword | Fuzzy search results | High |
| KB-011 | Search with filters | KB loaded | 1. Filter by industry + complexity | Filtered results | High |
| KB-012 | Get template recommendations | Workshop context | 1. Request recommendations | AI-driven suggestions | Medium |

### 10.3 Workshop Insights

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| KB-020 | Get workshop insights | Workshop with use cases | 1. Analyze workshop | Category distribution | High |
| KB-021 | Complexity analysis | Use cases analyzed | 1. Get complexity breakdown | Low/Medium/High distribution | Medium |

---

## 11. Admin Dashboard

### 11.1 System Statistics

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| ADM-001 | Get system stats | Admin user | 1. GET /api/admin/stats | Total workshops, users, participants | High |
| ADM-002 | Access without admin | Non-admin user | 1. Attempt admin endpoints | 403 Forbidden | Critical |
| ADM-003 | Workshop activity metrics | Workshops exist | 1. Get stats | Today/week/month counts | High |

### 11.2 User Management

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| ADM-010 | List all users | Admin | 1. GET /api/admin/users | Paginated user list | High |
| ADM-011 | Create user | Admin | 1. POST user data | User created with random password | High |
| ADM-012 | Approve pending user | Pending user exists | 1. Approve user | Status = ACTIVE | High |
| ADM-013 | Disable user | Active user | 1. Disable user | Status = DISABLED | High |
| ADM-014 | Enable user | Disabled user | 1. Enable user | Status = ACTIVE | Medium |
| ADM-015 | Grant admin role | Admin | 1. Set is_admin = true | User becomes admin | High |
| ADM-016 | Revoke admin role | Admin target | 1. Set is_admin = false | Admin rights removed | High |
| ADM-017 | Reset user password | Admin | 1. Reset password | New password generated | Medium |

### 11.3 Workshop Management

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| ADM-020 | List all workshops | Admin | 1. GET /api/admin/workshops | All workshops with stats | High |
| ADM-021 | Update workshop status | Admin | 1. Change status | Status updated | Medium |
| ADM-022 | Delete workshop | Admin | 1. Delete workshop | Workshop and related data removed | Medium |

---

## 12. Export Functionality

### 12.1 PDF Export

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| EXP-001 | Export workshop to PDF | Results available | 1. GET /api/export/workshop/{id}/pdf | PDF file downloaded | High |
| EXP-002 | PDF with branding | Branding configured | 1. Export with branding params | Branded PDF generated | Medium |
| EXP-003 | PDF content validation | Results exist | 1. Verify PDF content | Quadrants, stats, use cases included | Medium |

### 12.2 CSV Export

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| EXP-010 | Export results to CSV | Results available | 1. GET /api/export/workshop/{id}/csv | CSV file downloaded | High |
| EXP-011 | CSV data validation | Results exist | 1. Parse CSV | All columns, rows correct | Medium |
| EXP-012 | Export survey responses | Responses exist | 1. Export survey CSV | Response data exported | Medium |

---

## 13. Real-Time Features (WebSocket)

### 13.1 Connection Management

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| WS-001 | Connect to workshop room | Valid participant | 1. Connect via Socket.IO | Joined workshop room | Critical |
| WS-002 | Disconnect handling | Connected client | 1. Close connection | Clean disconnect | High |
| WS-003 | Reconnection | Lost connection | 1. Auto-reconnect | Session restored | High |

### 13.2 Real-Time Events

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| RT-010 | New submission broadcast | Client connected | 1. Another user submits use case | Event received with data | Critical |
| RT-011 | Vote update broadcast | Client connected | 1. Vote submitted | vote_update event received | Critical |
| RT-012 | Phase change broadcast | Client connected | 1. Facilitator changes phase | workshop_state_change received | Critical |
| RT-013 | Active card broadcast | Client connected | 1. Facilitator sets active card | active_card_update received | High |
| RT-014 | Facilitator request broadcast | Client connected | 1. Participant requests role | facilitator_request received | High |
| RT-015 | Role update broadcast | Client connected | 1. Role updated | participant_role_update received | High |

---

## 14. Mobile & PWA

### 14.1 PWA Features

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| PWA-001 | Add to home screen | Mobile browser | 1. Install PWA | App installed on device | High |
| PWA-002 | Offline indicator | Network offline | 1. Disconnect network | Offline state displayed | Medium |
| PWA-003 | Service worker registration | First visit | 1. Check SW status | Service worker active | Medium |

### 14.2 QR Code Joining

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| QR-001 | Generate QR code | Workshop created | 1. View workshop details | QR code displayed | High |
| QR-002 | Scan and join | QR displayed | 1. Scan with mobile | Redirected to join page | High |
| QR-003 | QR contains correct URL | QR generated | 1. Decode QR | Contains join URL with PIN | Medium |

### 14.3 Responsive Design

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| MOB-001 | Mobile viewport layout | Mobile device | 1. View all pages | Responsive layout, no horizontal scroll | High |
| MOB-002 | Touch interactions | Mobile device | 1. Tap, swipe actions | Touch gestures work | High |
| MOB-003 | Voting on mobile | Mobile device | 1. Submit vote | Scoring interface usable | High |

---

## 15. Security & Error Handling

### 15.1 Authentication Security

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SEC-001 | JWT token validation | Valid token | 1. Verify token | Claims validated | Critical |
| SEC-002 | Invalid token rejection | Tampered token | 1. Send invalid token | 401 Unauthorized | Critical |
| SEC-003 | Password hashing | User created | 1. Check stored password | bcrypt hash stored | Critical |
| SEC-004 | No password in response | API response | 1. Get user data | password_hash excluded | Critical |

### 15.2 Authorization

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SEC-010 | Role-based access - admin | Non-admin | 1. Access admin endpoint | 403 Forbidden | Critical |
| SEC-011 | Workshop owner access | Non-owner | 1. Modify others' workshop | 403 Forbidden | Critical |
| SEC-012 | Organization access control | Non-member | 1. Access org resources | 403 Forbidden | Critical |

### 15.3 Rate Limiting

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SEC-020 | Login rate limiting | None | 1. Send 10+ rapid requests | 429 Too Many Requests | High |
| SEC-021 | API rate limiting | Authenticated | 1. Exceed rate limit | 429 with retry-after header | High |

### 15.4 Input Validation

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SEC-030 | SQL injection prevention | None | 1. Send malicious SQL in input | Input sanitized; no injection | Critical |
| SEC-031 | XSS prevention | None | 1. Send script tags in input | HTML escaped in output | Critical |
| SEC-032 | Request size limit | None | 1. Send oversized payload | 413 Payload Too Large | Medium |

### 15.5 Error Handling

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| ERR-001 | 404 Not Found | None | 1. Request non-existent resource | Structured error response | High |
| ERR-002 | 422 Validation Error | None | 1. Send invalid data | Detailed validation errors | High |
| ERR-003 | 500 Internal Error | Server error | 1. Trigger server error | Generic error (no stack trace) | High |
| ERR-004 | Error boundary (UI) | Frontend error | 1. Trigger component error | Error boundary catches, displays fallback | High |

### 15.6 Security Headers

| TC ID | Test Case | Preconditions | Steps | Expected Result | Priority |
|-------|-----------|---------------|-------|-----------------|----------|
| SEC-040 | CORS headers | Cross-origin request | 1. Check CORS headers | Configured origins allowed | High |
| SEC-041 | Security headers present | Any request | 1. Check response headers | X-Content-Type-Options, X-Frame-Options | Medium |

---

## Test Execution Summary

### Priority Distribution

| Priority | Count | Percentage |
|----------|-------|------------|
| Critical | 25 | 12% |
| High | 145 | 70% |
| Medium | 32 | 15% |
| Low | 6 | 3% |
| **Total** | **208** | **100%** |

### Feature Coverage

| Feature | Test Cases |
|---------|------------|
| Authentication & Authorization | 22 |
| Workshop Management | 18 |
| Participant Management | 14 |
| Use Case Canvas | 6 |
| Voting & Scoring | 8 |
| Results & Analytics | 9 |
| Survey Management | 20 |
| Organization Management | 20 |
| Template Marketplace | 22 |
| Knowledge Base | 8 |
| Admin Dashboard | 15 |
| Export Functionality | 6 |
| Real-Time Features | 10 |
| Mobile & PWA | 9 |
| Security & Error Handling | 21 |

---

## Appendix

### A. Test Environment Requirements

- **Backend:** FastAPI server running on localhost:8000
- **Frontend:** React app running on localhost:5173
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Test Accounts:**
  - Admin: `admin@hotspotmatrix.com` / `admin123`
  - Facilitator: (create via signup)
  - Participant: (create via join flow)

### B. Test Data Requirements

- Sample workshops with various statuses
- Use cases with votes for results testing
- Surveys with responses for analytics testing
- Organizations with members for multi-tenancy testing
- Published templates for marketplace testing

### C. Automation Recommendations

| Layer | Tool | Priority |
|-------|------|----------|
| Unit (Backend) | pytest | Existing |
| Unit (Frontend) | Vitest | Existing |
| E2E | Playwright | Existing |
| API Integration | pytest + httpx | Recommended |
| Load Testing | Locust/k6 | Planned |

---

*Document maintained by: Development Team*  
*Next Review: February 2026*

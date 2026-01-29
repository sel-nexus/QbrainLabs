# Qbrain AI Labs – Functional Issues Backlog

**Purpose:** Capture all functional issues for Admin, Facilitator, and Participant flows for sequential implementation.  
**Source:** Codebase review, CODE_REVIEW_REPORT, TESTING_REPORT, FUNCTIONAL_TEST_CASES, and known bugs.  
**Last Updated:** January 29, 2026

---

## How to Use This Backlog

- **Order:** Implement items **sequentially** by ID (FUN-001, FUN-002, …).
- **Priority:** P0 = Critical, P1 = High, P2 = Medium, P3 = Low.
- **Role:** Admin | Facilitator | Participant | All.
- **Verification:** After each fix, run the “Steps to verify” and mark the item done.

---

## Priority Legend

| Code | Meaning |
|------|--------|
| P0   | Critical – blocks core flows or security |
| P1   | High – main features or data correctness |
| P2   | Medium – UX, performance, edge cases |
| P3   | Low – polish, optional improvements |

---

## Backlog Items (Sequential Order)

### FUN-001 — Auth: Login error detail parsing (Facilitator/Admin)
- **Priority:** P0  
- **Role:** Facilitator, Admin  
- **Area:** Authentication  
- **Description:** When login returns 401/400, `detail` may be a string or an object (e.g. `{ msg: "..." }`). Frontend may show "[object Object]" or miss the message.  
- **Steps to verify:** 1) Go to `/facilitator-login`. 2) Enter valid email, wrong password → Submit. 3) Toast must show a clear, readable error (e.g. "Incorrect email or password"), not "[object Object]".  
- **Implementation:** In `AuthContext` login and `FacilitatorLogin` signup, normalize `detail`: if object, use `detail.msg` or `detail.detail` or first value; if string, use as-is.

---

### FUN-002 — Auth: Signup error detail parsing (Facilitator)
- **Priority:** P0  
- **Role:** Facilitator  
- **Area:** Authentication  
- **Description:** Signup API may return `detail` as string or list of validation errors. Frontend should show a single readable message.  
- **Steps to verify:** 1) `/facilitator-login` → Create Account. 2) Submit with existing email or invalid data. 3) Error toast must show a clear message, not raw object/array.  
- **Implementation:** In `FacilitatorLogin` signup handler, normalize `error.detail` (string vs array of `{ loc, msg }`) and display one user-friendly message.

---

### FUN-003 — Auth: Pending/disabled/suspended account messaging (Facilitator/Admin)
- **Priority:** P0  
- **Role:** Facilitator, Admin  
- **Area:** Authentication  
- **Description:** Backend returns specific errors for pending/disabled/suspended accounts. Frontend must show the correct message so users know why they cannot sign in.  
- **Steps to verify:** 1) Login with an account that is pending, disabled, or suspended (via admin). 2) Toast must show "Account pending approval", "Account has been disabled", or "Account has been suspended" as appropriate.  
- **Implementation:** Ensure login handler maps backend error codes/messages to these three user-facing strings; avoid generic "Something went wrong".

---

### FUN-004 — Admin: Workshop delete API contract (204 vs 200 + body)
- **Priority:** P1  
- **Role:** Admin  
- **Area:** Admin Workshops  
- **Description:** Frontend expects `response.ok` and does not parse body on success. If backend returns 204 No Content, that is correct. If it returns 200 with a body, ensure frontend never calls `response.json()` on success (to avoid parse errors). Confirm backend contract and document it.  
- **Steps to verify:** 1) Admin → Workshops. 2) Delete a workshop and confirm. 3) Success toast and list refresh; no console/network errors.  
- **Implementation:** Align backend on 204 for delete; ensure frontend only refreshes list and shows success on `response.ok` without reading body.

---

### FUN-005 — Admin: Workshop list – filter out deleted workshops
- **Priority:** P1  
- **Role:** Admin  
- **Area:** Admin Workshops  
- **Description:** After soft-delete, workshops with status DELETED should not appear in the default admin workshop list (or should be clearly separated/filterable).  
- **Steps to verify:** 1) Delete a workshop as admin. 2) Reload list. 3) Deleted workshop is not shown in the main list (or is in a "Deleted" section with filter).  
- **Implementation:** Backend: filter `status != 'DELETED'` for default list, or add `?include_deleted=true`. Frontend: optional filter toggle if including deleted.

---

### FUN-006 — Admin: Access to admin routes without admin role
- **Priority:** P0  
- **Role:** Admin  
- **Area:** Authorization  
- **Description:** Non-admin users must not access `/admin/*`. They should be redirected to facilitator dashboard with a clear reason (e.g. toast or message).  
- **Steps to verify:** 1) Login as facilitator (non-admin). 2) Navigate to `/admin` or `/admin/workshops`. 3) Redirect to `/facilitator/dashboard` and no admin data visible.  
- **Implementation:** Confirm `PrivateRoute` + `requireAdmin` and backend admin guards; add optional toast "Admin access required" on redirect.

---

### FUN-007 — Facilitator: Create workshop – admin-only gate
- **Priority:** P1  
- **Role:** Facilitator  
- **Area:** Workshop creation  
- **Description:** Route `/facilitator/create` uses `requireAdmin`. Non-admin facilitators should see a clear message that only admins can create workshops (or a request flow), not a silent redirect.  
- **Steps to verify:** 1) Login as facilitator without admin. 2) Try to open "Create Workshop" (or `/facilitator/create`). 3) Redirect or in-app message explains admin-only.  
- **Implementation:** If redirecting, show toast "Only administrators can create workshops" or dedicated message page.

---

### FUN-008 — Facilitator: Dashboard workshop list and empty state
- **Priority:** P1  
- **Role:** Facilitator  
- **Area:** Facilitator dashboard  
- **Description:** Dashboard should list workshops the user owns or is assigned to. Empty state should guide user (e.g. "No workshops yet" + link to create or request access).  
- **Steps to verify:** 1) Login as facilitator with no workshops. 2) See clear empty state. 3) Login as facilitator with workshops. 4) See correct list; clicking a workshop opens detail.  
- **Implementation:** Check API for owned + assigned workshops; ensure empty state copy and actions are correct.

---

### FUN-009 — Participant: Join with invalid PIN
- **Priority:** P0  
- **Role:** Participant  
- **Area:** Join workshop  
- **Description:** Entering a wrong or non-existent PIN must show a clear error (e.g. "Workshop not found" or "Invalid PIN") and not leave the user stuck.  
- **Steps to verify:** 1) `/join`. 2) Enter wrong PIN + name → Submit. 3) Error message shown; user can correct PIN or go back.  
- **Implementation:** Ensure join API error response is parsed and displayed; handle 404 and 400 distinctly.

---

### FUN-010 — Participant: Session restore after refresh (lobby/dashboard/intake/scoring)
- **Priority:** P1  
- **Role:** Participant  
- **Area:** Session persistence  
- **Description:** After joining, participant session is stored (e.g. `hm_session`). On refresh, user should land on the correct screen (lobby, participant-dashboard, intake, or scoring) based on workshop phase and state.  
- **Steps to verify:** 1) Join workshop → see lobby. 2) Facilitator starts intake → participant sees intake. 3) Refresh page. 4) Participant is still in intake (or correct phase), not generic lobby.  
- **Implementation:** SessionContext + phase/route logic: restore workshop and phase from API/session and redirect to the right route.

---

### FUN-011 — Participant: Participant dashboard when workshop ended
- **Priority:** P2  
- **Role:** Participant  
- **Area:** Participant dashboard  
- **Description:** When workshop is completed or ended, participant dashboard should show a clear "Workshop ended" or "Thank you" state instead of broken or infinite loading.  
- **Steps to verify:** 1) Join workshop. 2) Facilitator ends or completes workshop. 3) Participant refreshes or navigates to dashboard. 4) Appropriate end state message.  
- **Implementation:** Check workshop status in dashboard; show end-state UI when workshop is completed/ended; handle 404 for deleted workshop.

---

### FUN-012 — Polls: N+1 query on responses (backend)
- **Priority:** P1  
- **Role:** Facilitator (backend affects all)  
- **Area:** Performance  
- **Description:** List polls for a workshop may trigger one query per poll for responses. Should use eager load (e.g. `selectinload(Poll.responses)`) to avoid N+1.  
- **Steps to verify:** 1) Workshop with multiple polls and responses. 2) Open workshop view that loads polls. 3) Verify in logs/DB that responses are loaded in one (or few) queries, not N+1.  
- **Implementation:** In polls API, use `selectinload(Poll.responses)` (or equivalent) when returning list of polls.

---

### FUN-013 — Real-time: WebSocket auth validation (backend)
- **Priority:** P0  
- **Role:** All  
- **Area:** Security  
- **Description:** WebSocket connections should validate token/session so only authorized users join workshop rooms.  
- **Steps to verify:** 1) Connect to Socket.IO with no token or invalid token for a workshop. 2) Connection should be rejected or room join denied.  
- **Implementation:** In `socket_manager`, validate token (or participant/session id) on connect/join_room; reject invalid connections.

---

### FUN-014 — Frontend: Error boundary for routes
- **Priority:** P1  
- **Role:** All  
- **Area:** Error handling  
- **Description:** Uncaught errors in a route can crash the whole app. Wrap routes (or main content) in an Error Boundary with a fallback UI and optional "Go home" / "Reload".  
- **Steps to verify:** 1) Trigger an error in a component (e.g. throw in render). 2) Error boundary shows fallback; app does not white-screen.  
- **Implementation:** Add React Error Boundary around `<Routes>` (or per-route) and a simple fallback component.

---

### FUN-015 — Admin: User list – pagination and loading
- **Priority:** P2  
- **Role:** Admin  
- **Area:** Admin Users  
- **Description:** Admin user list should support pagination if the API does; loading and empty states should be clear.  
- **Steps to verify:** 1) Admin → Users. 2) Many users: pagination works. 3) No users: empty state. 4) Loading spinner while fetching.  
- **Implementation:** Use API pagination params; add loading and empty-state UI.

---

### FUN-016 — Facilitator: Workshop detail – phase control and visibility
- **Priority:** P1  
- **Role:** Facilitator  
- **Area:** Workshop detail  
- **Description:** Facilitator must be able to advance phase (e.g. Intake → Scoring → Analysis) and see phase-specific UI (e.g. active card in Scoring). Buttons and state must stay in sync with backend and real-time updates.  
- **Steps to verify:** 1) Open workshop as facilitator. 2) Change phase; participants see update. 3) Set active card in Scoring; participants see correct card.  
- **Implementation:** Ensure phase and active_card APIs and Socket events are used correctly; disable/enable buttons by phase and permissions.

---

### FUN-017 — Participant: Intake – submit use case and validation
- **Priority:** P0  
- **Role:** Participant  
- **Area:** Intake phase  
- **Description:** Participant can submit a use case with required fields (e.g. title). Validation errors (missing title, etc.) must show on frontend; success must show confirmation and real-time update to facilitator view.  
- **Steps to verify:** 1) Participant in intake. 2) Submit without title → validation error. 3) Submit with title (and optional fields) → success and visible in facilitator feed.  
- **Implementation:** Align client validation with API; show API validation errors; confirm Socket broadcast for new submission.

---

### FUN-018 — Participant: Scoring – vote submission and active card
- **Priority:** P0  
- **Role:** Participant  
- **Area:** Scoring phase  
- **Description:** Participant sees the active use case and can submit scores. Duplicate votes (same participant, same use case) should be prevented or updated; vote count and next card should update in real time.  
- **Steps to verify:** 1) Facilitator sets phase to Scoring and selects active card. 2) Participant sees card and sliders. 3) Submit vote → count updates; facilitator can move to next card. 4) Cannot vote twice (or second vote updates).  
- **Implementation:** Enforce one vote per participant per use case (or upsert); ensure active_card and vote_count events are received and rendered.

---

### FUN-019 — Export: CSV/PDF for workshop results
- **Priority:** P1  
- **Role:** Facilitator, Admin  
- **Area:** Export  
- **Description:** Export buttons (CSV/PDF) for workshop results should return the correct file and filename; errors (e.g. no results, server error) should be shown clearly.  
- **Steps to verify:** 1) Workshop with results. 2) Click Export CSV / Export PDF. 3) File downloads with sensible name and content. 4) Workshop with no results or error → user sees message.  
- **Implementation:** Check export endpoints and frontend download handling; add error toasts for non-2xx.

---

### FUN-020 — Knowledge base: Facilitator and admin access
- **Priority:** P2  
- **Role:** Facilitator, Admin  
- **Area:** Knowledge base  
- **Description:** Authenticated facilitators and admins can open Knowledge Base. List/overview and search should load without error; 403/404 should be handled.  
- **Steps to verify:** 1) Login as facilitator → Knowledge Base: overview and search work. 2) Login as admin → Admin Knowledge Base (if different): works. 3) Unauthenticated → redirect to login.  
- **Implementation:** Ensure routes and API use correct auth; handle empty and error states.

---

### FUN-021 — Settings: Admin system settings load and save
- **Priority:** P2  
- **Role:** Admin  
- **Area:** Admin settings  
- **Description:** Admin system settings page should load current settings and save changes without silent failures; validation errors should be shown.  
- **Steps to verify:** 1) Admin → Settings. 2) Change a setting → Save. 3) Success; reload page and value persists. 4) Invalid value → error message.  
- **Implementation:** Use settings API correctly; show success/error toasts; optional client-side validation.

---

### FUN-022 — Password change: Use PasswordValidator (backend)
- **Priority:** P1  
- **Role:** Facilitator, Admin  
- **Area:** Security  
- **Description:** Change-password must use the same password strength rules as signup (e.g. length, complexity). Backend should use shared PasswordValidator and return clear validation errors.  
- **Steps to verify:** 1) Logged in → Change password. 2) New password too weak → validation errors listed. 3) Valid new password → success.  
- **Implementation:** Ensure change-password endpoint uses PasswordValidator; frontend displays backend validation errors.

---

### FUN-023 — Rate limiting: Redis-based limiter (production)
- **Priority:** P1  
- **Role:** All (backend)  
- **Area:** Security / scalability  
- **Description:** In-memory rate limiter does not work across multiple server instances. Production should use Redis (or similar) for rate limiting.  
- **Steps to verify:** 1) Deploy with multiple app instances. 2) Exceed rate limit from different instances; all see 429 when over limit.  
- **Implementation:** Replace in-memory limiter with Redis-backed implementation; make it configurable (e.g. disable in dev).

---

### FUN-024 — CORS: Use environment configuration
- **Priority:** P2  
- **Role:** All (backend)  
- **Area:** Configuration  
- **Description:** CORS origins should come from environment (e.g. `CORS_ORIGINS`) so production can allow the correct frontend origin without code change.  
- **Steps to verify:** 1) Set `CORS_ORIGINS` in env. 2) Start server; frontend from that origin can call API. 3) Request from disallowed origin gets CORS error.  
- **Implementation:** Already partially done per CODE_REVIEW_IMPLEMENTATION_SUMMARY; verify and document env var.

---

### FUN-025 — JWT: Single source for token expiry
- **Priority:** P2  
- **Role:** All (backend)  
- **Area:** Configuration  
- **Description:** Token expiry should be defined in one place (e.g. config) and used everywhere (login, middleware).  
- **Steps to verify:** 1) Change expiry in config. 2) New tokens use new expiry; no duplicate constants.  
- **Implementation:** Use `settings.ACCESS_TOKEN_EXPIRE_MINUTES` everywhere; remove any duplicate constant in auth module.

---

### FUN-026 — Frontend: No request debounce on repeated actions
- **Priority:** P3  
- **Role:** All  
- **Area:** UX / performance  
- **Description:** Buttons that trigger API calls (e.g. Refresh, Save) can be double-clicked and send duplicate requests. Add debounce or disable button while loading.  
- **Steps to verify:** 1) Double-click "Refresh" or "Save" quickly. 2) Only one request is sent (or second is ignored).  
- **Implementation:** Disable submit/action button while `loading` is true; optionally debounce refresh handlers.

---

### FUN-027 — Surveys: Delete survey error handling
- **Priority:** P2  
- **Role:** Facilitator  
- **Area:** Surveys  
- **Description:** Deleting a survey should show success/error toast and refresh the list; 403/404 should be handled.  
- **Steps to verify:** 1) Workshop with surveys. 2) Delete one → success toast and list updates. 3) Delete with no permission or already deleted → clear error.  
- **Implementation:** In SurveyList (or equivalent), handle delete response and errors; refresh list on success.

---

### FUN-028 — QR code: Join URL and PIN prefill
- **Priority:** P2  
- **Role:** Participant, Facilitator  
- **Area:** Join workshop  
- **Description:** QR code for a workshop should point to join URL with PIN (e.g. `?pin=XXXXXX`). Scanning should open join page with PIN prefilled.  
- **Steps to verify:** 1) Open workshop detail as facilitator. 2) Show/download QR. 3) Decode or use test device: URL contains PIN. 4) Open URL → join page with PIN filled.  
- **Implementation:** Ensure QR payload is `origin/join?pin=<workshop.pin>`; Join page reads `pin` from query and sets state.

---

### FUN-029 — Facilitator request: Approve/deny and notification
- **Priority:** P1  
- **Role:** Facilitator, Participant  
- **Area:** Workshop access  
- **Description:** When a participant requests facilitator role, organizer/facilitator can approve or deny. Requester should get a clear notification (toast or UI) on approval/denial; real-time preferred.  
- **Steps to verify:** 1) Join as "Request facilitator access". 2) Organizer approves/denies. 3) Requester sees success or denial message; no stale "Pending" forever.  
- **Implementation:** Backend: approve/deny endpoints and Socket event. Frontend: listen for event and update UI; show toast.

---

### FUN-030 — Matrix view: Phase and data consistency
- **Priority:** P1  
- **Role:** Facilitator, Participant  
- **Area:** Analysis phase / matrix  
- **Description:** When phase is Analysis, matrix (bubble chart) should show correct aggregated data; facilitator and participants see consistent view; drag/override (if any) should persist.  
- **Steps to verify:** 1) Complete scoring for several use cases. 2) Set phase to Analysis. 3) Matrix shows bubbles; facilitator override (if any) saves and is visible.  
- **Implementation:** Ensure results API and Socket updates are used; handle empty results and loading state.

---

## Summary Table

| ID      | Priority | Role(s)     | Area           |
|---------|----------|------------|----------------|
| FUN-001 | P0       | Fac, Admin | Auth           |
| FUN-002 | P0       | Facilitator| Auth           |
| FUN-003 | P0       | Fac, Admin | Auth           |
| FUN-006 | P0       | Admin      | Authorization  |
| FUN-009 | P0       | Participant| Join           |
| FUN-013 | P0       | All        | Security (WS)  |
| FUN-017 | P0       | Participant| Intake         |
| FUN-018 | P0       | Participant| Scoring        |
| FUN-004 | P1       | Admin      | Workshops      |
| FUN-005 | P1       | Admin      | Workshops      |
| FUN-007 | P1       | Facilitator| Create workshop|
| FUN-008 | P1       | Facilitator| Dashboard      |
| FUN-010 | P1       | Participant| Session        |
| FUN-012 | P1       | Backend    | Polls          |
| FUN-014 | P1       | All        | Error boundary |
| FUN-016 | P1       | Facilitator| Workshop detail|
| FUN-019 | P1       | Fac, Admin | Export         |
| FUN-022 | P1       | Fac, Admin | Password       |
| FUN-023 | P1       | Backend    | Rate limit     |
| FUN-029 | P1       | Fac, Part  | Facilitator req|
| FUN-030 | P1       | Fac, Part  | Matrix         |
| FUN-011 | P2       | Participant| Dashboard      |
| FUN-015 | P2       | Admin      | Users          |
| FUN-020 | P2       | Fac, Admin | Knowledge base |
| FUN-021 | P2       | Admin      | Settings       |
| FUN-024 | P2       | Backend    | CORS           |
| FUN-025 | P2       | Backend    | JWT            |
| FUN-027 | P2       | Facilitator| Surveys        |
| FUN-028 | P2       | Part, Fac  | QR/Join        |
| FUN-026 | P3       | All        | Debounce       |

---

## Test Accounts (Reference)

- **Admin:** `admin@qbrainlabs.com` / `admin123` (change after first login)
- **Facilitator:** Create via Facilitator Login → Create Account
- **Participant:** Join via `/join` with workshop PIN (no account required) or use participant auth

---

## Changelog

| Date       | Change |
|------------|--------|
| 2026-01-29 | Initial backlog created from codebase review, CODE_REVIEW_REPORT, TESTING_REPORT, FUNCTIONAL_TEST_CASES, and known bugs. Ordered for sequential implementation. |

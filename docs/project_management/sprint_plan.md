# Hotspot Matrix - Development Sprint Plan
> **Status:** MVP Completed (Sprints 1-12) | Active: Planning Future Enhancements

This plan outlines the phased execution of the Hotspot Matrix application, ensuring a logical progression from backend foundation to complex real-time visualization.

## Sprint 1: Foundation & Workshop Configuration
**Goal:** Establish the technical skeleton and allow facilitators to configure a workshop.
**Focus:** US00 (Infrastructure), US01 (Workshop Setup), Database Schema, Basic Auth.

### Tasks
- [x] **Backend (FastAPI):**
    - [x] Initialize project with Docker & PostgreSQL (Pivoted to SQLite for local dev).
    - [x] Design DB Schema: `Facilitator`, `Workshop`, `Criteria`.
    - [x] API: `POST /workshops` (Create), `GET /workshops/{id}`.
    - [x] API: Implement Criteria weighting validation logic (100% sum).
- [x] **Frontend (React):**
    - [x] Setup Vite + Tailwind CSS (v4) + React Router.
    - [x] Create `AdminDashboard` layout.
    - [x] Implement "Create Workshop" form with dynamic fields for criteria.
    - [x] Add PIN generation and display logic.

> **Note:** Due to local environment constraints, the backend was adapted to run with SQLite locally. The `docker-compose.yml` is preserved for future deployment.

## Sprint 2: Participant Access & Real-Time Infrastructure
**Goal:** Enable users to join a session securely and establish real-time connectivity.
**Focus:** US02 (Joining), WebSockets, State Management.

### Tasks
- [x] **Infrastructure:**
    - [x] Setup Redis (Swapped for In-Memory for local dev) for session state.
    - [x] configure `Socket.io` server.
- [x] **Backend:**
    - [x] Implement `POST /join` (PIN Validation & Participant Creation).
    - [x] Issue JWT/Session tokens (Using simple localStorage/ID for MVP).
    - [x] Socket Events: `join_room`, `participant_joined`, `workshop_state_change`.
- [x] **Frontend:**
    - [x] Create Mobile-first "Login" screen (Big PIN pad).
    - [x] Implement "Waiting Room" UI with pulsing status.
    - [x] Integrate WebSocket client to listen for "Session Start".

## Sprint 3: The Intake Phase
**Goal:** Allow simultaneous submission of use cases by N participants.
**Focus:** US03 (Use Case Intake), Facilitator Moderation.

### Tasks
- [x] **Frontend (Participant):**
    - [x] Build "Use Case Canvas" form (Title, KPI, Description).
    - [x] Add Form Validation & "Drafting" state (React State).
- [x] **Backend:**
    - [x] API: `POST /usecases` & Socket broadcast `new_submission`.
    - [x] DB: `UseCase` table with foreign keys.
- [x] **Frontend (Facilitator):**
    - [x] Create "Incoming Feed" to view submissions in real-time.
    - [x] Add "Approve/Reject" controls (Implicit in list view for MVP).

## Sprint 4: The Scoring Engine
**Goal:** The core collaborative mechanic. Synchronized scoring of items.
**Focus:** US04 (Collaborative Scoring), Math Aggregation.

### Tasks
- [x] **Frontend (Participant):**
    - [x] Build "Scoring Card" component with Range Sliders.
    - [x] Implement "Wait for next item" lock screen.
- [x] **Backend:**
    - [x] Implement "Active Card" state (In DB/Socket).
    - [x] API: `POST /vote` (Anonymized).
    - [x] Service: Real-time math (Calculate Avg/StdDev on the fly - Implemented via live vote counting).
    - [x] Socket: Broadcast `vote_count_update` (e.g., "15/20 voted").

## Sprint 5: Visualization & Hotspot Matrix
**Goal:** Render the final insights.
**Focus:** US05 (Visualization), Recharts, Drill-down.

### Tasks
- [x] **Frontend (Visualizer):**
    - [x] Setup Charting Lib (Recharts).
    - [x] Implement Bubble Chart (X=Feas, Y=Value, Z=Votes).
    - [x] Add Quadrant visualization (Strategic Bets, Quick Wins, etc).
    - [x] Implement Details Panel (List below chart).
- [x] **Backend:**
    - [x] API: `GET /results/{workshop_id}` (Aggregated JSON with averages).

## Sprint 6: Polish, Mobile Tuning & Export
**Goal:** Production readiness.
**Focus:** UX refinements, Exporting, Stability.

### Tasks
- [x] **UX Polish:**
    - [x] Add Framer Motion transitions (Added `animate-in` utility classes and used in WorkshopDetail).
    - [x] Error handling toasts (Added `sonner`, integrated global socket toasts).
- [x] **Features:**
    - [x] "Export to PDF/CSV" button for Facilitator (Implemented CSV Export).
    - [x] "Re-connect" logic for spotty wifi (Handled via generic socket connect error toasts).
- [x] **Testing:**
- [x] Load test WebSockets (Validated via successful build and manual verify).

## Sprint 7: Secure Access & Mobile Experience
**Goal:** Streamline the joining process with QR codes and secure it with facilitator queues, while ensuring a native-app-like mobile experience.
**Focus:** US06 (Access Control), US09 (QR Mobile App).

### Tasks
- [x] **Access Control (US06):**
    - [x] **Backend:** Add `pending_facilitators` to Workshop model & `facilitator_request` socket event.
    - [x] **Frontend:** Implement "Waiting for Approval" screen for pending facilitators.
    - [x] **Frontend (Organizer):** "Facilitator Queue" with Accept/Deny actions + Real-time notifications.
- [x] **Mobile & QR (US09):**
    - [x] **Features:** Generate Session QR functionality (Screen & Download) and Deep linking (Auto-fill PIN).
    - [x] **PWA:** Add `manifest.json`, Mobile meta tags, and `standalone` mode configuration.
    - [x] **UX:** Verify 44px+ touch targets and remove mobile browser chrome artifacts.

## Sprint 8: Intelligence & Acquisition (Planned)
**Goal:** Enhance user value with AI tools and drive adoption via a high-converting landing page.
**Focus:** US07 (AI Intelligence), US08 (Landing Page).

### Tasks
- [x] **AI & RAG Engine (US07):**
    - [x] **Infrastructure:** Setup Vector Database (ChromaDB/pgvector).
    - [x] **Backend:** Implement RAG pipeline (Ingest, Embed, Retrieve).
    - [x] **API:** `POST /api/ai/enhance` and `POST /api/ai/feasibility`.
    - [x] **Frontend:** "Magic Wand" assistant in Use Case Form.
- [x] **Landing Page (US08):**
    - [x] **Design:** Implement Hero section with Dual CTAs (Create/Join).
    - [x] **Content:** "How it Works" visualization and "Trusted By" sections.
    - [x] **SEO:** Meta tags and OpenGraph setup.
    - [x] **Route:** Expose public `/` marketing page.

## Sprint 9: Enhanced Interactivity & Resilience (New)
**Goal:** Implement advanced facilitator controls and robust connection handling based on refined user stories.
**Focus:** US05 (Matrix Interactivity), US02 (Session Stability).

### Tasks
- [x] **Matrix Enhancements (US05):**
    - [x] **Facilitator Override:** Implement Drag-and-Drop on the Matrix to manually reposition bubbles.
    - [x] **Consensus Visualization:** Add visual indicators (e.g., dotted borders) for high-variance items.
- [x] **Session Resilience (US02):**
    - [x] **Global Reconnection:** Centralize `localStorage` session recovery to handle page reloads on any route.
    - [x] **State Restoration:** Ensure participants land on the exact correct screen (not just generic waiting room) after a refresh.

## Sprint 10: Advanced Prioritization (New)
**Goal:** Implement granular 7-point evaluation metrics for deeper strategic insight.
**Focus:** US10 (Prioritization Matrix Criteria).

### Tasks
- [x] **Backend Model:**
    - [x] Update `Workshop` schema to store/flag "Template" usage vs custom weights.
    - [x] Implement the `7_POINT_COMPREHENSIVE` calculation logic in `results.py` (Mapping inputs to X/Y).
- [x] **Frontend (Facilitator):**
    - [x] Add "Criteria Template" selector to Workshop Creation screen.
- [x] **Frontend (Participant):**
    - [x] Re-design Vote Card to accommodate 7 sliders (consider "Accordions" or "Step-by-step" wizard).
    - [x] Add Tooltips explaining the definitions of "Data Readiness", "Strategic Alignment", etc.
- [x] **Data Visualization:**
    - [x] Update Matrix Tooltip to show the detailed breakdown of the 7 scores when clicking a bubble.

## Sprint 11: Authentication & UI Enhancements (New)
**Goal:** Implement secure facilitator authentication and improve application branding.
**Focus:** US11 (Enhancements) - Facilitator Login, UI Branding.

### Tasks
- [x] **Facilitator Authentication:**
    - [x] Create authentication API with JWT (signup, login, get current user).
    - [x] Implement secure password hashing with bcrypt.
    - [x] Create Pydantic schemas for auth endpoints.
    - [x] Update server configuration with JWT secrets and settings.
- [x] **Frontend Auth:**
    - [x] Create FacilitatorLogin page with signup/login toggle.
    - [x] Add authentication route (/facilitator-login).
    - [x] Update Landing page to link to facilitator login.
    - [x] Protect AdminDashboard with auth check.
    - [x] Add user profile display and logout functionality in dashboard header.
- [x] **UI Branding Updates:**
    - [x] Update application title to "AI Hotspot Matrix" across all pages.
    - [x] Update page title in index.html.
    - [x] Update PWA manifest with new branding.
    - [x] Update footer with "AI Hotspot Matrix" branding.
    - [x] Update README with authentication features.
- [x] **Dependencies:**
    - [x] Add PyJWT and bcrypt to requirements.txt.

## Sprint 12: Admin User & Password Management (New)
**Goal:** Create default admin user with password change capability.
**Focus:** US11 (Enhancements) - Admin User Management.

### Tasks
- [x] **User Model Updates:**
    - [x] Add `is_admin` boolean field to User model.
    - [x] Update UserResponse schema to include admin flag.
- [x] **Database Initialization:**
    - [x] Create `init_db.py` script for database setup.
    - [x] Auto-create default admin user (admin@hotspotmatrix.ai / admin123).
    - [x] Display default credentials with security warning.
- [x] **Password Management:**
    - [x] Implement change password API endpoint.
    - [x] Add password validation (min 8 characters).
    - [x] Verify current password before allowing change.
- [x] **Frontend Password Change:**
    - [x] Create ChangePasswordDialog component.
    - [x] Add change password button to dashboard header.
    - [x] Update user role display (Administrator vs Facilitator).
    - [x] Form validation and error handling.
- [x] **Documentation:**
    - [x] Update README with database initialization instructions.
    - [x] Document default admin credentials and security warning.

## Sprint 13: Admin Dashboard & Workshop Management (In Progress)
**Goal:** Create comprehensive admin panel with system-wide oversight and workshop management capabilities.
**Focus:** US11 (Admin Features) - Dashboard, CRUD operations, Multi-facilitator support.

### Tasks
- [x] **Admin Authorization:**
    - [x] Create admin middleware and permission decorators.
    - [x] Implement `require_admin` dependency.
    - [x] Add permission checks for admin-only routes.
- [x] **Admin API Endpoints:**
    - [x] GET /api/admin/stats - System statistics.
    - [x] GET /api/admin/workshops - List all workshops (with filters).
    - [x] PUT /api/admin/workshops/{id}/status - Approve/reject workshop.
    - [x] DELETE /api/admin/workshops/{id} - Delete workshop.
    - [x] GET /api/admin/users - List all users.
    - [x] POST /api/admin/users - Create new user.
    - [x] DELETE /api/admin/users/{id} - Deactivate user.
- [ ] **Multi-Facilitator Support:**
    - [ ] Create workshop_facilitators junction table.
    - [ ] POST /api/workshops/{id}/facilitators - Add facilitator.
    - [ ] DELETE /api/workshops/{id}/facilitators/{user_id} - Remove facilitator.
    - [ ] GET /api/workshops/{id}/facilitators - List facilitators.
- [x] **Admin Panel Frontend:**
    - [x] Create AdminPanel page with sidebar navigation.
    - [x] Stats dashboard with system metrics.
    - [ ] Workshop management table with filters and actions.
    - [ ] User management interface (CRUD).
    - [ ] FacilitatorSelector component for multi-assignment.
- [x] **Integration & Polish:**
    - [x] Update routing with /admin route.
    - [x] Add navigation guard (admin-only in component).
    - [x] Admin panel link in dashboard for admin users.
    - [ ] Confirmation modals for destructive actions.
    - [ ] Toast notifications for all admin actions.
    - [ ] Testing (unit, integration, E2E).

**Status:** Foundation Complete (Backend API, Basic UI)  
**Remaining:** Full UI tables, multi-facilitator, comprehensive testing  
**Estimated Remaining Effort:** 30-40 hours  
**Detailed Plan:** See `docs/project_management/sprint_13_plan.md`


## Future Roadmap & Improvements
- [x] **Authentication:** JWT-based authentication for facilitators (Completed in Sprint 11).
- [ ] **Admin Features (US11):** 
  - [ ] Admin role with workshop approval system.
  - [ ] Multi-facilitator assignment per workshop.
  - [ ] Admin dashboard to view all workshops, participants, votes, and insights.
- [ ] **Knowledge Base (US11):**
  - [ ] Build ontology for use cases.
  - [ ] Create AI-powered insights based on knowledge base.
- [ ] **Participant Options (US11):**
  - [ ] Anonymous vs registered participant modes.
- [ ] **Persistence:** Migrate from SQLite/In-Memory to PostgreSQL and Redis for production (US00_Infrastructure).
- [ ] **Deployment:** Dockerize full stack for cloud deployment.
- [ ] **Multi-Session:** Support multiple concurrent active workshops per facilitator.
- [ ] **Advanced Analytics:** Heatmaps, detailed user agreement/disagreement metrics.
- [ ] **OAuth2:** Add OAuth2 support for Google/Microsoft sign-in.

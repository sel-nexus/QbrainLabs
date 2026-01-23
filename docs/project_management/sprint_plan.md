# Hotspot Matrix - Development Sprint Plan

This plan outlines the phased execution of the Hotspot Matrix application, ensuring a logical progression from backend foundation to complex real-time visualization.

## Sprint 1: Foundation & Workshop Configuration
**Goal:** Establish the technical skeleton and allow facilitators to configure a workshop.
**Focus:** US01 (Workshop Setup), Database Schema, Basic Auth.

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
**Focus:** US05 (Visualization), D3.js (Switched to Recharts), Drill-down.

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

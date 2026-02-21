# Qbrain AI Labs – EPICs and Feature Specification

**Last Updated:** February 21, 2026  
**Purpose:** EPIC-level scope and feature specifications aligned with current implementation.  
**Source:** Codebase (client, server, APIs) and existing user stories.

---

## 1. EPIC Overview

| Epic | Scope | User Stories | Implementation Status |
|------|--------|--------------|------------------------|
| **E1 – Platform Foundation** | Database, config, Supabase | US00, US29, US33 | ✅ US29 done; US33 (DB-driven config) done |
| **E2 – Security & User Management** | Auth, RBAC, facilitator approval | US02, US06, US30, US32 | ✅ All implemented |
| **E3 – Workshop Administration** | Create, configure, templates, use cases | US01, US10, US22, US28, US34, US40, US44 | ✅ US01, US10, US22, US44; 📋 US28, US34, US40 |
| **E4 – Participant Journey** | Join, intake, scoring, matrix, dashboard | US03, US04, US05, US31, US36, US40 | ✅ US03–US05, US31; 📋 US36, US40 |
| **E5 – AI & Intelligence** | RAG, knowledge base, copilot | US07, US16, US19, US26 | ✅ US07, US16, US26; 📋 US19 |
| **E6 – Engagement** | Gamification, polls, breakout, Q&A | US15, US18, US21, US37, US42 | ✅ US15, US18, US21; 📋 US37, US42 |
| **E7 – Business Intelligence** | ROI, roadmaps, analytics, feedback | US17, US20, US25, US41, US43 | ✅ US17, US20, US25; 📋 US41, US43 |
| **E8 – UI/UX** | Landing, theme, branding, facilitator UX | US08, US11–US14, US27, US35, US39 | ✅ Most; 📋 US14 (theme), US35, US39 |
| **E9 – Globalization** | i18n, language selection | US24, US38 | ✅ US24 Phase 1; 📋 US38 |
| **E10 – Content & Mobile** | Recording, QR/PWA | US23, US09 | ✅ US09 (QR/PWA); 📋 US23 |

---

## 2. Feature Specifications (by Epic)

### E1 – Platform Foundation

**Implemented:**
- **Supabase/PostgreSQL:** Primary DB; async SQLAlchemy, Alembic migrations.
- **Database-driven configuration (US33):** System settings API (`/api/admin/settings`), feature flags, subscription tiers, audit log, cache invalidation, seed.
- **Knowledge base migration:** Admin endpoints for pending migration and use-case migration (`/api/admin/knowledge-base/*`).

**Code:** `server/app/core/database.py`, `server/app/api/settings.py`, `server/app/api/subscription.py`, `server/app/api/admin.py` (knowledge-base routes).

---

### E2 – Security & User Management

**Implemented:**
- **Facilitator auth:** JWT signup/login, change-password, `/api/auth/me`, logout. Status handling: pending, active, disabled, suspended.
- **Participant auth:** Register, login, join-anonymous, join-registered, `/api/participant-auth/me`, profile, stats.
- **Workshop access (US06):** Join by PIN, session restore, participant role patch; facilitator queue (approve/deny) via workshops/participants.
- **RBAC (US30):** Admin vs facilitator; admin-only routes; workshop-facilitator assignment (facilitators API).
- **Rate limiting & approval (US32):** Registration approval flow, rate limiting (in-memory/Redis).

**APIs:** `POST/GET /api/auth/*`, `POST/GET /api/participant-auth/*`, `POST /api/participants/join`, `PATCH /api/participants/{id}/role`, `GET/POST/DELETE /api/workshops/{id}/facilitators`.

---

### E3 – Workshop Administration

**Implemented:**
- **Workshop CRUD:** Create, list, get, update, phase control; admin list/delete/status (`/api/admin/workshops`, `DELETE /api/admin/workshops/{id}` returns 204).
- **Templates & use cases:** Workshop templates, industry packages, use-case library, criteria templates (`/api/templates/*`). Use case CRUD (`/api/usecases/*`), bulk import preview/confirm (`/api/admin/usecases/import/*`).
- **Workshop deletion fix (US44):** DELETED status filtered from default lists.

**Pending:** US28 (home tile carousel), US34 (challenge cards – backend exists, full UX in backlog), US40 (use case detail popup with feedback).

**Code:** `server/app/api/workshops.py`, `server/app/api/admin.py`, `server/app/api/templates.py`, `server/app/api/usecases.py`; client: `AdminWorkshops`, `AdminUseCases`, `AllUseCases`, `FacilitatorAddUseCaseModal`, `AdminImportUseCasesModal`.

---

### E4 – Participant Journey

**Implemented:**
- **Join & session:** PIN join, member session (join, workshop, leave, refresh, check-name) (`/api/participants/join`, `/api/member/*`).
- **Intake:** Submit use cases; real-time new-case events.
- **Scoring:** Active card, vote submission, one vote per participant per use case (or upsert); matrix positions (`/api/votes/*`).
- **Results & matrix:** Aggregated results, quadrant logic, facilitator override; D3/Recharts bubble chart.
- **Participant dashboard (US31):** Landing view by phase (lobby, intake, scoring, analysis).

**Pending:** US36 (survey answer persistence), US40 (use case detail popup with feedback).

**Code:** `server/app/api/participants.py`, `server/app/api/members.py`, `server/app/api/usecases.py`, `server/app/api/votes.py`, `server/app/api/results.py`; client: `JoinWorkshop`, `WaitingRoom`, `IntakePhase`, `ScoringPhase`, `ParticipantDashboard`, `ParticipantMatrix`, `UseCaseCanvas`, `ScoringCard`, `VotingHeatmap`.

---

### E5 – AI & Intelligence

**Implemented:**
- **RAG & AI (US07):** Enhance, feasibility, duplicates, business-value, technical-analysis, estimate-roi, generate-business-case, analyze-file (`/api/ai/*`).
- **Knowledge base:** Public and admin KB APIs; RAG admin under `/api/knowledge-base` (ingest, search, migration).
- **AI Copilot (US16):** Copilot API (suggestions, prompts, summaries); engagement monitor, discussion prompts, insights panel.
- **Knowledge Base refresh (US26):** Admin migration and content updates.

**Pending:** US19 (AI demo sandbox).

**Code:** `server/app/api/ai.py`, `server/app/api/rag_admin.py`, `server/app/api/knowledge_base.py`, `server/app/api/copilot.py`; client: `UseCaseForm` (magic wand), `CopilotPanel`, `CopilotToggle`, `SuggestionCard`, `EngagementMonitor`, `DiscussionPrompts`, `SummaryGenerator`, `InsightsPanel`.

---

### E6 – Engagement

**Implemented:**
- **Gamification (US15):** Points, badges, leaderboards; API under `/api/gamification`.
- **Polls (US21):** Create/list polls, vote, status, reactions, Q&A (questions, upvote, answer); word cloud–style endpoints.
- **Breakout rooms (US18):** Create/list rooms, join, start, end, canvas items, votes, messages, broadcast, extend, results (`/api/breakout-rooms/*`, `/api/workshops/{id}/breakout-rooms/*`).

**Pending:** US37 (poll popup theme/error handling), US42 (enhanced Q&A with history).

**Code:** `server/app/api/gamification.py`, `server/app/api/polls.py`, `server/app/api/breakout.py`; client: `PollManager`, `PollResponder`, `ReactionBar`, `QAPanel`, `BreakoutManager`, `BreakoutRoom`, gamification components.

---

### E7 – Business Intelligence

**Implemented:**
- **ROI (US17):** Calculate-only, per-workshop/use-case save/get, estimate, business-case generate (`/api/roi/*`). Scenario modeling, sensitivity, benchmarks, business case generation in UI.
- **Roadmaps (US20):** Generate, get, list by workshop, update, delete, resources, critical-path (`/api/roadmaps/*`). Gantt, resource planner, milestone tracker.
- **Analytics (US25):** Workshop analytics, heatmaps, trends; advanced analytics dashboard (`/api/analytics/*`).
- **Export:** PDF/CSV for workshop results (`/api/export/workshop/{id}/pdf|csv`).

**Pending:** US41 (participant feedback system with admin), US43 (enhanced matrix activity dashboard).

**Code:** `server/app/api/roi.py`, `server/app/api/roadmap.py`, `server/app/api/analytics.py`, `server/app/api/analytics_dashboard.py`, `server/app/api/export.py`; client: ROI components, `RoadmapGenerator`, `GanttChart`, `ResourcePlanner`, `MilestoneTracker`, `AnalyticsDashboard`, `WorkshopInsights`, `ResultsChart`, `VotingHeatmap`.

---

### E8 – UI/UX

**Implemented:**
- **Landing (US08):** Hero, features, how it works, benefits, CTA; routing `/`.
- **Platform enhancements (US11):** Admin dashboard, branding, facilitator auth.
- **User enhancements (US12):** Participant dashboard, survey access.
- **Facilitator enhancements (US13):** Survey management, workshop detail, phase control.
- **Theme (US14):** Theme context and toggle (implementation present).
- **Branding (US27):** App icon, PWA manifest, title/footer.

**Pending:** US35 (participant theme consistency for use case creation), US39 (remove redundant leave button). US28 (tile carousel) is workshop/admin discovery UX.

**Code:** `client/src/pages/Landing.tsx`, `client/src/context/ThemeContext.tsx`, `client/src/components/Header.tsx`, `AdminLayout`, `AuthenticatedLayout`, `WorkshopDetail`, `WorkshopSettingsModal`.

---

### E9 – Globalization

**Implemented:**
- **i18n (US24 Phase 1):** i18next, browser detector, HTTP backend; English, Spanish, French, German; language switcher.

**Pending:** US38 (participant language selection and app translation expansion).

**Code:** `client/src/i18n.ts`, `client/src/components/common/LanguageSwitcher.tsx`, locales in `public/locales` or equivalent.

---

### E10 – Content & Mobile

**Implemented:**
- **QR & PWA (US09):** QR code for join URL with PIN prefill; PWA manifest; deep link `/join?pin=...`.

**Pending:** US23 (video recording and replay).

**Code:** `client` manifest, `qrcode.react`, `WorkshopDetail` (QR display); join page reads `pin` from query.

---

## 3. Cross-Cutting Features

- **Real-time:** Socket.IO (python-socketio) mounted at `/ws`; rooms by workshop; state change, active card, new case, vote updates, notifications.
- **Organizations:** CRUD, members, invitations, accept, workshops per org, analytics (`/api/organizations/*`).
- **Marketplace:** Template discovery, reviews, ratings (marketplace API).
- **Surveys:** Full lifecycle (draft/active/paused/closed), templates, questions, submit, progress, results, word cloud (`/api/surveys/*`).
- **Challenges:** Challenge cards CRUD, reorder, step generate-prompt/summary/generate-all (`/api/challenges/*`).
- **Feedback & help:** Feedback submit/list, admin update; onboarding progress; help articles; tooltips; tours (`/api/feedback/*`).
- **Notifications:** Stats and notification API for admin/facilitator.
- **Data sources:** API tag for data-sources (integrations).
- **Admin:** Stats, users, workshops, LLM usage (summary, by-feature, by-workshop, by-user, by-model, by-day, recent), use case import, knowledge-base migration.

---

## 4. Backlog Summary (Pending Implementation)

| ID | Title | Epic | Priority |
|----|--------|-----|----------|
| US19 | AI Demo Sandbox | E5 | Low |
| US23 | Video Recording & Replay | E10 | Low |
| US28 | Home Page Tile Carousel | E3 | Medium |
| US34 | Challenge Cards (full UX) | E3 | Medium |
| US35 | Participant Theme Consistency | E8 | Low |
| US36 | Survey Answer Persistence | E4 | Medium |
| US37 | Poll Popup Theme Fix | E6 | Low |
| US38 | Participant Language Selection | E9 | Medium |
| US39 | Remove Redundant Leave Button | E8 | Low |
| US40 | Use Case Detail Popup with Feedback | E3/E4 | Medium |
| US41 | Participant Feedback System + Admin | E7 | High |
| US42 | Enhanced Q&A Chat with History | E6 | High |
| US43 | Enhanced Matrix Activity Dashboard | E7 | High |

Functional backlog (FUN-001–FUN-030) remains as in [FUNCTIONAL_ISSUES_BACKLOG.md](./project_management/FUNCTIONAL_ISSUES_BACKLOG.md); implement in sequence where applicable.

---

## 5. Related Documentation

- [User Stories Index](./userstories/README.md)
- [Product Roadmap](./PRODUCT_ROADMAP.md)
- [Implementation Status](./IMPLEMENTATION_STATUS.md)
- [Functional Issues Backlog](./project_management/FUNCTIONAL_ISSUES_BACKLOG.md)
- [Technical Specification](./techspec/techspec.md)

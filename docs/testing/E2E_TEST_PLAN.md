# E2E Test Plan (Playwright)

**Status:** Approved design, pre-implementation
**Scope:** Core critical paths only. See "Out of scope" below.

## 1. Context / Problem

`client/e2e/` already has a Playwright setup (`playwright.config.ts`, 3 specs) and
`.github/workflows/tests.yml` already runs an `e2e-tests` job. Both are broken in
practice:

- `auth.spec.ts` and `workshop.spec.ts` navigate to `/login`, which does not exist
  in `client/src/App.tsx` — the real route is `/facilitator-login`. These specs
  have never exercised the real app.
- `workshop.spec.ts` logs in with `admin@hotspotmatrix.com` / `admin123`, leftover
  from the project's old name (hotspotmatrix → QbrainLabs). The real seeded admin
  is `admin@qbrainlabs.com` (see `server/init_db.py`).
- Zero `data-testid` attributes exist anywhere in `client/src` — the one spec that
  references `[data-testid="workshop-card"]` can never match anything.
- The product's core value flow — PIN join → intake → scoring → hotspot matrix —
  has no E2E coverage at all.
- CI's `e2e-tests` job runs DB migrations but never runs `init_db.py`, so the
  seeded admin account the specs depend on would not exist in the fresh Postgres
  test DB. It also waits on a fixed `sleep 5` instead of polling backend health.

## 2. Goal

Rebuild the E2E suite around the flows that matter most, with real seed data,
stable selectors, and a CI job that actually works end to end.

## 3. Architecture

```
client/e2e/
  fixtures.ts            custom `test` extending @playwright/test:
                          - adminPage: page pre-authenticated via storageState
                          - fixtureWorkshop: { id, pin } from seeded workshop
  global-setup.ts         Playwright globalSetup:
                          1. poll GET {API_URL}/health until backend is up
                          2. POST /api/auth/login as admin@qbrainlabs.com
                          3. POST /api/workshops to create one fixture workshop
                          4. PUT /api/admin/workshops/{id}/status -> OPEN
                          5. write client/e2e/.auth/admin-state.json (storageState)
                          6. write client/e2e/.auth/fixture.json ({id, pin})
  support/api.ts          thin REST helper used only by global-setup (login,
                          createWorkshop, setStatus) - never used inside test
                          bodies/assertions
  pages/
    AdminLoginPage.ts
    CreateWorkshopPage.ts
    JoinWorkshopPage.ts
    IntakePage.ts
    ScoringPage.ts
    MatrixPage.ts
    AdminSettingsPage.ts
  auth.spec.ts
  workshop-lifecycle.spec.ts
  participant-flow.spec.ts
  admin-settings.spec.ts
```

`client/e2e/.auth/` is gitignored (generated per run).

Backend must already be running (same assumption as today's CI job and
`playwright.config.ts`'s `webServer`, which only starts the Vite dev server).
`global-setup.ts` fails fast with a clear error if the backend never responds or
admin login fails, rather than letting individual tests time out mysteriously.

## 4. Scope — specs

| Spec | Flow | User stories | Notes |
|---|---|---|---|
| `auth.spec.ts` | Valid/invalid login at `/facilitator-login`, logout, redirect-when-unauthenticated for `/facilitator/dashboard` and `/admin` | US02 (auth), US30 (RBAC guard) | Replaces current broken `auth.spec.ts` |
| `workshop-lifecycle.spec.ts` | Admin creates workshop, PIN is generated, phase transitions INTAKE→SCORING→ANALYSIS | US01, US44 | Replaces current broken `workshop.spec.ts` |
| `participant-flow.spec.ts` | Anonymous join via PIN at `/join`, submit use case (Intake), cast vote (Scoring), item visible on Hotspot Matrix | US02, US03, US04, US05 | New — currently zero coverage |
| `admin-settings.spec.ts` | Existing 345-line spec, audited against current `AdminSettings.tsx` and fixed where selectors/flows drifted | US33 | Keep + repair, not rewrite |

### Out of scope (this pass)

AI copilot, knowledge base, RAG admin, surveys, marketplace, analytics dashboard,
organizations, facilitator registration/approval workflow, gamification, roadmap,
ROI calculator, i18n/localization, mobile-specific layouts beyond the existing
Playwright mobile projects. These stay on `docs/COMPREHENSIVE_TEST_CASES.md` as
the backlog for a future pass.

## 5. Selectors / `data-testid`

Default to `getByRole` / `getByLabel` / `getByText`. Add `data-testid` only where
text/role locators are ambiguous or the element's accessible name is dynamic:

- workshop list card (`data-testid="workshop-card"`)
- PIN input on `/join`
- phase-control buttons on facilitator dashboard
- use-case submission form fields
- score slider + submit control
- hotspot matrix item node

## 6. CI changes — `.github/workflows/tests.yml` (`e2e-tests` job)

- Add a `python init_db.py` step before starting uvicorn, so the seeded admin
  exists in the ephemeral Postgres test DB.
- Replace `sleep 5` with a loop polling `curl -f http://localhost:8000/health`
  (bounded retries, fail the job with a clear message on timeout).
- Pass `PLAYWRIGHT_API_URL=http://localhost:8000` into the `npm run test:e2e`
  step so `global-setup.ts` knows where the backend lives (defaults to
  `http://localhost:8000` locally).

## 7. Local run

```bash
# terminal 1
cd server && uvicorn app.main:app --reload

# terminal 2
cd client && npm run test:e2e
```

`global-setup.ts` handles seeding automatically; no manual fixture creation
needed.

## 8. Risks / known gaps

- Admin-only workshop creation: `/facilitator/create` is gated by `requireAdmin`
  in `client/src/App.tsx`, so "facilitator" flows in this pass are exercised via
  the admin account. A true non-admin facilitator role flow (register → pending
  approval → approved) is out of scope here (see US32 backlog).
- WebSocket-driven real-time updates (matrix drag/drop broadcast, live scoring
  progress) are not verified cross-session in this pass — `participant-flow.spec.ts`
  checks single-session state after action, not multi-client sync.

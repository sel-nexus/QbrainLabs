# E2E Playwright Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Playwright E2E suite in `client/e2e/` with working specs that cover auth, workshop lifecycle, the participant join→intake→scoring→matrix flow, and admin settings — backed by real seeded fixtures and a working CI job.

**Architecture:** Shared credentials module (env-var based, no hardcoded secrets) + a `global-setup.ts` that waits for the backend, logs in as the seeded admin via the real UI, saves `storageState`, and creates one fixture workshop via a direct API call. Specs either do their own UI login (auth, workshop-lifecycle, admin-settings — each independent, no shared fixture dependency) or reuse the saved `storageState` + fixture workshop (participant-flow, which needs two simultaneous browser contexts — admin and participant — to exercise the real-time socket-driven flow).

**Tech Stack:** `@playwright/test` (already a devDependency), native `fetch` (Node 18+ has global fetch, matches the `node-version: '18'` pinned in CI), no new dependencies.

## Global Constraints

- Spec: scope is core critical paths only — auth, workshop lifecycle, participant join/intake/scoring/matrix, admin settings. AI copilot, knowledge base, surveys, marketplace, analytics, organizations, facilitator-approval workflow, gamification, roadmap, ROI, i18n are explicitly out of scope (see `docs/testing/E2E_TEST_PLAN.md` §4).
- No hardcoded admin password in any new or edited file. `git status` shows `ADMIN_CREDENTIALS.md` being deleted from the repo — this plan follows that same hygiene and reads the admin password from an `E2E_ADMIN_PASSWORD` env var instead, with no fallback default (fails loudly if unset).
- Default `data-testid` usage to the single case where no reliable semantic locator exists (the workshop list card in `AdminMyWorkshops.tsx`). Everywhere else, use `getByRole`/`getByPlaceholder`/`getByText` — the app's `Input` component never sets `htmlFor`/`id`, so `getByLabel` does not work anywhere in this app; use `getByPlaceholder` instead (every form field already has a stable placeholder).
- Backend must be started manually before running any spec (`cd server && uvicorn app.main:app --reload`, default `http://localhost:8000`). Playwright's `webServer` config only starts the Vite frontend, matching today's `playwright.config.ts` and CI job — this plan does not change that.
- Deviation from `docs/testing/E2E_TEST_PLAN.md`: that spec describes a `fixtures.ts` custom-test-fixture layer and an admin "flip workshop to OPEN via `PUT /admin/workshops/{id}/status`" setup step. Neither is needed: (a) `POST /api/join` (the endpoint the real `/join` page calls) does not check workshop status at all, so the OPEN flip is dead weight; (b) only one spec (`participant-flow.spec.ts`) needs the saved admin session and fixture workshop, and it needs two independent `BrowserContext`s rather than the shared `page` fixture, so a custom `test.extend` fixture would add a layer of indirection for a single caller. Both are dropped; `global-setup.ts` and `support/api.ts` cover the same need directly.

---

### Task 1: CI workflow — seed admin user, poll for backend health, pass test credentials

**Files:**
- Modify: `.github/workflows/tests.yml` (the `e2e-tests` job, roughly lines 85–145)

**Interfaces:**
- Produces: a fixed CI-only env var `E2E_ADMIN_PASSWORD: Playwright-Test-1234!` available to every step in the `e2e-tests` job. This is not a real secret — the Postgres container is ephemeral and destroyed at the end of each CI run — so it is safe to commit in plain text in the workflow file.

- [ ] **Step 1: Add a job-level `env` block and a seed step to `.github/workflows/tests.yml`**

Open `.github/workflows/tests.yml` and locate the `e2e-tests` job (`name: E2E Tests (Playwright)`). Add an `env` block right under the job name, and a new "Seed database" step right after "Run database migrations" and before "Start backend server":

```yaml
  e2e-tests:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    env:
      E2E_ADMIN_PASSWORD: Playwright-Test-1234!
```

Then insert this step after "Run database migrations" (which already sets `DATABASE_URL`) and before "Start backend server":

```yaml
      - name: Seed database
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hotspot_matrix_test
          DEFAULT_ADMIN_PASSWORD: ${{ env.E2E_ADMIN_PASSWORD }}
        run: |
          cd server
          python init_db.py
```

- [ ] **Step 2: Replace the fixed `sleep 5` with a health-poll step**

Find the "Start backend server" step (it ends with `uvicorn app.main:app --host 0.0.0.0 --port 8000 & \n sleep 5`). Replace the trailing `sleep 5` line with nothing (just backgrounding the server), and add a new step right after it:

```yaml
      - name: Start backend server
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hotspot_matrix_test
        run: |
          cd server
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &

      - name: Wait for backend to be healthy
        run: |
          for i in $(seq 1 30); do
            if curl -sf http://localhost:8000/health > /dev/null; then
              echo "Backend is healthy"
              exit 0
            fi
            sleep 2
          done
          echo "Backend did not become healthy within 60s" >&2
          exit 1
```

- [ ] **Step 3: Pass the API URL and admin password into the Playwright run**

Find the "Run E2E tests" step and add the env block:

```yaml
      - name: Run E2E tests
        env:
          PLAYWRIGHT_API_URL: http://localhost:8000
          E2E_ADMIN_PASSWORD: ${{ env.E2E_ADMIN_PASSWORD }}
        run: |
          cd client
          npm run test:e2e
```

- [ ] **Step 4: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/tests.yml'))" && echo OK`
Expected: `OK` printed, no exception.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/tests.yml
git commit -m "ci: seed admin user and poll backend health in e2e job"
```

---

### Task 2: Shared credentials module + fix `auth.spec.ts`

**Files:**
- Create: `client/e2e/support/credentials.ts`
- Modify: `client/e2e/auth.spec.ts` (full rewrite — current file points at a dead `/login` route and stale `admin@qbrainlabs.com`/no-password-var creds)

**Interfaces:**
- Produces: `ADMIN_EMAIL: string`, `ADMIN_PASSWORD: string` (throws at import time if `E2E_ADMIN_PASSWORD` is unset) — consumed by Tasks 3, 4, 5.

- [ ] **Step 1: Write `client/e2e/support/credentials.ts`**

```typescript
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@qbrainlabs.com';

const rawPassword = process.env.E2E_ADMIN_PASSWORD;
if (!rawPassword) {
    throw new Error(
        'E2E_ADMIN_PASSWORD environment variable is required to run the Playwright suite. ' +
        'Set it to the password for the seeded admin account before running tests, ' +
        'e.g. `export E2E_ADMIN_PASSWORD=...`'
    );
}
export const ADMIN_PASSWORD: string = rawPassword;
```

- [ ] **Step 2: Rewrite `client/e2e/auth.spec.ts`**

The real login page is `/facilitator-login` (not `/login` — that route does not exist in `client/src/App.tsx`). The login form's inputs have no `htmlFor`/`id`, so use `getByPlaceholder`. The "Sign In" text is ambiguous (it's both the tab button and the submit button), so scope the submit click to `form button[type="submit"]`.

```typescript
import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './support/credentials';

test.describe('Authentication', () => {
    test('should display the login form', async ({ page }) => {
        await page.goto('/facilitator-login');
        await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
        await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    });

    test('should not submit the form when required fields are empty', async ({ page }) => {
        await page.goto('/facilitator-login');
        await page.locator('form button[type="submit"]').click();
        // Native `required` validation blocks submission - no navigation should occur.
        await expect(page).toHaveURL(/facilitator-login/);
    });

    test('should navigate to the facilitator registration page', async ({ page }) => {
        await page.goto('/facilitator-login');
        await page.getByRole('link', { name: /request access/i }).click();
        await expect(page).toHaveURL(/facilitator-register/);
    });

    test('should show an error and stay on the page for invalid credentials', async ({ page }) => {
        await page.goto('/facilitator-login');
        await page.getByPlaceholder('you@example.com').fill(ADMIN_EMAIL);
        await page.getByPlaceholder('Enter your password').fill('definitely-wrong-password');
        await page.locator('form button[type="submit"]').click();
        await expect(page).toHaveURL(/facilitator-login/);
    });

    test('should log in with valid admin credentials and land on /admin', async ({ page }) => {
        await page.goto('/facilitator-login');
        await page.getByPlaceholder('you@example.com').fill(ADMIN_EMAIL);
        await page.getByPlaceholder('Enter your password').fill(ADMIN_PASSWORD);
        await page.locator('form button[type="submit"]').click();
        await expect(page).toHaveURL(/\/admin/);
    });
});

test.describe('Route guards', () => {
    test('redirects unauthenticated users away from /admin', async ({ page }) => {
        await page.goto('/admin');
        await expect(page).toHaveURL(/facilitator-login/);
    });

    test('redirects unauthenticated users away from /facilitator/dashboard', async ({ page }) => {
        await page.goto('/facilitator/dashboard');
        await expect(page).toHaveURL(/facilitator-login/);
    });
});
```

- [ ] **Step 3: Run the spec against a live app**

Ensure the backend is running (`cd server && uvicorn app.main:app --reload`) and `E2E_ADMIN_PASSWORD` is exported to the real admin password for your local DB.

Run: `cd client && E2E_ADMIN_PASSWORD=<your-local-admin-password> npx playwright test e2e/auth.spec.ts`
Expected: all 7 tests PASS (Playwright's `webServer` config starts the Vite dev server automatically).

- [ ] **Step 4: Commit**

```bash
git add client/e2e/support/credentials.ts client/e2e/auth.spec.ts
git commit -m "test: fix auth e2e spec (dead /login route, hardcoded creds) and add route-guard coverage"
```

---

### Task 3: Workshop lifecycle spec + `workshop-card` test id

**Files:**
- Modify: `client/src/pages/AdminMyWorkshops.tsx` (add `data-testid="workshop-card"` to the workshop card `<div>`)
- Create: `client/e2e/workshop-lifecycle.spec.ts`
- Delete: `client/e2e/workshop.spec.ts` (replaced — it logs in with `admin@hotspotmatrix.com`/`admin123`, neither of which exist)

**Interfaces:**
- Consumes: `ADMIN_EMAIL`, `ADMIN_PASSWORD` from `client/e2e/support/credentials.ts` (Task 2).

- [ ] **Step 1: Add `data-testid="workshop-card"` in `AdminMyWorkshops.tsx`**

In `client/src/pages/AdminMyWorkshops.tsx`, find the workshop card div (inside the `workshops.map((w: any) => (...))` block):

```tsx
                        <div
                            key={w.id}
                            className={`rounded-2xl p-6 transition-all cursor-pointer border ${isLight ? 'bg-white border-gray-200 shadow-sm hover:border-brand-violet/50' : 'bg-surface-800/50 border-white/10 hover:border-brand-violet/50'}`}
                            onClick={() => navigate(`/workshop/${w.id}`)}
                        >
```

Change it to:

```tsx
                        <div
                            key={w.id}
                            data-testid="workshop-card"
                            className={`rounded-2xl p-6 transition-all cursor-pointer border ${isLight ? 'bg-white border-gray-200 shadow-sm hover:border-brand-violet/50' : 'bg-surface-800/50 border-white/10 hover:border-brand-violet/50'}`}
                            onClick={() => navigate(`/workshop/${w.id}`)}
                        >
```

- [ ] **Step 2: Delete the old broken spec**

```bash
git rm client/e2e/workshop.spec.ts
```

- [ ] **Step 3: Write `client/e2e/workshop-lifecycle.spec.ts`**

Workshop creation (`/facilitator/create`) only requires a title — the default criteria (`Feasibility 50% + Business Value 50%`) already sum to 100%, which is required both client-side and server-side (`server/app/schemas/workshop.py::WorkshopConfig.validate_weights`). After creation the app redirects to `/admin/my-workshops`, not to the workshop detail page. `WorkshopDetail.tsx` renders the raw phase string (`INTAKE`/`SCORING`/`ANALYSIS`) in its own `<span>`, and shows phase-specific buttons with unique accessible names: "Start Intake" (DRAFT only — not reachable here since a new workshop starts at phase INTAKE already), "Next: Start Scoring →", and "Show Results".

```typescript
import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './support/credentials';

test.describe('Workshop Lifecycle', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/facilitator-login');
        await page.getByPlaceholder('you@example.com').fill(ADMIN_EMAIL);
        await page.getByPlaceholder('Enter your password').fill(ADMIN_PASSWORD);
        await page.locator('form button[type="submit"]').click();
        await page.waitForURL(/\/admin/);
    });

    test('creates a workshop and advances it through every phase', async ({ page }) => {
        const title = `E2E Workshop ${Date.now()}`;

        await page.goto('/facilitator/create');
        await page.getByPlaceholder('e.g. Q1 AI Roadmap').fill(title);
        await page.getByRole('button', { name: 'Create Workshop' }).click();

        await page.waitForURL(/\/admin\/my-workshops/);
        const card = page.getByTestId('workshop-card').filter({ hasText: title });
        await expect(card).toBeVisible();

        await card.click();
        await page.waitForURL(/\/workshop\/.+/);
        await expect(page.getByText('INTAKE', { exact: true })).toBeVisible();

        await page.getByRole('button', { name: /start scoring/i }).click();
        await expect(page.getByText('SCORING', { exact: true })).toBeVisible();

        await page.getByRole('button', { name: /show results/i }).click();
        await expect(page.getByText('ANALYSIS', { exact: true })).toBeVisible();
    });
});
```

- [ ] **Step 4: Run the spec against a live app**

Run: `cd client && E2E_ADMIN_PASSWORD=<your-local-admin-password> npx playwright test e2e/workshop-lifecycle.spec.ts`
Expected: 1 test PASSES.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/AdminMyWorkshops.tsx client/e2e/workshop-lifecycle.spec.ts
git add client/e2e/workshop.spec.ts  # stages the deletion
git commit -m "test: replace broken workshop e2e spec with a working lifecycle test"
```

---

### Task 4: Global setup (seed fixture workshop) + participant end-to-end flow spec

**Files:**
- Create: `client/e2e/support/api.ts`
- Create: `client/e2e/global-setup.ts`
- Modify: `client/playwright.config.ts` (add `globalSetup`)
- Modify: `client/.gitignore` (ignore generated `e2e/.auth/`)
- Create: `client/e2e/participant-flow.spec.ts`

**Interfaces:**
- Consumes: `ADMIN_EMAIL`, `ADMIN_PASSWORD` from `client/e2e/support/credentials.ts` (Task 2).
- Produces: `createFixtureWorkshop(apiUrl: string, token: string): Promise<{ id: string; pin: string }>` from `support/api.ts` — consumed only by `global-setup.ts`. `global-setup.ts` writes `client/e2e/.auth/admin-state.json` (Playwright `storageState`) and `client/e2e/.auth/fixture.json` (`{ workshopId: string, pin: string }`) — both consumed by `participant-flow.spec.ts`.

- [ ] **Step 1: Write `client/e2e/support/api.ts`**

```typescript
export interface FixtureWorkshop {
    id: string;
    pin: string;
}

export async function createFixtureWorkshop(apiUrl: string, token: string): Promise<FixtureWorkshop> {
    const res = await fetch(`${apiUrl}/api/workshops/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            title: `E2E Fixture Workshop ${Date.now()}`,
            config: {
                criteria: [
                    { name: 'Feasibility', weight: 50 },
                    { name: 'Business Value', weight: 50 },
                ],
                template_id: null,
            },
        }),
    });

    if (!res.ok) {
        throw new Error(`Failed to create fixture workshop: ${res.status} ${await res.text()}`);
    }

    return res.json();
}
```

- [ ] **Step 2: Write `client/e2e/global-setup.ts`**

```typescript
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './support/credentials';
import { createFixtureWorkshop } from './support/api';

const FRONTEND_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000';
const AUTH_DIR = path.join(__dirname, '.auth');

async function waitForBackend(maxAttempts = 30, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await fetch(`${API_URL}/health`);
            if (res.ok) return;
        } catch {
            // backend not reachable yet - keep polling
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error(`Backend at ${API_URL} did not become healthy after ${maxAttempts * delayMs}ms`);
}

export default async function globalSetup(): Promise<void> {
    await waitForBackend();

    fs.mkdirSync(AUTH_DIR, { recursive: true });

    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(`${FRONTEND_URL}/facilitator-login`);
    await page.getByPlaceholder('you@example.com').fill(ADMIN_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(ADMIN_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/admin/);

    const token = await page.evaluate(() => localStorage.getItem('hm_auth_token'));
    if (!token) {
        throw new Error('Admin login did not store an auth token under "hm_auth_token" - check credentials or the auth flow.');
    }

    await page.context().storageState({ path: path.join(AUTH_DIR, 'admin-state.json') });
    await browser.close();

    const workshop = await createFixtureWorkshop(API_URL, token);
    fs.writeFileSync(
        path.join(AUTH_DIR, 'fixture.json'),
        JSON.stringify({ workshopId: workshop.id, pin: workshop.pin }, null, 2)
    );
}
```

- [ ] **Step 3: Wire up `globalSetup` in `client/playwright.config.ts`**

In `client/playwright.config.ts`, add `globalSetup` to the exported config, right after `fullyParallel`:

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  globalSetup: './e2e/global-setup.ts',
  forbidOnly: !!process.env.CI,
```

- [ ] **Step 4: Ignore the generated auth directory**

In `client/.gitignore`, under the existing `# Testing` section (which already has `test-results` and `playwright-report`), add:

```
e2e/.auth
```

- [ ] **Step 5: Write `client/e2e/participant-flow.spec.ts`**

This exercises the real-time, two-actor flow: admin creates/opens a workshop, a participant joins anonymously by PIN, submits a use case, the admin advances the phase and presents that use case for voting, the participant votes, and the admin confirms it shows up in the Analysis/Matrix view. Backend confirmed behavior this relies on:
- `POST /api/join` (called by `/join`) does not check workshop status, so the DRAFT fixture workshop is joinable immediately.
- `WorkshopDetail.tsx` joins its socket room on mount and live-updates on `new_submission` (no reload needed after the participant submits).
- `IntakePhase`/`ParticipantDashboard` navigate to `/scoring` automatically on the `workshop_state_change` socket event when `phase === 'SCORING'`.
- The use case creation response (`POST /api/usecases/`) returns `{ id, ... }`, and the D3 matrix chart (`ResultsChart.tsx`) renders each point's SVG label with a `data-id="<use case id>"` attribute — a reliable, non-text-dependent way to confirm the item appears on the matrix.

```typescript
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const fixturePath = path.join(__dirname, '.auth', 'fixture.json');
const fixture: { workshopId: string; pin: string } = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const adminStatePath = path.join(__dirname, '.auth', 'admin-state.json');

test('participant joins, submits a use case, votes, and it appears on the matrix', async ({ browser }) => {
    const adminContext = await browser.newContext({ storageState: adminStatePath });
    const participantContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const participantPage = await participantContext.newPage();

    const useCaseTitle = `E2E Use Case ${Date.now()}`;

    await adminPage.goto(`/workshop/${fixture.workshopId}`);
    await expect(adminPage.getByText('INTAKE', { exact: true })).toBeVisible();

    await participantPage.goto('/join');
    await participantPage.getByPlaceholder('Enter PIN').fill(fixture.pin);
    await participantPage.getByPlaceholder('Your Name').fill('E2E Participant');
    await participantPage.getByRole('button', { name: /join/i }).click();
    await participantPage.waitForURL(/\/participant-dashboard/);

    await participantPage.getByRole('button', { name: 'Submit Use Case' }).click();
    await participantPage.getByPlaceholder('e.g. Automated Customer Support').fill(useCaseTitle);
    await participantPage.getByPlaceholder('e.g. Support Agents').fill('Support Agents');

    const [useCaseResponse] = await Promise.all([
        participantPage.waitForResponse(
            (res) => res.url().includes('/api/usecases/') && res.request().method() === 'POST'
        ),
        participantPage.getByRole('button', { name: 'Submit to Matrix' }).click(),
    ]);
    const useCase = await useCaseResponse.json();

    await expect(adminPage.getByText(useCaseTitle)).toBeVisible({ timeout: 15000 });

    await adminPage.getByRole('button', { name: /start scoring/i }).click();
    await expect(adminPage.getByText('SCORING', { exact: true })).toBeVisible();
    await adminPage.getByRole('button', { name: /present for voting/i }).click();

    await participantPage.waitForURL(/\/scoring/, { timeout: 15000 });
    const sliders = participantPage.locator('input[type="range"]');
    await expect(sliders).toHaveCount(2);
    await sliders.nth(0).fill('80');
    await sliders.nth(1).fill('60');
    await participantPage.getByRole('button', { name: 'Submit Vote' }).click();
    await expect(participantPage.getByText('Vote Recorded')).toBeVisible();

    await adminPage.getByRole('button', { name: /show results/i }).click();
    await expect(adminPage.getByText('ANALYSIS', { exact: true })).toBeVisible();
    await expect(adminPage.locator(`[data-id="${useCase.id}"]`)).toHaveCount(1, { timeout: 15000 });

    await adminContext.close();
    await participantContext.close();
});
```

- [ ] **Step 6: Run the spec against a live app**

Run: `cd client && E2E_ADMIN_PASSWORD=<your-local-admin-password> npx playwright test e2e/participant-flow.spec.ts --project=chromium`
Expected: 1 test PASSES. Global setup runs first (visible in the Playwright output as a setup step) and creates `client/e2e/.auth/admin-state.json` + `fixture.json`.

If the real-time socket updates don't land in time, increase the specific `timeout` on the failing assertion rather than adding sleeps.

- [ ] **Step 7: Commit**

```bash
git add client/e2e/support/api.ts client/e2e/global-setup.ts client/playwright.config.ts client/.gitignore client/e2e/participant-flow.spec.ts
git commit -m "test: add seeded global setup and end-to-end participant flow spec"
```

---

### Task 5: Audit and fix `admin-settings.spec.ts`

**Files:**
- Modify: `client/e2e/admin-settings.spec.ts`

**Interfaces:**
- Consumes: `ADMIN_EMAIL`, `ADMIN_PASSWORD` from `client/e2e/support/credentials.ts` (Task 2).

Source inspection against the current `AdminSettings.tsx`/`i18n.ts` confirms the Settings and Facilitator Management sections of this file (lines 1–220) are already correct (categories `rate_limiting`/`security`/`limits`/`features` render as "Rate Limiting"/"Security"/"Limits"/"Features" per `client/src/i18n.ts:342-346`). Three concrete bugs remain, found by reading the file against the real routes/components:

1. The `'Workshop Creation Flow'` describe block (goes to `/create`, a route that doesn't exist — the real one is `/facilitator/create`; fills `input[name="title"]`/`textarea[name="description"]`, neither of which exist on `CreateWorkshop.tsx`; waits for `/dashboard`, which is never navigated to; and expects an `h1` with the workshop title, but creation redirects to `/admin/my-workshops`, a list page). This entire flow now has dedicated, correct coverage in `workshop-lifecycle.spec.ts` (Task 3) — delete the block rather than fix a duplicate.
2. `'should prevent non-admin from accessing admin panel'` logs in as the real admin account and then asserts the admin is **not** on `/admin` — backwards, since an admin should reach `/admin`. There's no non-admin fixture account in scope for this pass (facilitator-approval workflow is out of scope per the test plan). Delete this test rather than build a non-admin fixture for one test.
3. `'should display correctly on tablet'` navigates straight to `/admin/settings` with no login, so it hits the `/facilitator-login` redirect and then asserts an `h1` is visible — but the login page has no `<h1>` anywhere, so this fails. Fix it to log in first, matching the mobile test right above it.

All four hardcoded `admin@qbrainlabs.com` / `Tcs@$2026` credential pairs in the file are replaced with the shared `support/credentials.ts` module (Task 2), consistent with the project's ongoing credential cleanup (`ADMIN_CREDENTIALS.md` is being deleted per current `git status`).

- [ ] **Step 1: Add the credentials import**

At the top of `client/e2e/admin-settings.spec.ts`, change:

```typescript
import { test, expect } from '@playwright/test';
```

to:

```typescript
import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './support/credentials';
```

- [ ] **Step 2: Replace every hardcoded login block**

There are 6 occurrences of this pattern in the file (in the `beforeEach` blocks for "Admin Settings Page", "Admin Panel Navigation" (implicit, covers facilitators/workshops nav), "Facilitator Management", "Workshop Creation Flow" (being deleted), and inline inside `'should prevent non-admin...'` (being deleted) and `'should allow admin to access all admin features'` and the mobile responsive test):

```typescript
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', 'admin@qbrainlabs.com');
        await page.fill('input[type="password"]', 'Tcs@$2026');
        await page.click('button[type="submit"]');
```

Replace each occurrence with:

```typescript
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
```

(Leave the rest of each block — `waitForURL`, subsequent `page.goto`, etc. — unchanged.)

- [ ] **Step 3: Delete the `'Workshop Creation Flow'` describe block**

Remove this entire block (the broken, duplicate workshop-creation test):

```typescript
test.describe('Workshop Creation Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin/facilitator
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('/dashboard');
    });

    test('should create a new workshop', async ({ page }) => {
        // Navigate to create workshop
        await page.goto('/create');

        // Fill in workshop details
        await page.fill('input[name="title"]', 'E2E Test Workshop');
        await page.fill('textarea[name="description"]', 'This is a test workshop created by E2E tests');

        // Submit form
        await page.click('button[type="submit"]');

        // Wait for redirect to workshop detail
        await page.waitForURL(/\/workshop\/.+/);

        // Verify workshop was created
        await expect(page.locator('h1')).toContainText('E2E Test Workshop');
    });
});
```

- [ ] **Step 4: Delete the backwards non-admin test**

Inside the `'Authentication and Authorization'` describe block, remove:

```typescript
    test('should prevent non-admin from accessing admin panel', async ({ page }) => {
        // Login as regular facilitator
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');

        // Try to access admin panel
        await page.goto('/admin');

        // Should be redirected or show error
        await expect(page).not.toHaveURL('/admin');
    });
```

(Keep `'should redirect to login when not authenticated'` and `'should allow admin to access all admin features'`, both of which are correct, right above and below it.)

- [ ] **Step 5: Fix the tablet responsive test to log in first**

In the `'Responsive Design'` describe block, change:

```typescript
    test('should display correctly on tablet', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });

        await page.goto('/admin/settings');

        // Check that settings page renders correctly
        await expect(page.locator('h1')).toBeVisible();
    });
```

to:

```typescript
    test('should display correctly on tablet', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });

        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin');

        await page.goto('/admin/settings');

        // Check that settings page renders correctly
        await expect(page.locator('h1')).toBeVisible();
    });
```

- [ ] **Step 6: Run the full spec against a live app**

Run: `cd client && E2E_ADMIN_PASSWORD=<your-local-admin-password> npx playwright test e2e/admin-settings.spec.ts --project=chromium`
Expected: all remaining tests PASS. If `'should approve pending facilitator'` or any test depending on existing data (e.g. a pending facilitator) is flaky because your local DB has no matching record, that's expected — the test already guards with `if (await actionButton.isVisible())` and passes trivially when there's nothing to approve.

- [ ] **Step 7: Commit**

```bash
git add client/e2e/admin-settings.spec.ts
git commit -m "test: fix admin-settings e2e spec - remove broken/duplicate tests, use shared credentials"
```

---

### Task 6: Update `docs/testing/TESTING.md` and run the full suite

**Files:**
- Modify: `docs/testing/TESTING.md` (E2E section)

- [ ] **Step 1: Add an E2E section pointer and required env vars to `docs/testing/TESTING.md`**

Find the `## Frontend Testing (React/TypeScript)` section's `### Running Frontend Tests` subsection (contains `npm run test:e2e` etc.) and add immediately after it:

```markdown
### E2E Test Plan

See `docs/testing/E2E_TEST_PLAN.md` for the full E2E architecture, scope, and
out-of-scope list. Required environment variable before running
`npm run test:e2e` locally:

```bash
export E2E_ADMIN_PASSWORD=<password for your local admin@qbrainlabs.com account>
```

Optional overrides: `E2E_ADMIN_EMAIL` (defaults to `admin@qbrainlabs.com`),
`PLAYWRIGHT_API_URL` (defaults to `http://localhost:8000`).
```

- [ ] **Step 2: Run the entire suite end to end**

With backend running and `E2E_ADMIN_PASSWORD` exported:

Run: `cd client && E2E_ADMIN_PASSWORD=<your-local-admin-password> npx playwright test --project=chromium`
Expected: `auth.spec.ts`, `workshop-lifecycle.spec.ts`, `participant-flow.spec.ts`, and `admin-settings.spec.ts` all PASS.

- [ ] **Step 3: Commit**

```bash
git add docs/testing/TESTING.md
git commit -m "docs: point TESTING.md at the E2E test plan and required env vars"
```

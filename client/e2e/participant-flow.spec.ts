import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFixtureWorkshop } from './support/api';

// client/package.json sets "type": "module", so this file runs as an ESM module
// under Playwright's loader - `__dirname` is not defined there, unlike CJS.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000';
const adminStatePath = path.join(__dirname, '.auth', 'admin-state.json');

test('participant joins, submits a use case, votes, and it appears on the matrix', async ({ browser }) => {
    const adminContext = await browser.newContext({ storageState: adminStatePath });
    const participantContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const participantPage = await participantContext.newPage();

    // storageState only restores cookies/localStorage once a page has navigated to the
    // matching origin, so load the app first before reading the token out of localStorage.
    await adminPage.goto('/');
    const token = await adminPage.evaluate(() => localStorage.getItem('hm_auth_token'));
    if (!token) {
        throw new Error('Admin storageState did not restore an auth token under "hm_auth_token".');
    }

    // Create a fresh fixture workshop for this test run so concurrent projects/retries
    // never share (and fight over) the same workshop's lifecycle state.
    const fixture = await createFixtureWorkshop(API_URL, token);

    const useCaseTitle = `E2E Use Case ${Date.now()}`;

    await adminPage.goto(`/workshop/${fixture.id}`);
    await expect(adminPage.getByText('INTAKE', { exact: true })).toBeVisible();

    await participantPage.goto('/join');
    await participantPage.getByPlaceholder('Enter PIN').fill(fixture.pin);
    await participantPage.getByPlaceholder('Your Name').fill('E2E Participant');
    await participantPage.getByRole('button', { name: /join/i }).click();
    await participantPage.waitForURL(/\/participant-dashboard/);

    await participantPage.getByRole('button', { name: 'Submit Use Case' }).click();
    await participantPage.getByPlaceholder('e.g. Automated Customer Support').fill(useCaseTitle);
    await participantPage.getByPlaceholder('e.g. Support Agents').fill('Support Agents');
    // UseCaseForm marks Problem Statement and Expected Benefit (KPI) as `required`;
    // the native HTML5 constraint validation blocks the submit handler from firing
    // (and therefore the POST below) unless these are also filled in.
    await participantPage.getByPlaceholder('Describe the pain point...').fill('Agents spend too long on repetitive tickets.');
    await participantPage.getByPlaceholder('e.g. Reduce handle time by 20%').fill('Reduce handle time by 20%');

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

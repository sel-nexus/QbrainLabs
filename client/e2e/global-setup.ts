import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './support/credentials';
import { createFixtureWorkshop } from './support/api';

// client/package.json sets "type": "module", so this file runs as an ESM module
// under Playwright's loader - `__dirname` is not defined there, unlike CJS.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

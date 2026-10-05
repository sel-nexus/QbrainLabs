import type { Page } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './credentials';

export async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/facilitator-login');
    await page.getByPlaceholder('you@example.com').fill(ADMIN_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(ADMIN_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/admin/);
}

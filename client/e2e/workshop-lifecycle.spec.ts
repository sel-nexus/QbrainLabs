import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './support/auth';

test.describe('Workshop Lifecycle', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
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

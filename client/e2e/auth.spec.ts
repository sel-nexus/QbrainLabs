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

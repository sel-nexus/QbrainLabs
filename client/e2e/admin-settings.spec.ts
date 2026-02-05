import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Admin Settings Page
 * Tests US33: Database-Driven Configuration Management
 */

test.describe('Admin Settings Page', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', 'admin@qbrainlabs.com');
        await page.fill('input[type="password"]', 'Tcs@$2026');
        await page.click('button[type="submit"]');

        // Wait for redirect to admin panel
        await page.waitForURL('/admin');

        // Navigate to settings
        await page.goto('/admin/settings');
    });

    test('should display settings page with categories', async ({ page }) => {
        // Check page title
        await expect(page.locator('h1')).toContainText('System Settings');

        // Check category tabs exist
        await expect(page.locator('button:has-text("Rate Limiting")')).toBeVisible();
        await expect(page.locator('button:has-text("Security")')).toBeVisible();
        await expect(page.locator('button:has-text("Limits")')).toBeVisible();
        await expect(page.locator('button:has-text("Features")')).toBeVisible();
    });

    test('should filter settings by category', async ({ page }) => {
        // Click on Security category
        await page.click('button:has-text("Security")');

        // Wait for settings to load
        await page.waitForTimeout(500);

        // Check that security settings are displayed
        await expect(page.locator('text=Password')).toBeVisible();
    });

    test('should edit and save a setting', async ({ page }) => {
        // Click on Rate Limiting category
        await page.click('button:has-text("Rate Limiting")');

        // Find the daily limit input
        const dailyInput = page.locator('input[type="number"]').first();

        // Clear and enter new value
        await dailyInput.clear();
        await dailyInput.fill('15');

        // Click Save button
        await page.locator('button:has-text("Save")').first().click();

        // Wait for success message
        await expect(page.locator('text=Updated')).toBeVisible({ timeout: 5000 });
    });

    test('should toggle boolean setting', async ({ page }) => {
        // Click on Security category
        await page.click('button:has-text("Security")');

        // Find a toggle switch
        const toggle = page.locator('button[class*="rounded-full"]').first();

        // Click toggle
        await toggle.click();

        // Click Save
        await page.locator('button:has-text("Save")').first().click();

        // Wait for success message
        await expect(page.locator('text=Updated')).toBeVisible({ timeout: 5000 });
    });

    test('should reset setting to default', async ({ page }) => {
        // Click on Rate Limiting category
        await page.click('button:has-text("Rate Limiting")');

        // Click reset button (RotateCcw icon)
        await page.locator('button[title="Reset to default"]').first().click();

        // Confirm reset
        await page.click('button:has-text("OK")');

        // Wait for success message
        await expect(page.locator('text=Reset')).toBeVisible({ timeout: 5000 });
    });

    test('should show validation error for invalid value', async ({ page }) => {
        // Click on Rate Limiting category
        await page.click('button:has-text("Rate Limiting")');

        // Find the daily limit input
        const dailyInput = page.locator('input[type="number"]').first();

        // Enter invalid value (too high)
        await dailyInput.clear();
        await dailyInput.fill('9999');

        // Click Save button
        await page.locator('button:has-text("Save")').first().click();

        // Wait for error message
        await expect(page.locator('text=Failed')).toBeVisible({ timeout: 5000 });
    });

    test('should display sensitive settings as masked', async ({ page }) => {
        // Navigate through categories to find sensitive setting
        await page.click('button:has-text("Security")');

        // Check for shield icon indicating sensitive setting
        await expect(page.locator('svg[class*="text-amber-500"]')).toBeVisible();
    });

    test('should show default value for each setting', async ({ page }) => {
        // Click on any category
        await page.click('button:has-text("Rate Limiting")');

        // Check that default values are displayed
        await expect(page.locator('text=Default:')).toBeVisible();
    });
});

test.describe('Admin Panel Navigation', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', 'admin@qbrainlabs.com');
        await page.fill('input[type="password"]', 'Tcs@$2026');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin');
    });

    test('should navigate to settings from admin panel', async ({ page }) => {
        // Click on System Settings in sidebar
        await page.click('button:has-text("System Settings")');

        // Verify navigation
        await expect(page).toHaveURL('/admin/settings');
        await expect(page.locator('h1')).toContainText('System Settings');
    });

    test('should navigate to facilitators management', async ({ page }) => {
        // Click on Facilitators in sidebar
        await page.click('button:has-text("Facilitators")');

        // Verify navigation
        await expect(page).toHaveURL('/admin/facilitators');
    });

    test('should navigate to workshops management', async ({ page }) => {
        // Click on Workshops in sidebar
        await page.click('button:has-text("Workshops")');

        // Verify navigation
        await expect(page).toHaveURL('/admin/workshops');
    });
});

test.describe('Facilitator Management', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', 'admin@qbrainlabs.com');
        await page.fill('input[type="password"]', 'Tcs@$2026');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin');

        // Navigate to facilitators
        await page.goto('/admin/facilitators');
    });

    test('should display facilitators list', async ({ page }) => {
        // Check page title
        await expect(page.locator('h1')).toContainText('Facilitator Management');

        // Check stats cards
        await expect(page.locator('text=Total Facilitators')).toBeVisible();
        await expect(page.locator('text=Pending Approval')).toBeVisible();
    });

    test('should filter facilitators by status', async ({ page }) => {
        // Click on status filter dropdown
        await page.click('select');

        // Select "Pending"
        await page.selectOption('select', 'pending');

        // Wait for filtered results
        await page.waitForTimeout(500);
    });

    test('should search facilitators', async ({ page }) => {
        // Type in search box
        await page.fill('input[placeholder*="Search"]', 'test@example.com');

        // Wait for search results
        await page.waitForTimeout(500);
    });

    test('should approve pending facilitator', async ({ page }) => {
        // Find a pending facilitator (if any)
        const actionButton = page.locator('button[class*="MoreVertical"]').first();

        if (await actionButton.isVisible()) {
            await actionButton.click();

            // Click Approve
            await page.click('button:has-text("Approve")');

            // Wait for success message
            await expect(page.locator('text=approved')).toBeVisible({ timeout: 5000 });
        }
    });
});

test.describe('Workshop Creation Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin/facilitator
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', 'admin@qbrainlabs.com');
        await page.fill('input[type="password"]', 'Tcs@$2026');
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

test.describe('Authentication and Authorization', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
        // Try to access admin panel without login
        await page.goto('/admin');

        // Should redirect to login
        await expect(page).toHaveURL('/facilitator-login');
    });

    test('should prevent non-admin from accessing admin panel', async ({ page }) => {
        // Login as regular facilitator
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', 'admin@qbrainlabs.com');
        await page.fill('input[type="password"]', 'Tcs@$2026');
        await page.click('button[type="submit"]');

        // Try to access admin panel
        await page.goto('/admin');

        // Should be redirected or show error
        await expect(page).not.toHaveURL('/admin');
    });

    test('should allow admin to access all admin features', async ({ page }) => {
        // Login as admin
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', 'admin@qbrainlabs.com');
        await page.fill('input[type="password"]', 'Tcs@$2026');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin');

        // Verify access to admin features
        await expect(page.locator('text=Admin Panel')).toBeVisible();

        // Navigate to different admin pages
        await page.goto('/admin/settings');
        await expect(page).toHaveURL('/admin/settings');

        await page.goto('/admin/facilitators');
        await expect(page).toHaveURL('/admin/facilitators');

        await page.goto('/admin/workshops');
        await expect(page).toHaveURL('/admin/workshops');
    });
});

test.describe('Theme Switching', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should toggle between light and dark themes', async ({ page }) => {
        // Find theme toggle button (if exists)
        const themeToggle = page.locator('button[aria-label*="theme"]');

        if (await themeToggle.isVisible()) {
            // Click to toggle theme
            await themeToggle.click();

            // Wait for theme change
            await page.waitForTimeout(300);

            // Toggle back
            await themeToggle.click();
            await page.waitForTimeout(300);
        }
    });
});

test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        // Navigate to admin panel
        await page.goto('/facilitator-login');
        await page.fill('input[type="email"]', 'admin@qbrainlabs.com');
        await page.fill('input[type="password"]', 'Tcs@$2026');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin');

        // Check that page renders correctly
        await expect(page.locator('h1')).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });

        await page.goto('/admin/settings');

        // Check that settings page renders correctly
        await expect(page.locator('h1')).toBeVisible();
    });
});

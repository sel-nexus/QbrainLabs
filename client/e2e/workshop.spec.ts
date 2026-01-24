import { test, expect } from '@playwright/test';

test.describe('Workshop Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@hotspotmatrix.com');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/.*dashboard|workshops/);
  });

  test('should display workshop list', async ({ page }) => {
    await page.goto('/workshops');
    await expect(page.getByRole('heading', { name: /workshop/i })).toBeVisible();
  });

  test('should create new workshop', async ({ page }) => {
    await page.goto('/workshops');
    await page.getByRole('button', { name: /create|new/i }).click();
    await page.getByLabel(/name|title/i).fill('Test Workshop');
    await page.getByLabel(/description/i).fill('Test workshop description');
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(/test workshop/i)).toBeVisible();
  });

  test('should navigate to workshop details', async ({ page }) => {
    await page.goto('/workshops');
    const workshopCard = page.locator('[data-testid="workshop-card"]').first();
    if (await workshopCard.isVisible()) {
      await workshopCard.click();
      await expect(page.getByRole('heading')).toBeVisible();
    }
  });
});

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);
  });

  test('leaderboard shows login modal when not authenticated', async ({ page }) => {
    await page.locator('#leaderboardBtn').click();

    await expect(page.locator('#loginModal')).toHaveClass(/show/, { timeout: 8000 });
    await expect(page.locator('#loginModal')).toBeVisible();
  });

  test('can switch between login and signup', async ({ page }) => {
    await page.locator('#leaderboardBtn').click();
    await expect(page.locator('#loginModal')).toHaveClass(/show/);

    const loginSwitchBtn = page.locator('#loginSwitchBtn');
    await loginSwitchBtn.click();

    const loginTitle = page.locator('#loginTitle');
    await expect(loginTitle).toContainText('注册');
  });

  test('login form validation', async ({ page }) => {
    await page.locator('#leaderboardBtn').click();
    await expect(page.locator('#loginModal')).toHaveClass(/show/);

    await page.locator('#loginSubmitBtn').click();

    const loginError = page.locator('#loginError');
    await expect(loginError).toBeVisible();
  });

  test('can close login modal', async ({ page }) => {
    await page.locator('#leaderboardBtn').click();
    await expect(page.locator('#loginModal')).toHaveClass(/show/);

    await page.locator('#loginClose').click();

    await expect(page.locator('#loginModal')).not.toHaveClass(/show/);
  });
});
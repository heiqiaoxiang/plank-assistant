import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);
  });

  async function openLoginFromProfile(page) {
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#settingsOverlay')).toHaveClass(/show/);
    await expect(page.locator('#loginBtn')).toBeVisible();
    await page.locator('#loginBtn').click();

    await expect(page.locator('#loginModal')).toHaveClass(/show/, { timeout: 8000 });
    await expect(page.locator('#loginModal')).toBeVisible();
  }

  test('leaderboard opens ranking without becoming a login entry', async ({ page }) => {
    await page.locator('#leaderboardBtn').click();

    await expect(page.locator('#leaderboardOverlay')).toHaveClass(/show/, { timeout: 8000 });
    await expect(page.locator('#loginModal')).not.toHaveClass(/show/);
  });

  test('profile account section opens login modal for guests', async ({ page }) => {
    await openLoginFromProfile(page);
    await expect(page.locator('#loginTitle')).toContainText('登录');
  });

  test('can switch between login and signup', async ({ page }) => {
    await openLoginFromProfile(page);

    const loginSwitchBtn = page.locator('#loginSwitchBtn');
    await loginSwitchBtn.click();

    const loginTitle = page.locator('#loginTitle');
    await expect(loginTitle).toContainText('注册');
  });

  test('login form validation', async ({ page }) => {
    await openLoginFromProfile(page);

    await page.locator('#loginSubmitBtn').click();

    const loginError = page.locator('#loginError');
    await expect(loginError).toBeVisible();
  });

  test('can close login modal', async ({ page }) => {
    await openLoginFromProfile(page);

    await page.locator('#loginClose').click();

    await expect(page.locator('#loginModal')).not.toHaveClass(/show/);
  });
});

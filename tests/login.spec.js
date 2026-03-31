import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('leaderboard shows login modal when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.locator('#leaderboardBtn').click();
    
    await page.waitForSelector('#loginModal.show', { timeout: 8000 });
    const loginModal = page.locator('#loginModal');
    await expect(loginModal).toBeVisible();
  });

  test('can switch between login and signup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.locator('#leaderboardBtn').click();
    await page.waitForTimeout(500);
    
    const loginSwitchBtn = page.locator('#loginSwitchBtn');
    await loginSwitchBtn.click();
    
    const loginTitle = page.locator('#loginTitle');
    await expect(loginTitle).toContainText('注册');
  });

  test('login form validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.locator('#leaderboardBtn').click();
    await page.waitForTimeout(500);
    
    await page.locator('#loginSubmitBtn').click();
    await page.waitForTimeout(300);
    
    const loginError = page.locator('#loginError');
    await expect(loginError).toBeVisible();
  });

  test('can close login modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.locator('#leaderboardBtn').click();
    await page.waitForTimeout(500);
    
    await page.locator('#loginClose').click();
    await page.waitForTimeout(500);
    
    const loginModal = page.locator('#loginModal');
    await expect(loginModal).not.toHaveClass(/show/);
  });
});

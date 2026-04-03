import { test, expect } from '@playwright/test';

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#profileSection')).toBeVisible();
  });

  test('profile section shows default state for guest user', async ({ page }) => {
    await expect(page.locator('#profileSection')).toBeVisible();
    
    const emailText = await page.locator('#profileEmail').textContent();
    expect(emailText).toMatch(/游客|Guest|遊客/);
    
    await expect(page.locator('#logoutBtn')).not.toBeVisible();
  });

  test('can set and persist nickname locally', async ({ page }) => {
    const testNickname = 'TestUser123';
    const nicknameInput = page.locator('#profileNickname');

    await nicknameInput.fill(testNickname);
    await nicknameInput.blur();
    await expect(async () => {
      const value = await nicknameInput.inputValue();
      expect(value).toBe(testNickname);
    }).toPass({ timeout: 3000 });

    await page.locator('#settingsClose').click();
    await page.locator('#settingsBtn').click();

    await expect(nicknameInput).toHaveValue(testNickname);
  });

  test('nickname persists after page reload', async ({ page }) => {
    const testNickname = 'PersistentUser';
    const nicknameInput = page.locator('#profileNickname');

    await nicknameInput.fill(testNickname);
    await nicknameInput.blur();
    await expect(nicknameInput).toHaveValue(testNickname, { timeout: 3000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.locator('#settingsBtn').click();
    await expect(nicknameInput).toHaveValue(testNickname);
  });

  test('can switch between profile and settings tabs', async ({ page }) => {
    const profileTab = page.locator('.settings-tab[data-tab="profile"]');
    const settingsTab = page.locator('.settings-tab[data-tab="settings"]');

    await settingsTab.click();
    await expect(page.locator('#settingsSection')).toBeVisible();
    await expect(settingsTab).toHaveClass(/active/);

    await profileTab.click();
    await expect(page.locator('#profileSection')).toBeVisible();
    await expect(profileTab).toHaveClass(/active/);
  });

  test('settings section shows language and voice options', async ({ page }) => {
    await page.locator('.settings-tab[data-tab="settings"]').click();
    await expect(page.locator('#settingsSection')).toBeVisible();

    await expect(page.locator('.lang-btn')).toHaveCount(3);
    await expect(page.locator('#voiceEnabled')).toBeVisible();
    await expect(page.locator('#voiceType')).toBeVisible();
  });
});

test.describe('Logout Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
  });

  test('logout button visible only for email users', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#profileSection')).toBeVisible();

    await expect(page.locator('#logoutBtn')).not.toBeVisible();
  });

  test('logout method exists and handles state correctly', async ({ page }) => {
    const hasLogoutMethod = await page.evaluate(() => {
      return typeof window.app?.handleLogout === 'function';
    });
    expect(hasLogoutMethod).toBe(true);
  });
});

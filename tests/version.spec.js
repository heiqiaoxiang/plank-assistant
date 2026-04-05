import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('版本号显示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('页面左上角显示版本号', async ({ page }) => {
    const versionBadge = page.locator('#versionBadge');
    await expect(versionBadge).toBeVisible();
    const versionText = await versionBadge.textContent();
    expect(versionText).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  test('版本号与 package.json 一致', async ({ page }) => {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const expectedVersion = packageJson.version;
    const versionBadge = page.locator('#versionBadge');
    const displayedVersion = await versionBadge.textContent();
    expect(displayedVersion).toBe(`v${expectedVersion}`);
  });

  test('截图：版本号显示', async ({ page }) => {
    const versionBadge = page.locator('#versionBadge');
    await expect(versionBadge).toBeVisible();
    await page.screenshot({
      path: 'test-results/screenshots/version-badge.png',
      clip: { x: 0, y: 0, width: 200, height: 80 }
    });
  });
});

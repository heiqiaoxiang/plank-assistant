import { test, expect } from '@playwright/test';

test.describe('Mobile Touch Interaction', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

  test('start button responds to touch on localhost', async ({ page }) => {
    await page.goto('http://localhost:23366/');
    await page.waitForTimeout(2000);

    const startBtn = page.locator('#startBtn');
    await expect(startBtn).toHaveText('开始');

    await startBtn.tap();
    await page.waitForTimeout(500);

    await expect(startBtn).toHaveText('暂停');
  });

  test('start button responds to touch on LAN IP', async ({ page }) => {
    await page.goto('http://192.168.0.111:23366/');
    await page.waitForTimeout(2000);

    const startBtn = page.locator('#startBtn');
    await expect(startBtn).toHaveText('开始');

    await startBtn.tap();
    await page.waitForTimeout(500);

    await expect(startBtn).toHaveText('暂停');
  });
});

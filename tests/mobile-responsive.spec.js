import { test, expect } from '@playwright/test';

test.describe('Mobile Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);
  });

  test.describe('Small Screen Viewport (iPhone SE)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('action buttons are visible on small screen', async ({ page }) => {
      const historyBtn = page.locator('#historyBtn');
      const leaderboardBtn = page.locator('#leaderboardBtn');

      await expect(historyBtn).toBeVisible();
      await expect(leaderboardBtn).toBeVisible();

      const historyBox = await historyBtn.boundingBox();
      const leaderboardBox = await leaderboardBtn.boundingBox();

      expect(historyBox.y + historyBox.height).toBeLessThanOrEqual(667);
      expect(leaderboardBox.y + leaderboardBox.height).toBeLessThanOrEqual(667);
    });

    test('screenshot: small screen layout', async ({ page }) => {
      await page.screenshot({
        path: 'test-results/screenshots/mobile-small-screen.png',
        fullPage: false
      });
    });
  });

  test.describe('Medium Screen Viewport (iPhone 12)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('action buttons are visible on medium screen', async ({ page }) => {
      const historyBtn = page.locator('#historyBtn');
      const leaderboardBtn = page.locator('#leaderboardBtn');

      await expect(historyBtn).toBeVisible();
      await expect(leaderboardBtn).toBeVisible();
    });

    test('screenshot: medium screen layout', async ({ page }) => {
      await page.screenshot({
        path: 'test-results/screenshots/mobile-medium-screen.png',
        fullPage: false
      });
    });
  });

  test.describe('Touch Interaction', () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

    test('history button responds to touch', async ({ page }) => {
      const historyBtn = page.locator('#historyBtn');
      
      await historyBtn.tap();
      
      const historyOverlay = page.locator('#historyOverlay');
      await expect(historyOverlay).toHaveClass(/show/);
    });

    test('leaderboard button responds to touch', async ({ page }) => {
      const leaderboardBtn = page.locator('#leaderboardBtn');
      
      await leaderboardBtn.tap();
      
      const loginModal = page.locator('#loginModal');
      await expect(loginModal).toHaveClass(/show/);
    });

    test('preset buttons respond to touch', async ({ page }) => {
      const preset30 = page.locator('.preset[data-time="30"]');
      const timerDisplay = page.locator('#timerDisplay');

      await preset30.tap();
      await expect(timerDisplay).toHaveText('30');
    });

    test('start button responds to touch', async ({ page }) => {
      const startBtn = page.locator('#startBtn');
      
      await startBtn.tap();
      await expect(startBtn).toHaveText('暂停');
    });
  });

  test.describe('Regression: Button visibility bug fix', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('action buttons are clickable and not hidden by overflow', async ({ page }) => {
      const historyBtn = page.locator('#historyBtn');
      const leaderboardBtn = page.locator('#leaderboardBtn');

      await expect(historyBtn).toBeEnabled();
      await expect(leaderboardBtn).toBeEnabled();

      await historyBtn.click();
      await expect(page.locator('#historyOverlay')).toHaveClass(/show/);

      await page.locator('#historyClose').click();
      await expect(page.locator('#historyOverlay')).not.toHaveClass(/show/);

      await leaderboardBtn.click();
      await expect(page.locator('#loginModal')).toHaveClass(/show/);
    });
  });
});

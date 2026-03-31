import { test, expect } from '@playwright/test';

test.describe('Plank App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('page loads correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Plank/);
  });

  test('shows initial state', async ({ page }) => {
    const timerDisplay = page.locator('#timerDisplay');
    await expect(timerDisplay).toBeVisible();
    await expect(timerDisplay).toHaveText('60');
  });

  test('history button opens overlay', async ({ page }) => {
    const historyBtn = page.locator('#historyBtn');
    await expect(historyBtn).toBeVisible();
    
    await historyBtn.click();
    await page.waitForTimeout(500);
    
    const historyOverlay = page.locator('#historyOverlay');
    await expect(historyOverlay).toHaveClass(/show/);
  });

  test('leaderboard button shows login modal', async ({ page }) => {
    const leaderboardBtn = page.locator('#leaderboardBtn');
    await expect(leaderboardBtn).toBeVisible();
    
    await leaderboardBtn.click();
    
    await page.waitForSelector('#loginModal.show', { timeout: 8000 });
    const loginModal = page.locator('#loginModal');
    await expect(loginModal).toBeVisible();
  });

  test('preset buttons work', async ({ page }) => {
    const preset30 = page.locator('.preset[data-time="30"]');
    await preset30.click();
    
    const timerDisplay = page.locator('#timerDisplay');
    await expect(timerDisplay).toHaveText('30');
  });

  test('start button begins countdown', async ({ page }) => {
    const startBtn = page.locator('#startBtn');
    await startBtn.click();
    await page.waitForTimeout(1100);
    
    const timerDisplay = page.locator('#timerDisplay');
    const text = await timerDisplay.textContent();
    expect(parseInt(text)).toBeLessThan(60);
  });
});

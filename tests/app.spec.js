import { test, expect } from '@playwright/test';

test.describe('Plank App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);
  });

  test('page loads correctly', async ({ page }) => {
    const title = await page.title();
    expect(title).toMatch(/Plank|平板/);
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
    const timerDisplay = page.locator('#timerDisplay');

    await startBtn.click();
    await expect(async () => {
      const text = await timerDisplay.textContent();
      expect(parseInt(text)).toBeLessThan(60);
    }).toPass({ timeout: 3000 });
  });

  test('pause and resume functionality', async ({ page }) => {
    const startBtn = page.locator('#startBtn');
    const pauseIndicator = page.locator('#pauseIndicator');
    const timerDisplay = page.locator('#timerDisplay');

    await startBtn.click();
    await expect(async () => {
      const time = parseInt(await timerDisplay.textContent());
      expect(time).toBeLessThan(59);
    }).toPass({ timeout: 3000 });

    const timeBeforePause = parseInt(await timerDisplay.textContent());

    await startBtn.click();
    await expect(pauseIndicator).toHaveClass(/show/);
    await expect(startBtn).toHaveText('继续');

    const timeDuringPause = parseInt(await timerDisplay.textContent());
    await page.waitForTimeout(500);
    const timeAfterPause = parseInt(await timerDisplay.textContent());
    expect(timeAfterPause).toBe(timeDuringPause);

    await startBtn.click();
    await expect(pauseIndicator).not.toHaveClass(/show/);
    await expect(startBtn).toHaveText('暂停');

    const timeAfterResume = parseInt(await timerDisplay.textContent());
    await expect(async () => {
      const time = parseInt(await timerDisplay.textContent());
      expect(time).toBeLessThan(timeAfterResume);
    }).toPass({ timeout: 3000 });
  });

  test('reset restores initial state', async ({ page }) => {
    const startBtn = page.locator('#startBtn');
    const resetBtn = page.locator('#resetBtn');
    const timerDisplay = page.locator('#timerDisplay');

    await startBtn.click();
    await expect(startBtn).toHaveText('暂停');

    await resetBtn.click();
    await expect(timerDisplay).toHaveText('60');
    await expect(startBtn).toHaveText('开始');
  });
});

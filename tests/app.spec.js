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

  test('leaderboard renders cloud nicknames as safe text', async ({ page }) => {
    await page.evaluate(async () => {
      window.__leaderboardXss = false;
      window.getLeaderboard = async () => ({
        data: [{
          rank_position: 1,
          rank_value: 60,
          profiles: {
            nickname: '<img src=x onerror="window.__leaderboardXss=true">'
          }
        }]
      });
      await window.app.loadLeaderboard('total_duration');
    });

    await expect(page.locator('.leaderboard-nickname')).toHaveText('<img src=x onerror="window.__leaderboardXss=true">');
    await expect(page.locator('.leaderboard-nickname img')).toHaveCount(0);
    const xssRan = await page.evaluate(() => window.__leaderboardXss);
    expect(xssRan).toBe(false);
    await page.screenshot({ path: 'test-results/screenshots/regression-leaderboard-safe-text.png' });
  });

  test('trend chart recovers after rendering empty state', async ({ page }) => {
    await page.locator('#historyBtn').click();
    await page.locator('.history-tab[data-tab="trend"]').click();

    await page.evaluate(() => {
      window.app.data.history = [];
      window.app.renderChart();
    });

    await expect(page.locator('.trend-empty')).toBeVisible();
    await expect(page.locator('#trendChart')).toBeAttached();

    await page.evaluate(() => {
      window.app.data.history = [{
        date: new Date().toISOString(),
        duration: 60,
        mode: 'classic',
        pausedCount: 0,
        pausedTime: 0,
        restDuration: 0
      }];
      window.app.renderChart();
    });

    await expect(page.locator('.trend-empty')).toHaveCount(0);
    await expect(page.locator('#trendChart')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/regression-trend-recovers-after-empty.png' });
  });

  test('language switch preserves active timer state', async ({ page }) => {
    await page.locator('#startBtn').click();
    await expect(page.locator('#startBtn')).toHaveText('暂停');

    await page.locator('#settingsBtn').click();
    await page.locator('.lang-btn[data-lang="en"]').click();

    const isRunning = await page.evaluate(() => window.app.state.isRunning);
    expect(isRunning).toBe(true);
    await expect(page.locator('#startBtn')).toHaveText('Pause');
    await expect(page.locator('#breathText')).not.toHaveText('Get Ready');
    await page.screenshot({ path: 'test-results/screenshots/regression-language-switch-running.png' });
  });

  test('paused sessions count active training duration once', async ({ page }) => {
    const result = await page.evaluate(() => {
      window.app.data = {
        todayCount: 0,
        weekCount: 0,
        totalTime: 0,
        lastDate: new Date().toDateString(),
        history: [],
        nickname: ''
      };
      window.app.setDuration(30);
      window.app.state.pausedIntervals = [5];
      window.app.state.totalPausedTime = 5;
      window.app.complete();
      const last = window.app.data.history.at(-1);
      return {
        totalTime: window.app.data.totalTime,
        actualTime: last.actualTime,
        restDuration: last.restDuration,
        pausedTime: last.pausedTime
      };
    });

    expect(result).toEqual({
      totalTime: 30,
      actualTime: 30,
      restDuration: 5,
      pausedTime: 5
    });
    await page.screenshot({ path: 'test-results/screenshots/regression-paused-duration.png' });
  });

  test('cloud sync payload preserves completion and rest metadata', async ({ page }) => {
    const payload = await page.evaluate(() => window.app.buildSessionInsert({
      date: '2026-06-18T12:34:56.000Z',
      duration: 45,
      mode: 'classic',
      pausedCount: 2,
      restDuration: 7
    }, 'user-123'));

    expect(payload).toEqual({
      user_id: 'user-123',
      duration: 45,
      mode: 'classic',
      paused_count: 2,
      rest_duration: 7,
      completed_at: '2026-06-18T12:34:56.000Z'
    });
  });
});

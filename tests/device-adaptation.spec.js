import { test, expect } from '@playwright/test';

const DEVICES = [
  { name: 'iPhone SE (3rd)', width: 375, height: 667 },
  { name: 'iPhone mini', width: 375, height: 812 },
  { name: 'iPhone standard (14/15/16)', width: 390, height: 844 },
  { name: 'iPhone Pro (14/15/16)', width: 393, height: 852 },
  { name: 'iPhone Pro Max (14/15/16)', width: 430, height: 932 },
];

test.describe('Device Adaptation', () => {
  for (const device of DEVICES) {
    test.describe(`${device.name} (${device.width}×${device.height})`, () => {
      test.use({ viewport: { width: device.width, height: device.height } });

      test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.evaluate(() => localStorage.clear());
        await page.waitForTimeout(500);
      });

      test('all main UI elements visible without scroll', async ({ page }) => {
        const breathContainer = page.locator('#breathContainer');
        const startBtn = page.locator('#startBtn');
        const resetBtn = page.locator('#resetBtn');
        const statsPanel = page.locator('#statsPanel');
        const historyBtn = page.locator('#historyBtn');
        const leaderboardBtn = page.locator('#leaderboardBtn');

        await expect(breathContainer).toBeVisible();
        await expect(startBtn).toBeVisible();
        await expect(resetBtn).toBeVisible();
        await expect(statsPanel).toBeVisible();
        await expect(historyBtn).toBeVisible();
        await expect(leaderboardBtn).toBeVisible();

        const presets = page.locator('.preset');
        await expect(presets).toHaveCount(5);

        for (const loc of [historyBtn, leaderboardBtn]) {
          const box = await loc.boundingBox();
          expect(box.y + box.height).toBeLessThanOrEqual(device.height);
        }
      });

      test('CSS variables are set correctly', async ({ page }) => {
        const rootStyles = await page.evaluate(() => {
          const root = document.documentElement;
          const computed = getComputedStyle(root);
          return {
            breathRingSize: computed.getPropertyValue('--breath-ring-size').trim(),
            timerFontSize: computed.getPropertyValue('--timer-font-size').trim(),
            headerPaddingY: computed.getPropertyValue('--header-padding-y').trim(),
            mainGap: computed.getPropertyValue('--main-gap').trim(),
            btnMinHeight: computed.getPropertyValue('--btn-min-height').trim(),
            settingsBtnSize: computed.getPropertyValue('--settings-btn-size').trim(),
          };
        });

        expect(rootStyles.breathRingSize).not.toBe('');
        expect(rootStyles.timerFontSize).not.toBe('');
        expect(rootStyles.headerPaddingY).not.toBe('');
        expect(rootStyles.mainGap).not.toBe('');
        expect(rootStyles.btnMinHeight).not.toBe('');
        expect(rootStyles.settingsBtnSize).not.toBe('');

        const breathSize = parseInt(rootStyles.breathRingSize);
        expect(breathSize).toBeGreaterThan(0);
        expect(breathSize).toBeLessThanOrEqual(device.height - 200);
      });

      test('breath container does not overflow viewport', async ({ page }) => {
        const breathContainer = page.locator('#breathContainer');
        const box = await breathContainer.boundingBox();
        expect(box.width).toBeLessThanOrEqual(device.width - 20);
        expect(box.height).toBeLessThanOrEqual(device.height * 0.55);
      });

      test('timer display sized appropriately', async ({ page }) => {
        const timerDisplay = page.locator('#timerDisplay');
        const fontSize = await timerDisplay.evaluate((el) => {
          return getComputedStyle(el).fontSize;
        });

        const fontSizeNum = parseInt(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(44);
        expect(fontSizeNum).toBeLessThanOrEqual(80);
      });

      test('preset buttons fit within viewport width', async ({ page }) => {
        const presets = page.locator('.preset');
        const count = await presets.count();

        for (let i = 0; i < count; i++) {
          const box = await presets.nth(i).boundingBox();
          expect(box.x + box.width).toBeLessThanOrEqual(device.width);
        }
      });

      test('screenshot: device layout', async ({ page }) => {
        await page.screenshot({
          path: `test-results/screenshots/device-${device.name.replace(/[\s()]/g, '-').toLowerCase()}.png`,
          fullPage: false
        });
      });
    });
  }

  test.describe('Cross-device variable progression', () => {
    test('breath ring size increases with device height', async ({ browser }) => {
      const sizes = [];

      for (const device of DEVICES) {
        const context = await browser.newContext({
          viewport: { width: device.width, height: device.height }
        });
        const page = await context.newPage();
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        const size = await page.evaluate(() => {
          return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--breath-ring-size'));
        });
        sizes.push({ device: device.name, size });
        await context.close();
      }

      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i].size).toBeGreaterThanOrEqual(sizes[i - 1].size);
      }
    });

    test('timer font size increases with device height', async ({ browser }) => {
      const fontSizes = [];

      for (const device of DEVICES) {
        const context = await browser.newContext({
          viewport: { width: device.width, height: device.height }
        });
        const page = await context.newPage();
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        const fontSize = await page.evaluate(() => {
          return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--timer-font-size'));
        });
        fontSizes.push({ device: device.name, fontSize });
        await context.close();
      }

      for (let i = 1; i < fontSizes.length; i++) {
        expect(fontSizes[i].fontSize).toBeGreaterThanOrEqual(fontSizes[i - 1].fontSize);
      }
    });
  });
});
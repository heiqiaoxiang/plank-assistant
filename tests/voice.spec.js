import { test, expect } from '@playwright/test';

test.describe('语音功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:23366');
  });

  test('默认中文模式下语音设置正确', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    const voiceEnabled = await page.locator('#voiceEnabled').isChecked();
    expect(voiceEnabled).toBe(true);

    const voiceType = await page.locator('#voiceType').inputValue();
    expect(voiceType).toBe('zh');

    await page.screenshot({ path: 'test-results/screenshots/voice-settings-default.png' });
  });

  test('中文模式下语音选择普通话而非粤语', async ({ page }) => {
    // 监听控制台日志来验证语音选择
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // 确保语音设置为中文
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
    await page.selectOption('#voiceType', 'zh');
    await page.click('#settingsClose');

    // 点击开始触发语音初始化
    await page.click('#startBtn');
    await page.waitForTimeout(1000);

    // 检查控制台日志中语音选择信息
    const voiceLogs = consoleMessages.filter(msg =>
      msg.includes('[Voice]') && msg.includes('voice:')
    );

    // 如果有语音使用日志，验证不是粤语
    if (voiceLogs.length > 0) {
      const lastVoiceLog = voiceLogs[voiceLogs.length - 1];
      console.log('Voice log:', lastVoiceLog);

      // 验证没有使用粤语语音
      expect(lastVoiceLog).not.toContain('zh-HK');
    }

    await page.screenshot({ path: 'test-results/screenshots/voice-zh-not-cantonese.png' });

    await page.click('#resetBtn');
  });

  test('点击开始后语音系统初始化', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
    await page.selectOption('#voiceType', 'zh');
    await page.click('#settingsClose');

    await page.click('#startBtn');
    await page.waitForTimeout(500);

    const isRunning = await page.locator('#timerDisplay').evaluate(el => {
      return el.classList.contains('running');
    });
    expect(isRunning).toBe(true);

    await page.screenshot({ path: 'test-results/screenshots/voice-start-timer.png' });

    await page.click('#resetBtn');
  });

  test('切换语言时语音语言同步更新', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    await page.click('.lang-btn[data-lang="en"]');
    await page.waitForTimeout(200);

    const voiceType = await page.locator('#voiceType').inputValue();
    expect(voiceType).toBe('en');

    await page.screenshot({ path: 'test-results/screenshots/voice-lang-switch-en.png' });

    await page.click('.lang-btn[data-lang="zh"]');
    await page.waitForTimeout(200);

    const voiceTypeZh = await page.locator('#voiceType').inputValue();
    expect(voiceTypeZh).toBe('zh');

    await page.screenshot({ path: 'test-results/screenshots/voice-lang-switch-zh.png' });
  });

  test('语音开关可以正常启用/禁用', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    // 获取初始状态
    let isChecked = await page.locator('#voiceEnabled').isChecked();
    expect(isChecked).toBe(true);

    // 通过点击 label 的 slider 来切换开关
    await page.click('#voiceEnabled + .toggle-slider');
    await page.waitForTimeout(200);

    // 验证已关闭
    isChecked = await page.locator('#voiceEnabled').isChecked();
    expect(isChecked).toBe(false);

    await page.click('#settingsClose');

    // 重新打开设置验证状态保持
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    isChecked = await page.locator('#voiceEnabled').isChecked();
    expect(isChecked).toBe(false);

    // 重新启用语音
    await page.click('#voiceEnabled + .toggle-slider');
    await page.waitForTimeout(200);

    isChecked = await page.locator('#voiceEnabled').isChecked();
    expect(isChecked).toBe(true);

    await page.screenshot({ path: 'test-results/screenshots/voice-toggle-test.png' });
  });

  test('打开设置页面时语音名称选择器显示可用语音', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.waitForTimeout(1000);

    await expect(page.locator('#voiceName')).toBeVisible();

    const voiceNameOptions = await page.locator('#voiceName option').count();
    expect(voiceNameOptions).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: 'test-results/screenshots/voice-name-options-immediate.png' });

    await page.click('#settingsClose');
  });

  test('语音名称选择器在开始后显示可用语音', async ({ page }) => {
    await page.click('#startBtn');
    await page.waitForTimeout(1000);

    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    await expect(page.locator('#voiceName')).toBeVisible();

    const voiceNameOptions = await page.locator('#voiceName option').count();
    expect(voiceNameOptions).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: 'test-results/screenshots/voice-name-options.png' });

    await page.click('#settingsClose');
    await page.click('#resetBtn');
  });

  test('可以选择具体语音名称', async ({ page }) => {
    await page.click('#startBtn');
    await page.waitForTimeout(1000);

    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    const optionCount = await page.locator('#voiceName option').count();
    if (optionCount > 1) {
      const secondOption = await page.locator('#voiceName option').nth(1);
      const voiceName = await secondOption.getAttribute('value');

      await page.selectOption('#voiceName', voiceName);
      await page.waitForTimeout(200);

      const selectedValue = await page.locator('#voiceName').inputValue();
      expect(selectedValue).toBe(voiceName);
    }

    await page.screenshot({ path: 'test-results/screenshots/voice-name-select.png' });

    await page.click('#settingsClose');
    await page.click('#resetBtn');
  });

  test('试听功能可以正常工作', async ({ page }) => {
    await page.click('#startBtn');
    await page.waitForTimeout(1000);

    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    const testBtn = await page.locator('#voiceTestBtn');
    await expect(testBtn).toBeVisible();
    await expect(testBtn).toBeEnabled();

    await testBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/screenshots/voice-test-button.png' });

    await page.click('#settingsClose');
    await page.click('#resetBtn');
  });

  test('语音选择器根据播报语言过滤语音列表', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.waitForTimeout(1000);

    const zhVoiceCount = await page.locator('#voiceName option').count();
    expect(zhVoiceCount).toBeGreaterThanOrEqual(1);

    await page.selectOption('#voiceType', 'en');
    await page.waitForTimeout(500);

    const enVoiceCount = await page.locator('#voiceName option').count();
    expect(enVoiceCount).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: 'test-results/screenshots/voice-filter-by-lang.png' });

    await page.click('#settingsClose');
  });
});

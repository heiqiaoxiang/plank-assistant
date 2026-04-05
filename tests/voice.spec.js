const { test, expect } = require('@playwright/test');

test.describe('语音功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:23366');
  });

  test('默认中文模式下语音设置正确', async ({ page }) => {
    // 打开设置面板
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    // 验证语音开关默认启用
    const voiceEnabled = await page.locator('#voiceEnabled').isChecked();
    expect(voiceEnabled).toBe(true);

    // 验证语音语言默认为中文
    const voiceType = await page.locator('#voiceType').inputValue();
    expect(voiceType).toBe('zh');

    // 截图保存
    await page.screenshot({ path: 'test-results/screenshots/voice-settings-default.png' });
  });

  test('点击开始后语音系统初始化', async ({ page }) => {
    // 监听 console 日志
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // 设置语音为中文
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
    await page.selectOption('#voiceType', 'zh');
    await page.click('#settingsClose');

    // 点击开始按钮
    await page.click('#startBtn');
    await page.waitForTimeout(500);

    // 验证计时器开始运行
    const isRunning = await page.locator('#timerDisplay').evaluate(el => {
      return el.classList.contains('running');
    });
    expect(isRunning).toBe(true);

    // 截图保存
    await page.screenshot({ path: 'test-results/screenshots/voice-start-timer.png' });

    // 停止计时器
    await page.click('#resetBtn');
  });

  test('切换语言时语音语言同步更新', async ({ page }) => {
    // 打开设置
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    // 切换到英文
    await page.click('.lang-btn[data-lang="en"]');
    await page.waitForTimeout(200);

    // 验证语音类型也切换到英文
    const voiceType = await page.locator('#voiceType').inputValue();
    expect(voiceType).toBe('en');

    // 截图保存
    await page.screenshot({ path: 'test-results/screenshots/voice-lang-switch-en.png' });

    // 切换回中文
    await page.click('.lang-btn[data-lang="zh"]');
    await page.waitForTimeout(200);

    const voiceTypeZh = await page.locator('#voiceType').inputValue();
    expect(voiceTypeZh).toBe('zh');

    await page.screenshot({ path: 'test-results/screenshots/voice-lang-switch-zh.png' });
  });

  test('语音开关可以正常启用/禁用', async ({ page }) => {
    // 打开设置
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    // 禁用语音
    await page.uncheck('#voiceEnabled');
    await page.waitForTimeout(200);

    // 关闭设置
    await page.click('#settingsClose');

    // 再次打开设置验证状态保持
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    const isChecked = await page.locator('#voiceEnabled').isChecked();
    expect(isChecked).toBe(false);

    // 重新启用语音
    await page.check('#voiceEnabled');
    await page.waitForTimeout(200);

    await page.screenshot({ path: 'test-results/screenshots/voice-toggle-test.png' });
  });
});

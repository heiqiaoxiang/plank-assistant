# Playwright 测试指南

> 每次修复问题或增加新功能时，必须相应地增加 Playwright 测试代码。

## 核心原则

1. **功能即测试** - 每个功能必须有对应的 E2E 测试
2. **修复即验证** - 每个 bug 修复必须有回归测试
3. **视觉即证据** - 关键交互必须截图留档

---

## 测试文件组织

```
tests/
├── app.spec.js           # 核心应用功能测试
├── login.spec.js         # 登录相关测试
├── profile.spec.js       # 个人中心测试
└── {feature}.spec.js     # 新增功能测试（命名规范）
```

### 命名规范

- 功能测试: `{feature-name}.spec.js` (如 `breathing.spec.js`, `celebration.spec.js`)
- 页面测试: `{page-name}.spec.js` (如 `leaderboard.spec.js`, `history.spec.js`)
- Bug 回归测试: 在相关功能测试文件中添加 `test('regression: {bug-description}')`

---

## 测试编写模板

### 基础测试结构

```javascript
import { test, expect } from '@playwright/test';

test.describe('功能名称', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('测试场景描述', async ({ page }) => {
    // Arrange: 准备条件
    const element = page.locator('#elementId');
    
    // Act: 执行操作
    await element.click();
    
    // Assert: 验证结果
    await expect(page.locator('#result')).toBeVisible();
  });
});
```

### 交互测试模板

```javascript
test('交互场景 - 点击、等待、验证', async ({ page }) => {
  const button = page.locator('#buttonId');
  
  // 验证初始状态
  await expect(button).toHaveText('开始');
  
  // 执行操作
  await button.click();
  await page.waitForTimeout(500); // 等待动画
  
  // 验证状态变化
  await expect(button).toHaveText('暂停');
});
```

### 截图测试模板

```javascript
test('关键场景截图', async ({ page }) => {
  await page.goto('/');
  
  // 执行操作
  await page.locator('#startBtn').click();
  await page.waitForTimeout(1000);
  
  // 截图保存
  await page.screenshot({
    path: 'test-results/screenshots/timer-running.png',
    fullPage: false
  });
});
```

---

## 测试覆盖检查清单

### 新增功能时

- [ ] 功能的正常流程测试
- [ ] 边界条件测试（如最小/最大时长）
- [ ] 错误处理测试（如网络断开）
- [ ] 用户交互测试（点击、滑动、输入）
- [ ] 状态变化验证（UI 更新、数据变化）
- [ ] 关键步骤截图

### 修复 Bug 时

- [ ] 复现 Bug 的回归测试
- [ ] 修复后的正确行为测试
- [ ] 相关功能的回归测试（防止引入新问题）

---

## 常用测试模式

### 等待元素出现

```javascript
// 等待元素可见
await page.waitForSelector('#element.show', { timeout: 5000 });

// 等待网络空闲
await page.waitForLoadState('networkidle');

// 等待特定时间（动画）
await page.waitForTimeout(500);
```

### 验证类名/状态

```javascript
// 验证包含某个类名
await expect(element).toHaveClass(/show/);

// 验证不包含某个类名
await expect(element).not.toHaveClass(/hidden/);
```

### 表单操作

```javascript
// 填写输入框
await page.locator('#nickname').fill('测试用户');

// 选择下拉选项
await page.locator('#language').selectOption('en');

// 勾选复选框
await page.locator('#voiceToggle').check();
```

### 弹窗/遮罩层

```javascript
// 打开弹窗
await page.locator('#openBtn').click();
await page.waitForSelector('#modal.show');

// 关闭弹窗
await page.locator('#closeBtn').click();
await expect(page.locator('#modal')).not.toHaveClass(/show/);
```

---

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npx playwright test tests/breathing.spec.js

# UI 模式（可视化调试）
npm run test:ui

# 带报告运行
npx playwright test --reporter=html
```

---

## 截图规范

### 保存位置

```
test-results/
├── screenshots/
│   ├── {feature-name}-initial.png    # 初始状态
│   ├── {feature-name}-active.png     # 激活状态
│   └── {feature-name}-completed.png  # 完成状态
└── report.html                       # 测试报告
```

### 截图时机

1. **关键状态变化后** - 如计时开始、暂停、完成
2. **用户交互后** - 如打开面板、切换标签
3. **动画完成后** - 等待 500ms 确保渲染稳定

---

## 示例：新增呼吸功能测试

```javascript
import { test, expect } from '@playwright/test';

test.describe('呼吸引导', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('呼吸圆环初始状态', async ({ page }) => {
    const breathRing = page.locator('#breathRing');
    await expect(breathRing).toBeVisible();
    await expect(breathRing).not.toHaveClass(/inhaling|exhaling/);
  });

  test('开始训练后启动呼吸动画', async ({ page }) => {
    await page.locator('#startBtn').click();
    await page.waitForTimeout(500);
    
    const breathText = page.locator('#breathText');
    const text = await breathText.textContent();
    expect(['吸气...', '屏息...', '呼气...']).toContain(text);
  });

  test('呼吸节奏 4-2-4', async ({ page }) => {
    await page.locator('#startBtn').click();
    
    // 吸气阶段 (4秒)
    await page.waitForTimeout(500);
    const inhaleText = await page.locator('#breathText').textContent();
    expect(inhaleText).toBe('吸气...');
    
    // 等待吸气完成，进入屏息
    await page.waitForTimeout(4000);
    const holdText = await page.locator('#breathText').textContent();
    expect(holdText).toBe('屏息...');
  });

  test('截图：呼吸引导状态', async ({ page }) => {
    await page.locator('#startBtn').click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({
      path: 'test-results/screenshots/breathing-inhale.png',
      clip: { x: 0, y: 200, width: 400, height: 300 }
    });
  });
});
```

---

## 提交前检查

```bash
# 1. 运行所有测试
npm test

# 2. 检查是否有失败的测试
# 3. 确认截图已保存到 test-results/screenshots/
# 4. 查看测试报告 test-results/report.html
```

---

## 与 Feature List 的对应关系

| FEATURES.md 功能 | 对应测试文件 | 测试状态 |
|------------------|-------------|---------|
| 计时系统 - 预设时长 | `app.spec.js` | ✅ 已覆盖 |
| 计时系统 - 暂停/继续 | `app.spec.js` | ✅ 已覆盖 |
| 计时系统 - 重置 | `app.spec.js` | ✅ 已覆盖 |
| 呼吸引导 | `breathing.spec.js` | 📝 待添加 |
| 完成庆祝 | `celebration.spec.js` | 📝 待添加 |
| 历史记录 | `history.spec.js` | 📝 待添加 |
| 排行榜 | `leaderboard.spec.js` | 📝 待添加 |
| 个人中心 | `profile.spec.js` | ✅ 已覆盖 |
| 语音播报 | `voice.spec.js` | 📝 待添加 |
| 多语言 | `i18n.spec.js` | 📝 待添加 |

---

## 注意事项

1. **测试独立性** - 每个测试应该独立运行，不依赖其他测试的状态
2. **清理状态** - 使用 `beforeEach` 重置到已知初始状态
3. **合理等待** - 使用 `waitForSelector` 或 `waitForTimeout` 处理异步操作
4. **断言具体** - 不要只检查 `toBeVisible()`，还要验证具体内容和状态
5. **截图命名** - 使用描述性名称，方便识别问题

---

## 参考资源

- [Playwright 官方文档](https://playwright.dev/)
- [API 参考](https://playwright.dev/docs/api/class-page)
- [最佳实践](https://playwright.dev/docs/best-practices)

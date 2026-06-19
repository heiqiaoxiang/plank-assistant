# Project Work Habits (Plank Assistant)

## Documentation Sync

### Feature List Update (FEATURES.md)

After completing any feature or feature module, **always update** `FEATURES.md`:

| Scenario | Action |
|----------|--------|
| New feature added | Add description to corresponding module section |
| Feature improved | Update explanation/status in existing entry |
| Feature deprecated | Mark as deprecated or remove entry |

This ensures the feature list always reflects the current implementation state.

---

## Feature Testing (Playwright)

### 测试要求（强制执行）

**每次修复问题或增加新功能，必须相应添加 Playwright 测试代码。**

- **新增功能** → 编写完整的 E2E 测试覆盖该功能
- **Bug 修复** → 编写回归测试防止问题复发
- **功能改进** → 更新/扩展相关测试用例

参考详细指南: [docs/PLAYWRIGHT_GUIDE.md](./docs/PLAYWRIGHT_GUIDE.md)

### 测试范围选择

按改动风险选择验证范围，不要无条件跑全量 E2E：

| 改动类型 | 推荐验证 |
|----------|----------|
| 前端功能、UI、交互、用户可见行为 | 相关 Playwright 测试；高风险或共享逻辑改动再跑全量 E2E |
| Bug 修复 | 能复现问题的回归测试 + 相关功能测试 |
| 构建、部署、CI、脚本、文档配置 | 语法/配置检查 + 相关脚本实际运行；通常不需要全量 Playwright |
| 依赖、构建链、跨模块基础设施 | `npm run build` + 受影响测试；必要时全量 E2E |

例：只改 Cloudflare Pages 校验脚本或 GitHub Actions 时，优先运行：

```bash
node --check scripts/verify-cloudflare-pages.mjs
npm run verify:cloudflare -- --timeout-ms 30000 --interval-ms 5000
git diff --check
```

### 测试工作流程

After completing any feature, **run Playwright tests** and save results:

**Test Workflow:**
1. Run relevant E2E tests via Playwright
2. Capture key screenshots for visual verification
3. Save results to `test-results/` directory

**Screenshot Convention:**
- Save to: `test-results/screenshots/`
- Naming: `{feature-name}-{scenario}.png`
- Key scenarios: initial state, interaction, completion state

**Test Report:**
- Save Playwright HTML report to `test-results/report.html`
- Include pass/fail status in commit notes

**Test Failure Handling:**
1. Check test results after each run
2. If failed → analyze failure reason → fix the issue
3. Re-run tests (max 2 fix attempts)
4. After 2 failed fixes → record in `test-results/failed-cases.md` for manual review
5. If test passes or fix succeeds → commit with descriptive message

**Commit Message Convention:**
Write commit messages like release notes — focus on **what was solved/fixed**, not **what code changed**.

| Style | Example |
|-------|---------|
| ❌ Bad | "Modified app.js timer logic" |
| ✅ Good | "Fixed timer not pausing correctly when user taps pause button" |
| ❌ Bad | "Updated breathRing animation" |
| ✅ Good | "Fixed breath ring animation stuttering during transition" |

Keep messages user-friendly so they read like a changelog, not a code diff.

This ensures every feature has automated test coverage and visual evidence.

---

## Deployment Verification

### Cloudflare Pages

Cloudflare Pages 默认站点:

```text
https://plank-assistant.pages.dev/
```

每次推送 `main` 后，GitHub Actions 会运行 `.github/workflows/cloudflare-pages-verify.yml`，轮询线上 Pages 站点并确认：

- 页面版本号与 `package.json` 版本一致
- 响应头 `server` 为 `cloudflare`
- `manifest.json` 返回 JSON content type
- `sw.js` 返回 JavaScript content type
- 当前主入口 JS 资源返回 JavaScript content type

本地手动验证命令：

```bash
npm run verify:cloudflare -- --timeout-ms 600000 --interval-ms 15000
```

如果只是修复部署配置、CI 或校验脚本，且不希望触发本地 `pre-push` 自动版本递增钩子，可以在确认原因后使用：

```bash
git push --no-verify
```

不要把 `--no-verify` 作为默认推送方式；功能发布或用户可见改动仍应按项目版本策略正常递增版本。

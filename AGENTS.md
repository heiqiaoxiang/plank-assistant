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

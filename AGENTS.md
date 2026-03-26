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

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->

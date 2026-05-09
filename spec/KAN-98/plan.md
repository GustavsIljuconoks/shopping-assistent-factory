# KAN-98 Implementation Plan

## Scope

- Update the visible automation browser handoff message to include the retailer window name.
- Pause challenge-aware staging runs until the detected anti-bot challenge clears.
- Resume automatically after the challenge is gone and focus is available again.
- Timeout unresolved challenges so existing staging failure-card rendering can surface the failure.
- Add focused tests for handoff messaging, resume, and timeout behavior.

## Progress

- [x] Read repository conventions and KAN-98 ticket snapshot.
- [x] Inspect automation browser, ASOS staging, and failure-card code paths.
- [x] Implement challenge handoff pause/resume/timeout.
- [x] Add focused tests.
- [x] Run syntax checks and relevant tests.
- [x] Write Jira-facing response.

## Notes

- `VisibleAutomationBrowserRun.waitForUserAction()` now publishes `Waiting for you to confirm in [Retailer] window…`.
- Challenge-aware callers can pass a resolution probe; `notifyIfBrowserChallengeVisible()` uses the existing browser challenge detector and waits until the challenge is gone.
- If a focus probe is available on the session/window manager, the handoff also waits for focus before resuming; otherwise focus is treated as available.
- Unresolved handoffs time out after five minutes by default and throw an anti-bot challenge timeout error, which the existing staging failure-card path can render as an anti-bot failure.

## Verification

- `node --check src/automation-browser.mjs`
- `node --check test/automation-browser.test.mjs`
- `node --check test/asos-cart-staging-recipe.test.mjs`
- `node --test test/automation-browser.test.mjs test/asos-cart-staging-recipe.test.mjs`

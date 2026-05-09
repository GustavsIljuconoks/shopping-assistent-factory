# KAN-17 Implementation Plan

## Scope

- Add a visible automation browser wrapper API for staging run lifecycle.
- Set a distinct `Bestfriend · [Retailer]` title when launching a run.
- Foreground visible runs at staging start and background them after successful completion.
- Keep the browser foregrounded and surface `Waiting…` when a CAPTCHA/challenge requires user action.
- Support a headless toggle that suppresses foreground/background window management.

## Progress

- [x] Read repository conventions and ticket snapshot.
- [x] Confirmed there is no existing browser automation wrapper to extend.
- [x] Add dependency-free automation browser lifecycle module.
- [x] Add focused tests for title, foreground/background, challenge waiting, and headless behavior.
- [x] Run syntax checks and tests.
- [x] Write Jira-facing response.

## Notes

- The current repo has no Playwright/Puppeteer dependency or app runtime browser integration yet, so this ticket will add the behavior boundary with injectable adapters.
- Actual OS/browser window management can wire into the adapter methods in a later integration without changing the lifecycle semantics.

## Verification

- `node --check src/automation-browser.mjs`
- `node --check test/automation-browser.test.mjs`
- `node --test test/automation-browser.test.mjs test/shopping-profile.test.mjs test/shopping-audit-log.test.mjs test/settings-shopping-pane.test.mjs`

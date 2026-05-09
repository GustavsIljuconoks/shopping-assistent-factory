# KAN-21 Implementation Plan

## Scope

- Add an Asket one-time login flow boundary that launches the visible automation browser with Asket's persistent browser profile.
- Open Asket's login/account page, wait for user authentication through an injectable session adapter, and record a non-secret connected marker in the retailer profile directory.
- Render Settings -> Shopping -> Connected retailers with `Connected` for Asket when the persisted marker exists.
- Cover login persistence and settings status with focused tests.

## Progress

- [x] Read repository conventions and ticket snapshot.
- [x] Inspect existing visible browser, browser profile, and Settings Shopping modules.
- [x] Add Asket login/session management helpers.
- [x] Update Settings Shopping rendering for connected retailers.
- [x] Add focused tests for login persistence, restart detection, and status display.
- [x] Run syntax checks and tests.
- [x] Write Jira-facing response.

## Notes

- The repo currently exposes dependency-free browser/profile boundaries rather than a concrete Playwright/Puppeteer integration, so the login flow accepts injectable browser/session adapter methods.
- Runtime browser profiles are already ignored under `data/browser-profiles/`; the connected marker stores only status metadata, not cookies or secrets.
- Asket's connected retailer display can be populated via `readAsketConnectedRetailers(profilesRoot)` after a successful login or after app restart.

## Verification

- `node --check src/asket-login-flow.mjs`
- `node --check src/settings-shopping-pane.mjs`
- `node --check test/asket-login-flow.test.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --test test/asket-login-flow.test.mjs test/settings-shopping-pane.test.mjs`
- `node --test test/*.test.mjs`

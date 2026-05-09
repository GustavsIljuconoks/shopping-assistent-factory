Implemented the visible automation browser lifecycle wrapper.

- Added `src/automation-browser.mjs` with a dependency-free wrapper that launches runs with `Bestfriend · [Retailer]`, foregrounds visible staging runs, backgrounds successful visible runs, keeps challenge runs active/foregrounded, and publishes `Waiting…` to chat.
- Added headless support that still passes `headless: true` to the launcher but suppresses foreground/background window actions.
- Added tests for title formatting, visible foreground/background lifecycle, CAPTCHA/challenge waiting behavior, headless suppression, and input validation.

Verification:
- `node --check src/automation-browser.mjs`
- `node --check test/automation-browser.test.mjs`
- `node --test test/automation-browser.test.mjs test/shopping-profile.test.mjs test/shopping-audit-log.test.mjs test/settings-shopping-pane.test.mjs`

Risk:
- This adds the lifecycle boundary with injectable adapters because the repo does not yet include a concrete Playwright/Puppeteer or OS window manager integration.

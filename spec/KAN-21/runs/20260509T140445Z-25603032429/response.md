Implemented the Asket login/session boundary.

What changed:
- Added `startAsketLoginFlow`, which launches Asket in the visible automation browser using Asket's persistent retailer profile, opens the login/account URL, waits for authentication through the browser/session adapter, and records a non-secret connected marker.
- Added restart-safe connection readers, including `readAsketConnectedRetailers`, so Settings can show Asket as `Connected` after the persisted profile is reloaded.
- Updated Settings -> Shopping to render a `Connected retailers` section and display Asket with `Connected` when provided by the connection reader.
- Added tests for login launch options, persisted connected state, failed authentication behavior, restart reads, and Settings status rendering.

Verification:
- `node --check src/asket-login-flow.mjs`
- `node --check src/settings-shopping-pane.mjs`
- `node --check test/asket-login-flow.test.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --test test/asket-login-flow.test.mjs test/settings-shopping-pane.test.mjs`
- `node --test test/*.test.mjs`

Risk:
- The repo still has adapter-style browser boundaries, so a concrete Playwright/Puppeteer/OS browser adapter must call the provided `userDataDir`, navigation, and authentication wait hooks in production.

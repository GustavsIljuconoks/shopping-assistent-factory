Implemented the Settings -> Shopping empty shell.

- Added a dependency-free Settings/Shopping renderer with a navigable Shopping section and setup placeholder text.
- Added `app/settings.html` so the shell is visible as a static app screen and does not depend on profile data being present.
- Added tests covering Settings -> Shopping navigation, placeholder rendering, absent profile data, and the existing shopping profile suite.

Verification:
- `node --check src/settings-shopping-pane.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --test test/shopping-profile.test.mjs test/settings-shopping-pane.test.mjs`

Risk:
- The page is a static shell only; later milestones still need to wire real settings/profile controls. Visual rendering was not screenshot-verified in this run.

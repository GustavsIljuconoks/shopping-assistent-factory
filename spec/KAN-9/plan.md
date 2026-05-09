# KAN-9 Implementation Plan

## Scope

- Add a visible Settings screen with a Shopping pane shell.
- Keep the Shopping pane empty except for setup placeholder text.
- Ensure rendering does not require shopping profile data to exist.
- Add focused tests for navigation visibility and absent-profile behavior.

## Progress

- [x] Read repository conventions and ticket snapshot.
- [x] Confirmed there is no existing frontend app shell to extend.
- [x] Added a dependency-free Settings -> Shopping render module.
- [x] Added a static `app/settings.html` shell that opens directly in a browser.
- [x] Added tests for navigation visibility, placeholder text, and absent-profile behavior.
- [x] Run syntax checks and tests.
- [x] Write Jira-facing response.

## Notes

- The implementation should stay dependency-free to match the current repository.
- The shell should be easy for later tickets to populate with real shopping profile controls.
- The static HTML was not browser-screenshot verified in this run; it uses plain HTML/CSS and can be opened directly.

## Verification

- `node --check src/settings-shopping-pane.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --test test/shopping-profile.test.mjs test/settings-shopping-pane.test.mjs`

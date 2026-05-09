# KAN-52 Implementation Plan

## Scope

- Replace the Settings -> Shopping placeholder with editable profile controls for country, sizes, budget anchors, hard exclusions, per-item price ceiling, and enabled retailers.
- Keep persistence on the existing shopping profile JSON helpers by adding a focused settings-change helper that writes each edit immediately.
- Cover the renderer and persistence behavior with focused Node tests.

## Progress

- [x] Read repository conventions and ticket snapshot.
- [x] Inspect the existing Settings Shopping renderer and shopping profile persistence helpers.
- [x] Add populated, editable Shopping pane markup.
- [x] Add immediate persistence helper for in-place settings edits.
- [x] Update tests for all visible fields and retailer toggles.
- [x] Run syntax checks and focused tests.
- [x] Write Jira-facing response.

## Notes

- The repository currently has an HTML/string renderer and adapter-style helper modules rather than a mounted browser runtime. This change adds the editable controls and immediate-write helper boundary that the future runtime can call on field changes.
- The default retailer toggle list is `Asket`, `Zalando`, `ASOS`, `About You`, and `Uniqlo`, matching the existing retailer naming style in the repo plus a fifth default option.

## Verification

- `node --check src/settings-shopping-pane.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --test test/settings-shopping-pane.test.mjs test/shopping-profile.test.mjs`
- `node --test test/*.test.mjs`

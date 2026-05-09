# KAN-96 Implementation Plan

## Scope

- Add a small shopping data wipe service that can be called by the broader Wipe all data flow.
- Reset shopping profile data while preserving non-shopping memories stored alongside it.
- Clear staged cart state, shopping audit activity, retailer browser profiles/sessions, and shopping conversation context.
- Verify Settings -> Shopping and the audit pane can render empty states from wiped data.

## Steps

- [x] Read repository conventions and KAN-96 ticket artifacts.
- [x] Inspect existing shopping profile, audit log, active cart, browser profile, chat context, and Settings render paths.
- [x] Implement the shopping wipe service.
- [x] Add focused tests.
- [x] Run syntax checks and relevant tests.

## Notes

- No existing all-data wipe module was present in the repository; the change will provide a composable shopping-specific wipe entry point for that flow.
- `wipeShoppingData()` resets shopping profile fields to defaults, drops Shopping-tagged memories, preserves non-shopping memories, removes the shopping audit log, deletes retailer browser profile/session directories, clears staged cart state, and clears known shopping conversation context keys.
- Settings -> Shopping renders with no connected/checked retailers after wipe, and Settings -> Privacy shopping activity renders the existing empty state after the audit log is removed.

## Verification

- `node --check src/shopping-data-wipe.mjs`
- `node --check test/shopping-data-wipe.test.mjs`
- `node --test test/shopping-data-wipe.test.mjs`
- `node --test test/shopping-profile.test.mjs test/shopping-audit-log.test.mjs test/shopping-browser-profiles.test.mjs test/shopping-active-carts-strip.test.mjs test/settings-shopping-pane.test.mjs test/shopping-data-wipe.test.mjs`

## Risks

- The broader app-level "Wipe all data" caller is not present in this repository snapshot, so this PR adds the shopping-specific wipe entry point for that flow rather than wiring a UI button.

Implemented the shopping-data extension for Wipe all data.

What changed:
- Added `wipeShoppingData()` to reset shopping profile fields, staged cart state, shopping audit activity, retailer browser profiles/sessions, shopping memories, and shopping conversation context.
- Preserved non-shopping memories stored alongside the shopping profile.
- Added coverage proving Settings -> Shopping has no connected/checked retailers after wipe and the shopping activity audit pane returns to its empty state.

Verification:
- `node --check src/shopping-data-wipe.mjs`
- `node --check test/shopping-data-wipe.test.mjs`
- `node --test test/shopping-data-wipe.test.mjs`
- `node --test test/shopping-profile.test.mjs test/shopping-audit-log.test.mjs test/shopping-browser-profiles.test.mjs test/shopping-active-carts-strip.test.mjs test/settings-shopping-pane.test.mjs test/shopping-data-wipe.test.mjs`

Risk: the broader all-data wipe caller was not present in this repo snapshot, so this adds the shopping-specific wipe entry point for that flow instead of wiring a UI action.

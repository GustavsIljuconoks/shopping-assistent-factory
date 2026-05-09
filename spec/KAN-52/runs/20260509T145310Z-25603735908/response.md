Implemented the Settings -> Shopping pane population.

What changed:
- Replaced the placeholder with editable controls for country/currency, garment-class sizes, budget anchors, hard exclusions, per-item price ceiling, and enabled retailer toggles.
- Added five default retailer toggles: Asket, Zalando, ASOS, About You, and Uniqlo.
- Added `persistSettingsShoppingProfileChange()` so each in-place edit can be written immediately through the existing shopping profile persistence path.
- Added tests for full field visibility/editability, retailer toggle count/state, and immediate persisted updates.

Verification:
- `node --check src/settings-shopping-pane.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --test test/settings-shopping-pane.test.mjs test/shopping-profile.test.mjs`
- `node --test test/*.test.mjs`

Risk:
- The repo still exposes Settings as string-renderer/helper boundaries, so the mounted app runtime needs to call the new persistence helper on input changes.

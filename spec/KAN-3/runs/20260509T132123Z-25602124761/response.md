Implemented shopping profile schema and persistence.

What changed:
- Added a strict JSON Schema for the shopping profile fields: country, currency, garment-class sizes, budget anchors, hard exclusions, per-item ceiling, and enabled retailers.
- Added dependency-free Node helpers to create, read, write, update, normalize, and validate the profile programmatically.
- Added tests proving complete profile shape, persistence across reload, programmatic updates, and invalid value rejection.
- Ignored runtime `data/shopping-profile.json` so local mutable profile state is not accidentally committed.

Verification:
- `node --check src/shopping-profile.mjs`
- `node --check test/shopping-profile.test.mjs`
- `node --test test/shopping-profile.test.mjs`
- JSON parse check for `schemas/shopping-profile.schema.json`

Risk:
- Default profile values are placeholders until shopping tools write the user's real preferences.

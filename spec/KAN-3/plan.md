# KAN-3 Implementation Plan

## Scope

- Add a structured shopping profile schema covering country, currency, sizes per garment class, budget anchors, hard exclusions, per-item price ceiling, and enabled retailers.
- Add dependency-free Node helpers that shopping tools can import to create, read, write, update, and validate the profile.
- Add focused tests proving the profile shape, persistence across reload, programmatic updates, and validation failures.

## Progress

- [x] Read repository conventions and ticket snapshot.
- [x] Confirmed there is no existing shopping assistant runtime to extend.
- [x] Added `schemas/shopping-profile.schema.json`.
- [x] Added `src/shopping-profile.mjs` persistence and normalization helpers.
- [x] Added `test/shopping-profile.test.mjs`.
- [x] Ignored runtime `data/shopping-profile.json` so local mutable profile state is not accidentally committed.
- [x] Preserved schema-supported budget anchor cadence and notes during normalization and persistence.
- [x] Run syntax checks and tests.
- [x] Write Jira-facing response.

## Notes

- The profile defaults to `data/shopping-profile.json` for persistence, and every helper accepts an explicit path for tests or tool-specific storage.
- The schema is intentionally small and strict at the top level while leaving garment class, budget anchor, and retailer identifiers flexible for future tools.
- Budget anchors now retain optional `cadence` and `notes` fields allowed by the schema instead of being reduced to amount/currency only.
- Default profile values are placeholders; shopping tools should write the user's actual country, currency, sizes, budget anchors, exclusions, ceiling, and retailers before relying on the profile for decisions.

## Verification

- `node --check src/shopping-profile.mjs`
- `node --check test/shopping-profile.test.mjs`
- `node --test test/shopping-profile.test.mjs`
- `node -e "JSON.parse(require('node:fs').readFileSync('schemas/shopping-profile.schema.json','utf8')); console.log('schema json ok')"`

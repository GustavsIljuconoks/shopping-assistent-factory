# KAN-35 Implementation Plan

## Scope

- Add a per-retailer proposal card renderer to the Settings Shopping pane.
- Normalize proposal data so each retailer card shows at most 3 candidates and pre-selects the top match when no candidate is already selected.
- Render candidate rows with image, brand, title, size, color, price, one-line reasoning, and an Open product link.
- Render card header selected-count state, footer ETA/return policy, staging CTA, and staged-result state with an Open cart link.
- Add focused unit coverage for proposal grouping, candidate limits, default selection, disabled CTA, and staged-result rendering.

## Progress

- [x] Read repository instructions and ticket snapshot.
- [x] Inspect existing Settings Shopping UI renderer and tests.
- [x] Implement proposal card renderer and supporting styles.
- [x] Add focused unit tests.
- [x] Run validation.
- [x] Write Jira-facing response.

## Validation

- `node --check src/settings-shopping-pane.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --test`
- `git diff --check`

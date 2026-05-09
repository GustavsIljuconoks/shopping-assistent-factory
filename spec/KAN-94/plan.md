# KAN-94 Implementation Plan

## Scope

- Enforce proposal and staging action caps in the existing shopping chat flow.
- Return plain-text cap explanations when staging is blocked.
- Add focused tests for proposal candidate limits and staging cap blocking.

## Steps

- [x] Read ticket artifacts and repository conventions.
- [x] Inspect proposal assembly and Asket/ASOS staging paths.
- [x] Implement action cap state checks in staging wrappers.
- [x] Add focused tests for all three caps and existing staging behavior.
- [x] Run syntax checks and relevant Node tests.

## Notes

- Proposal candidate limiting already exists in the proposal normalization/assembly path; tests will lock the max-3 behavior.
- Added reusable action cap state for conversation and per-retailer 24-hour staging counts.
- Asket and ASOS staging now block before invoking retailer automation when a cap would be exceeded and return a plain-text explanation.
- While touching the staging wrappers, restored existing Asket Feed-item and foreground-on-failure behavior covered by the existing tests.

## Verification

- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs` passed, 24 tests.
- `node --test $(rg --files test -g '*.test.mjs' | rg -v '^test/settings-shopping-pane.test.mjs$')` passed, 140 tests.

## Risks

- Full `node --test test/*.test.mjs` is currently blocked by an unrelated syntax error in `test/settings-shopping-pane.test.mjs` at EOF.
- Action cap state is returned from the staging wrappers; the caller must carry that state across a conversation and persist it for the 24-hour retailer cap.

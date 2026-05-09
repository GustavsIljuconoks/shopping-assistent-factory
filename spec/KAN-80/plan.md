# KAN-80 Implementation Plan

## Scope

- Add a per-retailer staging failure circuit breaker with a 3-failure / 24-hour window.
- Surface discovery-only status in proposal cards and Settings connected retailers.
- Reset retailer state after the 24-hour window or a successful staging recipe test.
- Emit a Feed-compatible item when a retailer first enters discovery-only mode.

## Steps

- [x] Read ticket artifacts and repository conventions.
- [x] Inspect shopping chat, proposal card, Settings, and audit/feed-adjacent code paths.
- [x] Implement the retailer circuit-breaker state helper.
- [x] Wire staging result handling and proposal/settings rendering.
- [x] Add focused tests for counters, reset behavior, feed emission, and UI labels.
- [x] Run syntax checks and relevant Node tests.

## Implementation Notes

- Added `src/retailer-circuit-breaker.mjs` for durable per-retailer circuit-breaker state, 24-hour windows, manual-success reset, discovery-only status checks, and feed item creation/emission.
- Connected Asket and ASOS staging result flows to update the circuit-breaker state when callers provide it.
- Updated Settings proposal cards so discovery-only cards use `Open in [retailer] to add manually` instead of a Stage button.
- Updated connected retailer rendering so discovery-only retailers show `Discovery-only`.

## Verification

- `node --check src/retailer-circuit-breaker.mjs`
- `node --check src/shopping-chat-flow.mjs`
- `node --check src/settings-shopping-pane.mjs`
- `node --check test/retailer-circuit-breaker.test.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --test test/retailer-circuit-breaker.test.mjs test/shopping-chat-flow.test.mjs test/settings-shopping-pane.test.mjs`
- `node --test test/*.test.mjs` passed, 132 tests.

## Risks

- Feed delivery is exposed through an `emitFeedItem` callback because this repository does not currently have a concrete Feed service module.
- The circuit-breaker state boundary is wired into the existing chat staging wrappers for Asket and ASOS; other retailer recipe modules can use the same helper when their staging wrappers are added.

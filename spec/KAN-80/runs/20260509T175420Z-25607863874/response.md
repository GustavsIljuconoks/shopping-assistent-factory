Implemented KAN-80.

What changed:
- Added a per-retailer circuit-breaker state helper with 3 failures / 24 hours, auto-reset after 24 hours, and reset after a successful staging recipe test.
- Wired Asket and ASOS staging wrappers to update circuit-breaker state and emit a Feed-compatible item when a retailer enters discovery-only mode.
- Updated proposal cards to show `Open in [retailer] to add manually` instead of Stage when discovery-only is active.
- Updated Settings -> Shopping connected retailers to show `Discovery-only` status.

Verification:
- Syntax checks passed for affected source and test files.
- `node --test test/retailer-circuit-breaker.test.mjs test/shopping-chat-flow.test.mjs test/settings-shopping-pane.test.mjs` passed.
- `node --test test/*.test.mjs` passed, 132 tests.

Risks:
- Feed emission is implemented via an `emitFeedItem` callback because no concrete Feed service module exists in this repo yet.
- The new circuit-breaker helper is wired into the existing Asket/ASOS chat staging wrappers; additional retailer staging wrappers can use the same helper as they are introduced.

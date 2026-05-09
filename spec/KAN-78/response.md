Implemented Feed item payloads for shopping staging events.

Changes:
- Added `feedItems` to Asket and ASOS staging result objects.
- Successful staging emits `Staged at [Retailer]`.
- Any failed staging result emits `Staging failed at [Retailer]`.
- Added a reusable discovery-only helper that emits `[Retailer] in discovery-only mode` for future circuit-breaker wiring.
- Added focused tests for success, failure, empty staging selections, and discovery-only Feed item shape.

Verification:
- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`

Risk:
- The repo does not yet have a dedicated Feed store or retailer circuit-breaker state machine, so this exposes the Feed entries on staging result payloads and provides the circuit-breaker Feed helper for the caller to render/use.

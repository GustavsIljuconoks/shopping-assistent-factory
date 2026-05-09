Implemented the explicit Asket accept-to-stage flow boundary.

What changed:
- Added `stageSelectedAsketCandidates()` to stage selected Asket candidates only when the caller invokes the explicit stage action.
- Each selected candidate is sent to the existing Asket cart-staging recipe in sequence.
- The Active carts refresh callback runs after each successful staging result.
- Added an Asket staging result-card payload with staged count and an `Open cart on Asket` link.
- Added tests covering sequential staging, successful-stage cart refreshes, and zero-selection behavior that does not touch the cart.

Verification:
- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test test/*.test.mjs`

Risk:
- This repo does not yet include the concrete proposal-card frontend/runtime, so the new boundary is adapter-driven and needs to be wired by that runtime when available.

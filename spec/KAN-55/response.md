Implemented the Zalando.lv search and cart-staging recipe.

What changed:
- Added Zalando.lv visible-browser login/session support with a persistent retailer profile and connection status reads.
- Added Zalando.lv product search with intent normalization, browser/session extraction support, ranking, Shopping-memory de-prioritization, price parsing, and a maximum of 3 candidates.
- Added Zalando.lv cart staging with product navigation, size selection, add-to-cart handling, active-cart recording, and audit-log entries for page read, size select, and cart add.
- Registered the default Zalando.lv cart URL in the active carts strip.
- Fixed a pre-existing missing closure in `shopping-chat-flow.mjs` so the repository test suite can load.

Verification:
- `node --test` passes: 86 tests.

Risk:
- Zalando.lv selectors are broad and localized, but they have not been verified against a live authenticated browser session in this run.

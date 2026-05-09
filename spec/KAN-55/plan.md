# KAN-55 Implementation Plan

## Scope

- Add a Zalando.lv login/session flow using the same persistent visible-browser profile pattern as Asket.
- Add Zalando.lv product search with structured intent normalization, candidate extraction/ranking, and a maximum of 3 candidates.
- Add a Zalando.lv cart-staging recipe that opens a product page, selects size, adds to cart, records active cart state, and logs audit steps.
- Add focused tests for login/session persistence, search/ranking, cart staging, and active cart URL support.

## Progress

- [x] Read repository conventions and ticket snapshot.
- [x] Inspect existing Asket login, search, cart-staging, active cart, and audit patterns.
- [x] Implement Zalando login/session flow.
- [x] Implement Zalando product search.
- [x] Implement Zalando cart-staging recipe.
- [x] Add focused tests.
- [x] Run syntax checks and tests.
- [x] Write Jira-facing response.

## Notes

- This ticket follows the established Asket contract rather than introducing a generic multi-retailer abstraction.
- Zalando selectors are intentionally broad and localized around common English/Latvian/German UI labels because the repo does not include live browser fixtures.
- Fixed a pre-existing missing function closure in `shopping-chat-flow.mjs` so the full test suite can load.

## Verification

- `node --check src/zalando-login-flow.mjs`
- `node --check src/zalando-product-search.mjs`
- `node --check src/zalando-cart-staging-recipe.mjs`
- `node --check src/shopping-chat-flow.mjs`
- `node --check test/zalando-login-flow.test.mjs`
- `node --check test/zalando-product-search.test.mjs`
- `node --check test/zalando-cart-staging-recipe.test.mjs`
- `node --check test/shopping-active-carts-strip.test.mjs`
- `node --test test/zalando-login-flow.test.mjs test/zalando-product-search.test.mjs test/zalando-cart-staging-recipe.test.mjs test/shopping-active-carts-strip.test.mjs`
- `node --test test/zalando-product-search.test.mjs`
- `node --test`

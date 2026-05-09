# KAN-67 Implementation Plan

## Goal

Add H&M.lv browser automation support using the same login, product search, and cart-staging contracts already used by Asket and Zalando.lv.

## Implementation

- [x] Read ticket context and repository automation conventions.
- [x] Add H&M.lv login flow with a visible persistent browser profile and persisted connected status.
- [x] Add H&M.lv product search that builds H&M search URLs, extracts product cards from a visible session, ranks candidates, and returns up to 3 results.
- [x] Add H&M.lv cart staging with size selection, add-to-cart handling, login-expired/out-of-stock outcomes, active-cart tracking, and audit logging.
- [x] Register H&M.lv in shared shopping defaults where needed for settings and active carts.
- [x] Add focused tests covering login, search ranking/extraction, cart staging, audit entries, and active cart rows.

## Validation

- [x] `node --check src/hm-login-flow.mjs && node --check src/hm-product-search.mjs && node --check src/hm-cart-staging-recipe.mjs`
- [x] `node --test test/hm-login-flow.test.mjs test/hm-product-search.test.mjs test/hm-cart-staging-recipe.test.mjs`
- [x] `node --test test/shopping-active-carts-strip.test.mjs test/settings-shopping-pane.test.mjs`
- [x] `node --test`

## Risk

H&M's live DOM may differ by region, login state, cookie banners, or A/B tests. The recipe uses broad Playwright selectors and a session extraction fallback, but live browser verification with a real H&M.lv account remains the main follow-up risk.

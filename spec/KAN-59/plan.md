# KAN-59 implementation plan

## Scope

Deliver About You (aboutyou.lv) automation using the same module contract as Zalando.lv: dedicated login flow, product search with ranking (max 3 candidates), and Playwright-style cart staging that writes shopping audit log entries.

## Decisions

| Area | Choice |
|------|--------|
| Retailer id | `About You` — matches `DEFAULT_RETAILERS` / browser profile slug used in existing tests |
| Login entry | `https://www.aboutyou.lv/jusu-veikals` (shop landing; user completes sign-in in the visible browser chrome) |
| Search | `https://www.aboutyou.lv/c/sievietem-20201?q=…` (Latvian women’s clothing category accepts `q` and returns HTTP 200) |
| Basket | `https://www.aboutyou.lv/basket` (verified 200) |
| Audit | Same `appendShoppingAuditEntry` steps as peers: `page_read`, `size_select`, `cart_add` |

## Files added

- `src/aboutyou-login-flow.mjs`
- `src/aboutyou-product-search.mjs`
- `src/aboutyou-cart-staging-recipe.mjs`
- `test/aboutyou-login-flow.test.mjs`
- `test/aboutyou-product-search.test.mjs`
- `test/aboutyou-cart-staging-recipe.test.mjs`

## Files changed

- `src/shopping-active-carts-strip.mjs` — `RETAILER_CART_URLS["About You"]`
- `test/shopping-active-carts-strip.test.mjs` — default cart URL test for About You

## Verification

- `node --check` on new modules
- `node --test` on new About You tests and affected `shopping-active-carts-strip` tests (pass)

## Risks / follow-ups

- Product-page selectors are heuristic (mirroring Zalando); real PDP markup may require tuning after manual browser runs.
- Search is scoped to the women’s clothing category path; menswear / other hierarchies would need extra mapping if required.
- `test/settings-shopping-pane.test.mjs` reports a pre-existing syntax error when running the full `test/*.mjs` glob; not modified in this ticket.

## Status

Completed: modules, tests, active-carts URL mapping. Chat/UI wiring to select About You as the active retailer (if required) is out of scope for this ticket unless a separate integration point is specified — same pattern as Zalando modules living alongside Asket-only `shopping-chat-flow` staging today.

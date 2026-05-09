Implemented About You (.lv storefront) shopping automation parallel to Asket / Zalando.lv.

**Changes**

- Added `aboutyou-login-flow` (persistent profile `About You`, visible staging run to the shop landing for manual sign-in, session JSON like other retailers).
- Added `aboutyou-product-search`: same intent normalisation, memory-aware ranking, and max three candidates; search uses the Latvian women’s clothing category with a `q` query parameter; optional browser session extraction matches the Zalando pattern.
- Added `aboutyou-cart-staging-recipe`: navigate PDP, size selection, add-to-basket, outcomes (`success`, `out_of_stock`, `login_expired`, `error`), and audit-log steps for `page_read`, `size_select`, and `cart_add`.
- Registered default basket URL for the active-carts strip.

**Why**

Satisfies KAN-59 acceptance criteria: login in visible browser, search returning up to three ranked candidates, cart staging with audit logging, aligned with existing recipe contracts.

**Risks**

- Live About You markup or anti-bot behaviour may require selector or URL adjustments after first real runs.
- Default search path targets women’s clothing only; broader catalogue coverage may need explicit routing later.

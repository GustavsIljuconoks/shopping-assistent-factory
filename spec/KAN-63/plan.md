# KAN-63 implementation plan

## Scope

Implement ASOS using the same retailer module pattern as Asket / Zalando.lv: dedicated login flow, product search (ranked candidates, max 3), and cart-staging recipe with shopping audit log entries.

## Done

1. **`src/asos-login-flow.mjs`** — Visible browser login at `https://www.asos.com/customer/account/login/`, persistent profile key `ASOS`, session status reuse from Asket helpers. After opening the login page, **`notifyIfBrowserChallengeVisible`** runs so Cloudflare-style interstitials surface the standard chat *Waiting…* message without bypassing the challenge.
2. **`src/asos-product-search.mjs`** — Search URL base `https://www.asos.com/search/?q=…`, same ranking/filter contract as Zalando; GBP hint in string price parsing. Cloudflare notify after opening the search page when a browser run is active.
3. **`src/asos-cart-staging-recipe.mjs`** — PDP navigation, size menu/size selection, add-to-bag style selectors, outcomes `success` / `out_of_stock` / `login_expired` / `error`, audit steps `page_read`, `size_select`, `cart_add`. Optional **`browserRun`** + **`notifyIfBrowserChallengeVisible`** after `goto`. Cart URL `https://www.asos.com/basket/`.
4. **`src/automation-browser.mjs`** — Exported **`notifyIfBrowserChallengeVisible`** (DOM/title/host heuristics only; no bypass).
5. **`src/shopping-active-carts-strip.mjs`** — `RETAILER_CART_URLS.ASOS` → basket URL.
6. **`src/shopping-chat-flow.mjs`** — **`stageSelectedAsosCandidates`**, **`renderAsosStagingResultCard`**, **`ASOS_CART_URL`** (Asket-equivalent staging entry points).
7. **Tests** — `test/asos-*.test.mjs`, chat-flow + active-carts + automation coverage; fixed accidental duplicate `test(` in `test/settings-shopping-pane.test.mjs` (syntax error).

## Risks / follow-ups

- **Selectors**: ASOS markup changes often; Playwright selectors are best-effort and may need tuning against production.
- **Currency**: Listing currency vs profile ceiling (e.g. GBP site vs EUR profile) can filter out candidates until locale/currency alignment exists.
- **Anti-bot**: Higher block rate than other retailers; users rely on visible browser + Waiting message; no automated circumvention.

## Verification

- `node --check` on changed sources as needed.
- `node --test test/*.mjs` — full suite green.

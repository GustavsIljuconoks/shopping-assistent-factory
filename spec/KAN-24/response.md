Implemented the Asket cart-staging recipe.

What changed:
- Added `stageAsketCartItem()` in `src/asket-cart-staging-recipe.mjs` for programmatic use with a Playwright-compatible `page`.
- The recipe accepts either `productUrl` or `productId`, selects the requested size, attempts to add to cart, and returns `success`, `out_of_stock`, `login_expired`, or `error`.
- Navigation, size selection, and cart-add steps are written to the shopping audit log.
- Added `size_select` to the audit action schema so size selection is represented directly.
- Added tests for success, out-of-stock text, disabled add-to-cart out-of-stock, login-expired, and missing-control error handling.

Validation:
- `node --test` passed.
- `git diff --check` passed.

Risks:
- The module uses robust default selectors plus injectable selector overrides; final selector tuning may still be needed against the live Asket site once the real browser/session integration is wired.

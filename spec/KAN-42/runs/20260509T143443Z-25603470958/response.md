Implemented the active carts strip boundary.

What changed:
- Added `shopping-active-carts-strip` helpers to track staged items by retailer, render a slim sticky chat strip, publish/show/clear it through chat adapters, and open retailer cart URLs through the user's default browser.
- Hooked successful Asket cart staging into the active-carts state so Asket rows include item count, last-staged time, and the Asket cart URL. Failed staging results do not add strip rows.
- Added tests for grouping, rendering, clear behavior, default-browser opener injection, time labels, and Asket staging integration.

Verification:
- `node --check src/shopping-active-carts-strip.mjs`
- `node --check src/asket-cart-staging-recipe.mjs`
- `node --check test/shopping-active-carts-strip.test.mjs`
- `node --check test/asket-cart-staging-recipe.test.mjs`
- `node --test test/shopping-active-carts-strip.test.mjs test/asket-cart-staging-recipe.test.mjs`
- `node --test test/*.test.mjs`

Risk:
- The repo still uses adapter-style chat boundaries, so the production chat shell needs to mount `setActiveCartsStrip`/`showActiveCartsStrip`/`clearActiveCartsStrip` at the top of the chat.

## Summary

Implemented the **ASOS** retailer slice to match the existing recipe contract: **login flow**, **product search** (up to three ranked candidates), and **cart staging** with **audit log** entries (`page_read`, `size_select`, `cart_add`). Wired **default basket URL** for active carts and **chat staging helpers** (`stageSelectedAsosCandidates` / result card) alongside Asket.

## Cloudflare / challenges

Added **`notifyIfBrowserChallengeVisible`** in the automation layer. It detects common challenge-page signals in the page context and calls the existing **`waitForUserAction`** path so the **visible browser** shows the challenge and the chat shows the standard **Waiting…** message. This does **not** bypass or solve challenges.

## Other fixes

- **`test/settings-shopping-pane.test.mjs`**: removed a duplicated/orphan `test(` that broke the file parse (unrelated to ASOS behaviour but blocked the test suite).

## Risks

- **Selectors** for ASOS PDP/search may drift with site changes and need validation on the live site.
- **ASOS** is higher **anti-bot** risk; flows may stop on challenges or blocks even with correct selectors.

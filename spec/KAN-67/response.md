Implemented H&M.lv support for the existing shopping recipe contract.

What changed:
- Added H&M.lv login flow using a visible persistent browser profile.
- Added H&M.lv product search with normalized intent handling, H&M search URL generation, browser extraction fallback, ranking, and max-3 candidate output.
- Added H&M.lv cart staging with size selection, add-to-cart handling, audit logging, active cart updates, and `success` / `out_of_stock` / `login_expired` / `error` statuses.
- Registered H&M.lv in shared settings/default cart URL support.
- Added focused tests for H&M.lv login, search, and cart staging.

Validation:
- `node --test` passes.

Risk:
- Live H&M.lv selectors can vary by region, login state, cookie banners, or experiments. The implementation uses broad selectors, but a real-account visible-browser smoke test is still recommended before relying on it operationally.

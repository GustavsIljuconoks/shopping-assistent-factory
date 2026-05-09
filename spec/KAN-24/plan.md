# KAN-24 Implementation Plan

## Scope

- Add a programmatic Asket cart-staging recipe that accepts a Playwright-compatible page, product URL or product ID, and requested size.
- Record navigation, size selection, and cart-add actions to the shopping audit log.
- Return structured outcomes: `success`, `out_of_stock`, `login_expired`, or `error`.
- Keep the implementation dependency-free and testable through injectable Playwright-like adapters.

## Progress

- [x] Read repository instructions and ticket snapshot.
- [x] Inspect existing audit log and automation browser boundaries.
- [x] Add a narrow audit action type for size selection.
- [x] Implement the Asket cart-staging recipe.
- [x] Add focused unit tests for success, out-of-stock, disabled-add out-of-stock, login-expired, and missing-control error handling.
- [x] Run validation.
- [x] Write Jira-facing response.

## Validation

- `node --check src/asket-cart-staging-recipe.mjs`
- `node --check test/asket-cart-staging-recipe.test.mjs`
- `node --test`
- `git diff --check`

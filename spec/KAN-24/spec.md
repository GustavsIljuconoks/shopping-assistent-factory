# KAN-24: Asket: cart-staging recipe

Generated from Jira on 2026-05-09T14:23:02.305Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-24 |
| Title | Asket: cart-staging recipe |
| Type | Task |
| Status | Done |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-b0123f988245 |
| Components | - |
| Created | 2026-05-09T16:12:20.928+0300 |
| Updated | 2026-05-09T17:14:47.764+0300 |

## Description

Write the Playwright recipe that adds a specific product (by URL or product ID, in a given size) to the Asket cart. Recipe must log every action to the audit log and handle basic errors (out of stock, login expired).

### Acceptance Criteria

- Recipe navigates to the product page and selects the requested size.
- Recipe adds the item to the Asket cart.
- Recipe logs each step to the audit log.
- Recipe returns a structured result: success | out_of_stock | login_expired | error.
- Can be invoked programmatically without a chat context.

### Source Reference

- Milestones (capability-by-capability)
- v1 scope (locked)

### Dependencies

- Asket: login flow and session management

Suggested priority: high

Estimated complexity: large

## Comments (1)

### GustavsIljuconoks on 2026-05-09T17:14:13.866+0300

[TDF-bot] Codex processed KAN-24 (conclusion: success).

Branch: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-24](https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-24)

Pull request: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/10](https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/10)

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

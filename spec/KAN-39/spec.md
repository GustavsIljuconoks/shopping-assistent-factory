# KAN-39: Accept → stage flow (Asket)

Generated from Jira on 2026-05-09T14:43:48.027Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-39 |
| Title | Accept → stage flow (Asket) |
| Type | Task |
| Status | Done |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-e467bd83b8ba |
| Components | - |
| Created | 2026-05-09T16:12:37.129+0300 |
| Updated | 2026-05-09T17:39:03.987+0300 |

## Description

When the user clicks 'Stage selected → Asket cart', invoke the Asket staging recipe for each selected candidate. Staging must only begin after explicit user click; nothing touches the cart before Accept.

### Acceptance Criteria

- Cart is not touched until the user explicitly clicks Stage selected.
- Each selected candidate is staged in sequence.
- The Active carts strip updates after each successful staging.
- A result card shows: staged count and Open cart on Asket link.

### Source Reference

- S-Shop-1 — Describe an item, get candidates staged in cart
- Safety promises (in plain language)

### Dependencies

- Asket: cart-staging recipe
- Per-retailer proposal card UI

Suggested priority: high

Estimated complexity: medium

## Comments (1)

### GustavsIljuconoks on 2026-05-09T17:31:46.953+0300

[TDF-bot] Codex processed KAN-39 (conclusion: success).

Branch: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-39](https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-39)

Pull request: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/15](https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/15)

Implemented the explicit Asket accept-to-stage flow boundary.

What changed:
- Added `stageSelectedAsketCandidates()` to stage selected Asket candidates only when the caller invokes the explicit stage action.
- Each selected candidate is sent to the existing Asket cart-staging recipe in sequence.
- The Active carts refresh callback runs after each successful staging result.
- Added an Asket staging result-card payload with staged count and an `Open cart on Asket` link.
- Added tests covering sequential staging, successful-stage cart refreshes, and zero-selection behavior that does not touch the cart.

Verification:
- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test test/*.test.mjs`

Risk:
- This repo does not yet include the concrete proposal-card frontend/runtime, so the new boundary is adapter-driven and needs to be wired by that runtime when available.

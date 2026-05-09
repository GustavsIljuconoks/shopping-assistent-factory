# KAN-39: Accept → stage flow (Asket)

Generated from Jira on 2026-05-09T14:28:42.468Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-39 |
| Title | Accept → stage flow (Asket) |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-e467bd83b8ba |
| Components | - |
| Created | 2026-05-09T16:12:37.129+0300 |
| Updated | 2026-05-09T16:12:37.273+0300 |

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

## Comments (0)

_No comments._

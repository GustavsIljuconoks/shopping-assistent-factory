# KAN-24: Asket: cart-staging recipe

Generated from Jira on 2026-05-09T14:09:40.823Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-24 |
| Title | Asket: cart-staging recipe |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-b0123f988245 |
| Components | - |
| Created | 2026-05-09T16:12:20.928+0300 |
| Updated | 2026-05-09T16:12:21.146+0300 |

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

## Comments (0)

_No comments._

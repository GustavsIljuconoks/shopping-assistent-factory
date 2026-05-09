# KAN-55: Zalando.lv: search and cart-staging recipe

Generated from Jira on 2026-05-09T14:58:07.679Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-55 |
| Title | Zalando.lv: search and cart-staging recipe |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-b37197a9a7c4 |
| Components | - |
| Created | 2026-05-09T16:12:54.775+0300 |
| Updated | 2026-05-09T16:12:54.882+0300 |

## Description

Implement product search and cart-staging browser automation for Zalando.lv. Covers login/session management, product search, candidate extraction, and add-to-cart. Follows the same recipe contract as Asket.

### Acceptance Criteria

- User can log in to Zalando.lv in the visible browser.
- Search returns up to 3 ranked candidates.
- Cart-staging recipe adds selected items to the Zalando.lv cart.
- All actions logged to audit log.

### Source Reference

- v1 scope (locked)

### Dependencies

- Asket: cart-staging recipe

Suggested priority: medium

Estimated complexity: large

## Comments (0)

_No comments._

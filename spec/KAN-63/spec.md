# KAN-63: Asos: search and cart-staging recipe

Generated from Jira on 2026-05-09T16:14:04.149Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-63 |
| Title | Asos: search and cart-staging recipe |
| Type | Task |
| Status | In Progress |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-b2497f161d91 |
| Components | - |
| Created | 2026-05-09T16:13:03.341+0300 |
| Updated | 2026-05-09T18:08:12.391+0300 |

## Description

Implement product search and cart-staging browser automation for Asos. Same recipe contract. Asos is explicitly flagged as higher anti-bot risk; the recipe must handle Cloudflare challenges gracefully (surface to user, do not bypass).

### Acceptance Criteria

- User can log in to Asos in the visible browser.
- Search returns up to 3 ranked candidates.
- Cart-staging recipe adds selected items to the Asos cart.
- Cloudflare or other challenge surfaces to user in the visible browser; chat shows waiting message.
- All actions logged to audit log.

### Source Reference

- v1 scope (locked)
- S-Shop-4 — Graceful retailer failure

### Dependencies

- Asket: cart-staging recipe

Suggested priority: medium

Estimated complexity: large

## Comments (0)

_No comments._

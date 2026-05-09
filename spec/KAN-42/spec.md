# KAN-42: Active carts strip (in-chat)

Generated from Jira on 2026-05-09T14:34:43.776Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-42 |
| Title | Active carts strip (in-chat) |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-eb6e47da6ba4 |
| Components | - |
| Created | 2026-05-09T16:12:40.721+0300 |
| Updated | 2026-05-09T16:12:40.808+0300 |

## Description

Build the slim sticky strip at the top of any chat that has staged items. One row per retailer: item count, last-staged time, and Open cart link that opens the retailer's checkout in the user's normal browser.

### Acceptance Criteria

- Strip appears at top of chat when at least one item has been staged.
- One row per retailer with items staged.
- Each row shows: retailer name, staged item count, last-staged time, Open cart link.
- Open cart link opens the retailer's cart page in the user's default browser (not the automation browser).
- Strip disappears if all staged items are cleared.

### Source Reference

- Where shopping lives in the app

### Dependencies

- Accept → stage flow (Asket)

Suggested priority: high

Estimated complexity: medium

## Comments (0)

_No comments._

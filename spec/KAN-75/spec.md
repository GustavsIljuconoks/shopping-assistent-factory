# KAN-75: Failure card UI

Generated from Jira on 2026-05-09T16:19:02.701Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-75 |
| Title | Failure card UI |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-ce73bb99982d |
| Components | - |
| Created | 2026-05-09T16:13:15.994+0300 |
| Updated | 2026-05-09T16:13:16.149+0300 |

## Description

When a staging attempt fails, replace the proposal card with a failure card explaining the error in plain English ('Staging blocked by Asos — anti-bot challenge', 'Item out of stock', 'Login expired', 'Site error'). The visible browser foregrounds on the relevant page so the user can finish manually.

### Acceptance Criteria

- Failure card replaces the proposal card on staging failure.
- Failure card shows a plain-English explanation of the error type.
- The visible browser foregrounds on the retailer's page when a staging failure occurs.
- Failure card includes an 'Open in [retailer] to complete manually' link.

### Source Reference

- S-Shop-4 — Graceful retailer failure
- When things go wrong

### Dependencies

- Per-retailer proposal card UI
- Accept → stage flow (Asket)

Suggested priority: medium

Estimated complexity: medium

## Comments (0)

_No comments._

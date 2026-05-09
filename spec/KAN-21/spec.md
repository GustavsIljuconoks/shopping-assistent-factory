# KAN-21: Asket: login flow and session management

Generated from Jira on 2026-05-09T14:04:45.968Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-21 |
| Title | Asket: login flow and session management |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-e2ad98d2feab |
| Components | - |
| Created | 2026-05-09T16:12:17.322+0300 |
| Updated | 2026-05-09T16:12:17.604+0300 |

## Description

Implement the one-time login flow for Asket: open the visible browser to Asket's login page, wait for the user to authenticate, then persist the session. Show Connected status in Settings → Shopping → Connected retailers.

### Acceptance Criteria

- User can log in to Asket in the visible browser.
- Session is persisted after login.
- Settings → Shopping → Connected retailers shows 'Connected' for Asket after login.
- Session survives app restart.

### Source Reference

- Safety promises (in plain language)
- S-Shop-5 — Visibility into what was done

### Dependencies

- Visible automation browser: launch, foreground, background

Suggested priority: high

Estimated complexity: medium

## Comments (0)

_No comments._

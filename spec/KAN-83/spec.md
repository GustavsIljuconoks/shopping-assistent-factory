# KAN-83: Settings → Privacy → Shopping activity audit pane: populated

Generated from Jira on 2026-05-09T16:22:12.515Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-83 |
| Title | Settings → Privacy → Shopping activity audit pane: populated |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-9e40efbc6bfb |
| Components | - |
| Created | 2026-05-09T16:13:25.300+0300 |
| Updated | 2026-05-09T16:13:25.451+0300 |

## Description

Populate the audit pane with real entries from the audit log. Each entry shows: action type, retailer, timestamp, status, and an optional debug screenshot link when something failed.

### Acceptance Criteria

- Audit pane shows all logged shopping actions in reverse-chronological order.
- Each entry shows: action type, retailer, timestamp, status.
- Failed entries include a link to the optional debug screenshot if one was captured.
- Pane updates in real time during a staging run.

### Source Reference

- S-Shop-5 — Visibility into what was done

### Dependencies

- Shopping audit log schema and persistence
- Settings → Privacy → Shopping activity pane (empty shell)

Suggested priority: medium

Estimated complexity: medium

## Comments (0)

_No comments._

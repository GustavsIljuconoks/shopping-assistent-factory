# KAN-2: M-A — Foundations

Generated from Jira on 2026-05-09T13:18:17.654Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-2 |
| Title | M-A — Foundations |
| Type | Epic |
| Status | To Do |
| Priority | Medium |
| Assignee | GustavsIljuconoks |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-27b2811d6052 |
| Components | - |
| Created | 2026-05-09T16:11:55.381+0300 |
| Updated | 2026-05-09T16:15:32.639+0300 |

## Description

All new internal plumbing for the Shopping module exists but nothing is user-visible yet. Empty Settings panes are wired up and visible.

### Acceptance Criteria

- Profile schema covers all hard-constraint fields from the spec (country, currency, sizes, budget anchors, exclusions, ceiling, retailer list).
- Profile survives app restart.
- Profile fields can be read and written programmatically by the shopping tools.
- Audit log captures: action type, retailer, timestamp, status, optional screenshot path.
- Entries are appended without blocking the main flow.
- Log survives app restart.
- Settings → Shopping pane is visible and navigable.
- No errors when profile data is absent.

### Source Reference

- Milestones (capability-by-capability)

### Dependencies

None

Suggested priority: medium

Estimated complexity: large

## Comments (0)

_No comments._

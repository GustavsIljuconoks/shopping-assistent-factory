# KAN-80: Per-retailer circuit breaker (discovery-only mode)

Generated from Jira on 2026-05-09T16:21:57.658Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-80 |
| Title | Per-retailer circuit breaker (discovery-only mode) |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-ed0cef3b146f |
| Components | - |
| Created | 2026-05-09T16:13:22.014+0300 |
| Updated | 2026-05-09T16:13:22.237+0300 |

## Description

A retailer that fails staging 3 times in 24 hours drops to discovery-only mode: it still finds items but offers 'Open in [retailer] to add manually' instead of a Stage button. Auto-re-arms after 24 hours or after a successful manual recipe test.

### Acceptance Criteria

- Failure counter increments per retailer per 24-hour window.
- After 3 failures, retailer drops to discovery-only mode.
- In discovery-only mode, proposal cards show 'Open in [retailer] to add manually' instead of Stage.
- Discovery-only status is shown in Settings → Shopping → Connected retailers.
- Counter resets after 24 hours or after a successful manual staging test.
- A Feed item is emitted when a retailer enters discovery-only mode.

### Source Reference

- S-Shop-4 — Graceful retailer failure
- When things go wrong

### Dependencies

- Failure card UI
- Feed items for shopping events

Suggested priority: medium

Estimated complexity: medium

## Comments (0)

_No comments._

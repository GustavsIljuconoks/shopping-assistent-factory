# KAN-78: Feed items for shopping events

Generated from Jira on 2026-05-09T16:21:42.530Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-78 |
| Title | Feed items for shopping events |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-35b8809f9322 |
| Components | - |
| Created | 2026-05-09T16:13:19.548+0300 |
| Updated | 2026-05-09T16:13:19.735+0300 |

## Description

Emit Feed entries for: 'Staged at [Retailer]', 'Staging failed at [Retailer]', '[Retailer] in discovery-only mode'.

### Acceptance Criteria

- A 'Staged at [Retailer]' Feed item appears after successful staging.
- A 'Staging failed at [Retailer]' Feed item appears after a staging failure.
- A '[Retailer] in discovery-only mode' Feed item appears when a retailer trips the circuit breaker.

### Source Reference

- Where shopping lives in the app
- S-Shop-4 — Graceful retailer failure

### Dependencies

- Accept → stage flow (Asket)
- Failure card UI

Suggested priority: medium

Estimated complexity: small

## Comments (0)

_No comments._

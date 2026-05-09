# KAN-6: Shopping audit log schema and persistence

Generated from Jira on 2026-05-09T13:41:22.974Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-6 |
| Title | Shopping audit log schema and persistence |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-7d6b5d3c7e3f |
| Components | - |
| Created | 2026-05-09T16:12:00.834+0300 |
| Updated | 2026-05-09T16:12:00.944+0300 |

## Description

Design and implement the audit log that records every action Bestfriend takes on a retailer account: searches, page reads, cart adds, cart peeks, with timestamps, status, and optional debug screenshot path.

### Acceptance Criteria

- Audit log captures: action type, retailer, timestamp, status, optional screenshot path.
- Entries are appended without blocking the main flow.
- Log survives app restart.

### Source Reference

- S-Shop-5 — Visibility into what was done

### Dependencies

None

Suggested priority: high

Estimated complexity: small

## Comments (0)

_No comments._

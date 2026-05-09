# KAN-96: Wipe all data: shopping data extension

Generated from Jira on 2026-05-09T18:38:00.527Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-96 |
| Title | Wipe all data: shopping data extension |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-2e87bc352d4c |
| Components | - |
| Created | 2026-05-09T16:13:38.048+0300 |
| Updated | 2026-05-09T16:13:38.152+0300 |

## Description

Extend the existing Wipe all data flow to also wipe all shopping-related data: profile, staged carts, recipe activity, retailer sessions, shopping memories, shopping conversation context.

### Acceptance Criteria

- Wipe all data removes: shopping profile, staged cart state, recipe/audit activity, all retailer sessions and profiles, shopping memories, shopping conversation context.
- Non-shopping data is unaffected.
- Settings → Shopping and the audit pane show empty state after wipe.

### Source Reference

- S-Shop-5 — Visibility into what was done
- Safety promises (in plain language)

### Dependencies

- Shopping profile schema and persistence
- Shopping audit log schema and persistence
- Shopping memories (soft taste accumulation)
- Isolated per-retailer browser profile management

Suggested priority: high

Estimated complexity: medium

## Comments (0)

_No comments._

# KAN-92: Per-item ceiling type-to-confirm (above €500)

Generated from Jira on 2026-05-09T18:26:46.115Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-92 |
| Title | Per-item ceiling type-to-confirm (above €500) |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-78f91bcbe6ee |
| Components | - |
| Created | 2026-05-09T16:13:33.845+0300 |
| Updated | 2026-05-09T16:13:33.958+0300 |

## Description

When any candidate in a proposal exceeds the per-item price ceiling (default €500), the Stage button is replaced with a type-to-confirm gate: the user must type the literal word 'stage' in chat to proceed. Clicking is not sufficient.

### Acceptance Criteria

- Proposals with any item above the ceiling show a type-to-confirm prompt instead of the normal Stage button.
- User must type the literal word 'stage' in chat to confirm.
- Staging only proceeds after the correct word is entered.
- The ceiling is configurable in Settings → Shopping (default €500).

### Source Reference

- Safety promises (in plain language)
- What you see and accept (the proposal card)

### Dependencies

- Per-retailer proposal card UI
- Accept → stage flow (Asket)

Suggested priority: high

Estimated complexity: medium

## Comments (0)

_No comments._

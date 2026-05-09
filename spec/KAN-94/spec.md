# KAN-94: Action caps enforcement

Generated from Jira on 2026-05-09T18:31:34.126Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-94 |
| Title | Action caps enforcement |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-39c128cca7da |
| Components | - |
| Created | 2026-05-09T16:13:36.288+0300 |
| Updated | 2026-05-09T16:13:36.377+0300 |

## Description

Enforce the three action caps: max 3 candidates per retailer per proposal, max 6 staging actions per conversation, max 10 staging actions per retailer per 24 hours. Surface cap violations to the user in plain text.

### Acceptance Criteria

- No more than 3 candidates are shown per retailer in any proposal.
- Staging is blocked after 6 total staging actions in a conversation.
- Staging is blocked for a retailer after 10 staging actions in 24 hours.
- When a cap is reached, the user sees a plain-text explanation.

### Source Reference

- Safety promises (in plain language)

### Dependencies

- Accept → stage flow (Asket)
- Multi-retailer parallel search and proposal assembly

Suggested priority: high

Estimated complexity: medium

## Comments (0)

_No comments._

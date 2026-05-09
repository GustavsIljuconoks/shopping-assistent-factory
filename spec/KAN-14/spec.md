# KAN-14: Isolated per-retailer browser profile management

Generated from Jira on 2026-05-09T13:52:58.899Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-14 |
| Title | Isolated per-retailer browser profile management |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-2ec2b8b64b06 |
| Components | - |
| Created | 2026-05-09T16:12:09.958+0300 |
| Updated | 2026-05-09T16:12:10.048+0300 |

## Description

Implement the system for creating and maintaining isolated browser profiles, one per enabled retailer. Sessions must never cross-contaminate. Each profile is keyed by retailer identifier.

### Acceptance Criteria

- Each retailer has a unique profile directory.
- Profiles are isolated — cookies and session data do not leak between retailers.
- Profiles persist across app restarts.
- Per-retailer Disconnect removes the profile and its session data.

### Source Reference

- S-Shop-7 — Automation browser feels intentional, not creepy
- Safety promises (in plain language)

### Dependencies

None

Suggested priority: high

Estimated complexity: medium

## Comments (0)

_No comments._

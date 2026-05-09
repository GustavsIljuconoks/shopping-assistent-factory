# KAN-17: Visible automation browser: launch, foreground, background

Generated from Jira on 2026-05-09T13:56:13.806Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-17 |
| Title | Visible automation browser: launch, foreground, background |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-d3d711bcad51 |
| Components | - |
| Created | 2026-05-09T16:12:12.923+0300 |
| Updated | 2026-05-09T16:12:13.076+0300 |

## Description

Build the visible automation browser wrapper: launch with a distinct window title (e.g. 'Bestfriend · Asket'), foreground during staging runs, return to background when done or stay foreground when user action is needed. Add headless power-user toggle.

### Acceptance Criteria

- Browser window title is 'Bestfriend · [Retailer]' during a run.
- Browser foregrounds when staging starts.
- Browser backgrounds automatically when run completes successfully.
- Browser stays foreground (and chat shows 'Waiting…') when a CAPTCHA or challenge is encountered.
- A headless toggle suppresses foregrounding.

### Source Reference

- S-Shop-7 — Automation browser feels intentional, not creepy

### Dependencies

- Isolated per-retailer browser profile management

Suggested priority: high

Estimated complexity: medium

## Comments (0)

_No comments._

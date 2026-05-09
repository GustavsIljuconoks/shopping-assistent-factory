# KAN-98: Anti-bot challenge: user-handoff UX

Generated from Jira on 2026-05-09T18:41:49.277Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-98 |
| Title | Anti-bot challenge: user-handoff UX |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-8d8d505452aa |
| Components | - |
| Created | 2026-05-09T16:13:40.327+0300 |
| Updated | 2026-05-09T16:13:40.476+0300 |

## Description

When a CAPTCHA or anti-bot challenge is detected during a staging run, the chat must show 'Waiting for you to confirm in [Retailer] window…' and the run must pause. Resume automatically when the user dismisses the challenge in the visible browser and returns focus.

### Acceptance Criteria

- Chat displays a waiting message with the retailer name when a challenge is detected.
- Staging run is paused until the challenge is resolved.
- Run resumes automatically after the user dismisses the challenge.
- If the user does not resolve the challenge, the run eventually times out and emits a failure card.

### Source Reference

- Anti-bot challenges (CAPTCHAs etc.)

### Dependencies

- Failure card UI

Suggested priority: medium

Estimated complexity: medium

## Comments (0)

_No comments._

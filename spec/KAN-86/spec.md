# KAN-86: Shopping intent classifier for Inbox

Generated from Jira on 2026-05-09T18:19:32.593Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-86 |
| Title | Shopping intent classifier for Inbox |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-858b066572d7 |
| Components | - |
| Created | 2026-05-09T16:13:28.221+0300 |
| Updated | 2026-05-09T16:13:28.445+0300 |

## Description

Extend the Inbox triage classifier to detect buying intent ('buy X', 'I need Y', 'find me Z'). When detected, the suggested triage action should be 'Shop'.

### Acceptance Criteria

- Classifier correctly labels quick-captures with buying intent as 'Shop' suggestion.
- Non-shopping captures are not incorrectly labeled.
- Classifier handles the typical EU/clothing vocabulary from the spec.

### Source Reference

- S-Shop-2 — Quick-capture a buying intent
- Where shopping lives in the app

### Dependencies

None

Suggested priority: medium

Estimated complexity: medium

## Comments (0)

_No comments._

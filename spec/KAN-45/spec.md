# KAN-45: Lazy bootstrap on first shopping chat

Generated from Jira on 2026-05-09T14:38:56.496Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-45 |
| Title | Lazy bootstrap on first shopping chat |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-37d4d965f5a9 |
| Components | - |
| Created | 2026-05-09T16:12:43.570+0300 |
| Updated | 2026-05-09T16:12:43.660+0300 |

## Description

On the first shopping chat, the agent asks for the missing basics inline (country, top size, shoe size EU, rough budget feel). Each hard fact is confirmed with a one-tap confirmation card the first time it is set. Future chats skip already-known fields and ask only for what is new (e.g. dress size only on a first dress request).

### Acceptance Criteria

- First shopping chat triggers inline profile questions for missing fields.
- Agent asks only for fields not already on file.
- Each newly-set field is confirmed with a one-tap card.
- Fields are persisted to the shopping profile after confirmation.
- Subsequent chats skip already-confirmed fields.

### Source Reference

- S-Shop-3 — First-time bootstrap (no upfront form)
- What Bestfriend remembers about you

### Dependencies

- Shopping profile schema and persistence
- Shopping intent detection and clarification flow in chat

Suggested priority: medium

Estimated complexity: medium

## Comments (0)

_No comments._

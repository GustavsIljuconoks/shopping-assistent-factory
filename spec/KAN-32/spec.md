# KAN-32: Shopping intent detection and clarification flow in chat

Generated from Jira on 2026-05-09T14:19:03.047Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-32 |
| Title | Shopping intent detection and clarification flow in chat |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-146d8578fa86 |
| Components | - |
| Created | 2026-05-09T16:12:29.114+0300 |
| Updated | 2026-05-09T16:12:29.245+0300 |

## Description

Implement the chat-level flow: detect shopping intent, ask clarifying questions when the request is underspecified (garment class, size, price ceiling unknown), then dispatch the search tool. Do not emit a proposal until enough context is known.

### Acceptance Criteria

- Agent detects shopping intent in a message.
- If garment class or size is unknown, agent asks before searching.
- If price ceiling is not stated, agent uses the profile budget anchor or asks.
- Agent does not emit a proposal card if confidence is low; it states so in plain text.
- Agent dispatches the search tool and renders the proposal card when context is sufficient.

### Source Reference

- S-Shop-1 — Describe an item, get candidates staged in cart
- What you see and accept (the proposal card)

### Dependencies

- Shopping profile schema and persistence
- Asket: product search tool

Suggested priority: high

Estimated complexity: large

## Comments (0)

_No comments._

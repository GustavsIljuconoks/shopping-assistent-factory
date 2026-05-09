# KAN-32: Shopping intent detection and clarification flow in chat

Generated from Jira on 2026-05-09T14:33:13.919Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-32 |
| Title | Shopping intent detection and clarification flow in chat |
| Type | Task |
| Status | Done |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-146d8578fa86 |
| Components | - |
| Created | 2026-05-09T16:12:29.114+0300 |
| Updated | 2026-05-09T17:26:12.873+0300 |

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

## Comments (1)

### GustavsIljuconoks on 2026-05-09T17:22:48.813+0300

[TDF-bot] Codex processed KAN-32 (conclusion: success).

Branch: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-32](https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-32)

Pull request: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/12](https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/12)

Implemented the chat-level shopping clarification boundary.

- Added `src/shopping-chat-flow.mjs` to detect shopping intent, resolve garment class, size, and price ceiling, ask clarifying questions before search when context is missing, dispatch an injected search tool only when context is sufficient, and render an injected proposal card only for confident results.
- Added tests covering shopping intent detection, missing garment class, missing size, missing price ceiling, profile size/budget fallback, search dispatch, proposal rendering, and low-confidence plain-text behavior.

Verification:
- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test`

Risk:
- The repo does not yet include the concrete chat runtime or Asket product search tool, so this adds the behavior boundary with injectable adapters for later wiring.

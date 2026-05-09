# KAN-32 Implementation Plan

## Scope

- Add a dependency-free chat shopping flow boundary that detects shopping intent from a user message.
- Clarify before searching when garment class, size, or price ceiling cannot be resolved.
- Resolve size and budget from explicit text first, then shopping profile anchors where available.
- Dispatch an injected search tool only once enough context is known.
- Render an injected proposal card only for confident search results; otherwise respond in plain text.

## Progress

- [x] Read repository conventions and ticket snapshot.
- [x] Inspect existing shopping profile, audit, automation, and Asket recipe modules.
- [x] Implement the chat-level shopping intent and clarification flow.
- [x] Add focused unit tests for clarification, profile fallback, search dispatch, and low-confidence behavior.
- [x] Run validation.
- [x] Write Jira-facing response.

## Notes

- The repository does not yet include a concrete chat runtime or Asket product search tool, so this ticket will add a small injectable orchestration boundary that can be wired to those integrations later.

## Verification

- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test`

# KAN-86 Implementation Plan

## Scope

- Add an Inbox quick-capture triage classifier boundary that can suggest `Shop`.
- Reuse the existing shopping intent detector so Inbox and chat use the same vocabulary.
- Broaden clothing vocabulary only where needed for typical EU clothing captures.
- Add focused tests for buying intent and non-shopping captures.

## Progress

- [x] Read repository conventions and ticket snapshot.
- [x] Inspect existing shopping intent and adjacent tests.
- [x] Implement Inbox triage classifier.
- [x] Add focused classifier tests.
- [x] Run validation.
- [x] Write Jira-facing response.

## Notes

- The repo does not currently have a standalone Inbox module, so this ticket adds a small dependency-free classifier module that later Inbox UI/runtime code can call.
- The classifier reuses the existing shopping detector first, then applies an Inbox-specific EU/clothing vocabulary fallback for quick-capture phrases such as `Need new trainers EU 42`.

## Verification

- `node --check src/inbox-triage-classifier.mjs`
- `node --check test/inbox-triage-classifier.test.mjs`
- `node --test test/inbox-triage-classifier.test.mjs`

## Risks

- No concrete Inbox runtime exists in this repository yet, so this adds the callable classifier boundary and tests rather than wiring a UI event path.
- A broader run of `node --test test/inbox-triage-classifier.test.mjs test/shopping-chat-flow.test.mjs` still shows two pre-existing staging-related failures in `test/shopping-chat-flow.test.mjs`; the focused KAN-86 tests pass.

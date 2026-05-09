# KAN-45 Implementation Plan

## Scope

- Extend the shopping chat flow with a lazy bootstrap sequence for missing profile basics: country, tops size, EU shoe size, and default rough budget.
- Ask only for fields that are not already present in the shopping profile.
- Emit a one-tap confirmation card when a pending profile answer is captured.
- Persist confirmed profile fields through the shopping profile persistence helper.
- Keep the existing search/proposal path intact once required profile data is known.

## Progress

- [x] Read repository instructions and KAN-45 ticket snapshot.
- [x] Inspect existing shopping chat flow, profile persistence, and tests.
- [x] Implement lazy bootstrap and confirmation handling.
- [x] Add focused unit tests.
- [x] Run validation.
- [x] Write Jira-facing response.

## Validation

- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test test/*.test.mjs`
- `git diff --check`

# KAN-48 Implementation Plan

## Scope

- Extend the persisted shopping profile with normalized memories.
- Store captured shopping outcome feedback with a `Shopping` tag.
- Render Settings memory entries with a Shopping filter and per-memory edit, pin, and wipe controls.
- Add helpers to clear only shopping-tagged memories.
- Use negative shopping memories as a soft ranking penalty for future Asket product search results.

## Progress

- [x] Read repository conventions and ticket snapshot.
- [x] Inspect existing shopping profile, Settings, chat, staging, and search modules.
- [x] Add shopping memory persistence helpers.
- [x] Add Settings memory rendering.
- [x] Add memory-aware Asket ranking.
- [x] Add focused tests.
- [x] Run syntax checks and tests.
- [x] Write Jira-facing response.

## Notes

- The repo does not yet have a standalone generic memory system, so this ticket extends the existing durable shopping profile without adding dependencies.
- Settings rendering remains dependency-free HTML string output, matching the existing Settings module pattern.
- Negative memory ranking is intentionally soft: matching candidates are penalized, not filtered out.

## Verification

- `node --check src/shopping-profile.mjs`
- `node --check src/settings-shopping-pane.mjs`
- `node --check src/asket-product-search.mjs`
- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-profile.test.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --check test/asket-product-search.test.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --input-type=module -e "import { readFileSync } from 'node:fs'; JSON.parse(readFileSync('schemas/shopping-profile.schema.json', 'utf8'));"`
- `node --test test/shopping-profile.test.mjs test/settings-shopping-pane.test.mjs test/asket-product-search.test.mjs test/shopping-chat-flow.test.mjs`
- `node --test`

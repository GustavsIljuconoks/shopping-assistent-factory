Implemented KAN-86.

What changed:
- Added `src/inbox-triage-classifier.mjs`, a small Inbox quick-capture classifier that suggests `Shop` when buying intent is detected.
- Reused the existing shopping intent detector and added an Inbox-specific EU/clothing vocabulary fallback for captures like `buy black trousers`, `I need a blazer`, and `Need new trainers EU 42`.
- Added focused tests for buying-intent captures and non-shopping captures.

Verification:
- `node --check src/inbox-triage-classifier.mjs`
- `node --check test/inbox-triage-classifier.test.mjs`
- `node --test test/inbox-triage-classifier.test.mjs`

Risks:
- The repo does not currently include a concrete Inbox runtime, so this PR adds the classifier boundary for later wiring.
- A broader `shopping-chat-flow` test run still has two unrelated staging-flow failures outside this ticket; the new KAN-86 classifier tests pass.

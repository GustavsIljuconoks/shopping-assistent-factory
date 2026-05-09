Implemented the chat-level shopping clarification boundary.

- Added `src/shopping-chat-flow.mjs` to detect shopping intent, resolve garment class, size, and price ceiling, ask clarifying questions before search when context is missing, dispatch an injected search tool only when context is sufficient, and render an injected proposal card only for confident results.
- Added tests covering shopping intent detection, missing garment class, missing size, missing price ceiling, profile size/budget fallback, search dispatch, proposal rendering, and low-confidence plain-text behavior.
- Continuation check confirmed the implementation still matches the refreshed ticket snapshot; no further code changes were needed.

Verification:
- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test`

Risk:
- The repo does not yet include the concrete chat runtime or Asket product search tool, so this adds the behavior boundary with injectable adapters for later wiring.

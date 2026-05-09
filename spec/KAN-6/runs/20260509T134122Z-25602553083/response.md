Implemented the shopping audit log persistence layer.

What changed:
- Added `src/shopping-audit-log.mjs` with normalized audit entries for `search`, `page_read`, `cart_add`, and `cart_peek`.
- Entries capture retailer, UTC timestamp, status, and optional screenshot path.
- Appends are queued asynchronously to an append-only JSONL file at `data/shopping-audit-log.jsonl`, so callers can record an entry without waiting on disk I/O.
- Added `readShoppingAuditLog()` and `flushShoppingAuditLog()` helpers for restart reads and deterministic tests.
- Added `schemas/shopping-audit-log.schema.json` and focused node:test coverage.

Validation:
- `node --test` passes.

Risks:
- Write failures are intentionally non-blocking; callers that need observability should pass `onError` to the append helper.

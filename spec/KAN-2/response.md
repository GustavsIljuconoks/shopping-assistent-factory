Implemented the Shopping foundations in a small framework-free module.

What changed:
- Added durable profile storage with country, currency, sizes, budget anchors, exclusions, ceiling, and retailer list fields.
- Added programmatic read/write helpers for shopping tools, including field-level get/set.
- Added append-only audit logging with action type, retailer, timestamp, status, and optional screenshot path. Appends are queued so callers are not blocked by disk writes.
- Added a visible static Settings / Shopping pane that renders safely when no profile exists yet.
- Added Node built-in tests for profile normalization, restart persistence, absent-data safety, and audit log persistence.

Validation:
- `npm test` passes.

Risks:
- The repository has no existing application shell, so the Settings pane is a standalone static entry point at `src/shopping/settings.html` rather than integrated into a larger router.

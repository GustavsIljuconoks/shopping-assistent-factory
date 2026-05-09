Implemented the Settings -> Privacy -> Shopping activity empty shell.

What changed:
- Added a Privacy navigation item and Shopping activity pane to the settings renderer.
- Added an empty state for the audit log: "No shopping activity has been recorded yet."
- Updated the static settings HTML artifact to show the Privacy pane.
- Added tests covering navigation and empty audit-log rendering.

Validation:
- `node --test` passed.

Risks:
- The pane is intentionally an empty shell; real audit-log entry rendering remains blocked on the audit log persistence/schema milestone.

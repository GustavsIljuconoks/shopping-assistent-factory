Implemented the Settings -> Privacy shopping activity audit pane population.

What changed:
- The privacy pane now renders audit-log entries as rows with action type, retailer, timestamp, and status.
- Entries are normalized and shown in reverse chronological order.
- Failed entries render a "Debug screenshot" link when `screenshotPath` is present.
- Added a helper to read the current persisted shopping audit log so refreshed privacy renders pick up entries appended during staging runs.

Validation:
- `node --test test/settings-shopping-pane.test.mjs`
- `node --test`

Risks:
- Real-time behavior depends on the caller refreshing/re-rendering the pane with the latest audit entries; this change provides the live-read/render path but does not add a browser polling loop.

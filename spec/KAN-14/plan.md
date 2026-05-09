# KAN-14 Implementation Plan

## Scope

Add persistent, isolated browser profile directory management keyed by retailer identifier.

## Steps

- [x] Read repository instructions and ticket snapshot.
- [x] Inspect existing shopping persistence patterns and tests.
- [x] Add browser profile management helpers.
- [x] Cover per-retailer uniqueness, persistence, enabled-retailer provisioning, and Disconnect deletion with tests.
- [x] Ignore runtime browser profile data.
- [x] Run focused validation.
- [x] Write Jira-facing response.

## Notes

- Browser profile directories default to `data/browser-profiles/`.
- Directory names are deterministic hex encodings of the exact retailer identifier, keeping profile paths stable across restarts while avoiding path traversal and separator issues.
- Each ensured profile returns `userDataDir` equal to the profile directory so browser automation can launch a persistent per-retailer context without sharing cookies or session storage.
- Per-retailer Disconnect removes only the selected retailer's profile directory.

## Verification

- `node --check src/shopping-browser-profiles.mjs`
- `node --check test/shopping-browser-profiles.test.mjs`
- `node --test test/shopping-browser-profiles.test.mjs`
- `node --test test/*.test.mjs`

Implemented isolated per-retailer browser profile management.

What changed:
- Added dependency-free browser profile helpers keyed by retailer identifier.
- Each retailer gets a stable `data/browser-profiles/<encoded-retailer>` directory and a `userDataDir` value for persistent browser contexts.
- Added enabled-retailer provisioning so duplicate retailer identifiers reuse one profile.
- Added per-retailer Disconnect deletion that removes only the selected retailer's profile and session data.
- Ignored runtime `data/browser-profiles/` so cookies and local browser state are not committed.

Verification:
- `node --check src/shopping-browser-profiles.mjs`
- `node --check test/shopping-browser-profiles.test.mjs`
- `node --test test/shopping-browser-profiles.test.mjs`
- `node --test test/*.test.mjs`

Risk:
- This provides the profile storage contract; future browser automation must use the returned `userDataDir` for every retailer launch to preserve isolation.

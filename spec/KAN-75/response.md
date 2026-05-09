Implemented the failure-card flow for staging failures.

What changed:
- Staging failures now produce a `retailer_staging_failure_card` with a plain-English reason such as item out of stock, login expired, anti-bot challenge, or site error.
- Failed proposal cards render as a failure card instead of the candidate proposal list, with an "Open in [retailer] to complete manually" link.
- Staging failure handling foregrounds the active retailer page/session so the user can finish manually.
- Added focused tests for failure-card rendering, failure explanations, and browser foregrounding.

Validation:
- `node --test test/*.test.mjs` passed.

Risk:
- Visual verification was limited to HTML/unit rendering; no live browser staging flow was exercised against retailer sites.

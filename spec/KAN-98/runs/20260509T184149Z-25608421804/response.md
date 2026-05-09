Implemented KAN-98.

What changed:
- Anti-bot handoff chat status now says `Waiting for you to confirm in [Retailer] window…`.
- Challenge-aware staging now pauses until the browser challenge is no longer detected, then resumes automatically once focus is available.
- Unresolved challenges time out after five minutes by default and flow into the existing anti-bot staging failure-card path.

Verification:
- Syntax checks passed for the changed source and test files.
- Focused automation browser and ASOS staging tests passed.

Risk:
- Challenge detection is still based on the existing Cloudflare-style DOM/title/host heuristics, so retailer-specific challenge variants may need additional selectors later.

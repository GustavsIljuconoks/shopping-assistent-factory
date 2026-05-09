Implemented the Asket product search tool boundary.

What changed:
- Added `searchAsketProducts`, which accepts structured intent, builds an Asket search URL, uses the existing persistent Asket browser profile when a launcher is provided, and delegates page extraction to an injectable search adapter.
- Normalizes, filters, scores, and returns up to 3 candidates with product URL, image URL, brand, title, size, color, price, and one-line reasoning.
- Filters out candidates above the price ceiling, mismatched currency, mismatched size/color/garment class, and returns an empty list when nothing matches.
- Added focused tests for ranking, filtering, empty results, adapter payloads, and browser/profile integration.

Verification:
- `node --check src/asket-product-search.mjs`
- `node --check test/asket-product-search.test.mjs`
- `node --test test/asket-product-search.test.mjs`
- `node --test test/*.test.mjs`

Risk:
- The repo still uses adapter-style browser boundaries, so production needs a concrete Asket page extraction adapter to pass raw products into this tool.

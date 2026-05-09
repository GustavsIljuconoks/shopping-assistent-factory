Implemented shopping memories for soft taste accumulation.

- Added normalized memories to the shopping profile schema and persistence layer, including Shopping-tagged outcome capture, edit, pin, individual wipe, and clear-only-shopping helpers.
- Added Settings -> Memories rendering with a Shopping filter, scrollable memory list, per-memory Edit/Pin/Wipe controls, and a Clear shopping memories action.
- Passed profile memories into shopping search context and added soft negative-memory penalties to Asket ranking so matching disliked outcomes are de-prioritized without being hard-filtered.
- Added focused coverage for memory persistence, Settings filtering/actions, and memory-aware ranking.

Verification:
- `node --test`

Risk:
- The Settings layer is still dependency-free rendered HTML; these controls expose the expected UI/action affordances, but no browser event wiring exists in this repo yet.

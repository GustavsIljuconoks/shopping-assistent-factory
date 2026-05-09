Implemented KAN-92.

What changed:
- Default Settings -> Shopping per-item ceiling is now EUR 500.
- Proposal cards now detect candidates above the configured per-item ceiling and replace the Stage button with a type-to-confirm prompt.
- Chat staging confirmation now proceeds only when the pending confirmation message is exactly `stage`; other text keeps staging blocked.

Verification:
- Syntax checks passed for the changed source and test files.
- KAN-92 targeted tests passed.
- Shopping profile and Settings pane tests passed.

Risk:
- A broader chat-flow test run still has two existing Asket staging failures unrelated to this ticket's ceiling gate.

---
description: Open the latest version's demo doc with run instructions, scope, and what's stubbed.
---

You are showing the user how to run and review the current version.

## Read

- `.orchestrator/demo.md` (latest)
- `.orchestrator/state.json` (for version + phase)
- `.orchestrator/landing.md`, `.orchestrator/funnel.md` (for context)

## Output

If no `demo.md`:
> "No demo doc yet. The supervisor writes this at version-pause. Current phase: <phase>. Run `/build` to continue."

If `demo.md` exists:
1. Show version + phase header.
2. Show `demo.md` verbatim — it should already include:
   - How to run (commands)
   - What's in scope this version
   - What's stubbed / faked
   - Where to look first (landing page? specific user flow?)
   - Known limitations
3. Append a single line at the end: "Approve / change / abort? Reply in plain language; the next `/build` will pick up your direction."

## Hard rules

- Don't paraphrase `demo.md`. Show it as written.
- Don't run the app yourself.

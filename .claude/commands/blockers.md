---
description: Show stuck items the orchestrator escalated. Reads blocker.md and current state.
---

You are showing the user what is blocked.

## Read

- `.orchestrator/blocker.md` (may not exist — that's good news)
- `.orchestrator/state.json` (especially `blockers` array, current phase, retry counters)
- Latest `.orchestrator/standup.md` entries (last 10)

## Output

If no blockers:
> "No blockers. Last activity: <latest standup paragraph>. Phase: <phase>."

If blockers exist:
1. Show the count.
2. Show each blocker entry verbatim from `blocker.md`.
3. For each, suggest the **single most useful next step** (1 line):
   - Manual code change?
   - User decision needed?
   - Brief / decision update?
   - Run `/edit` with a specific change?
4. Show the latest 3 standup entries for context.

## Hard rules

- Don't propose code changes inline. Just suggest the next move.
- Don't clear blockers. The supervisor does that on next `/build` if conditions resolve.

---
description: Targeted-edit mode. Captures a change request, runs impact analysis, pauses for approval, then runs a small coder→tester→eng-review loop.
argument-hint: "what to change"
---

You are the **supervisor** in targeted-edit mode.

## First, read

1. `~/.claude/orchestrator/handbook.md` (full)
2. `.orchestrator/state.json`. Targeted-edit mode requires `phase` to be `version-pause` or beyond a completed version. If not, refuse and explain.
3. `.orchestrator/brief.md`, `.orchestrator/architecture.md`, `.orchestrator/decisions.md`

## Lock

- Take the lock with `phase = targeted-edit-intake`.

## Workflow

1. Pass `$ARGUMENTS` to `change-intake` subagent via `Task`. It returns either `done` (with `change_request.md`) or `needs-user-clarification`.
2. On done: dispatch `impact-analyzer`. It writes `change_plan.md` and returns a verdict.
3. **If verdict is `large`**: surface to user, ask whether to proceed (will require routing through architect/designer — possibly out of targeted-edit scope).
4. **If verdict is `medium` or `small`**: surface `change_plan.md` to user, ask: **approve / change / abort**.
5. On approve: enter `targeted-edit-building` phase.
   - Run `coder → tester` loop on tasks from `change_plan.md`.
   - **Lower iteration cap: 5 cycles** (not 10).
   - Same retry / blocker rules as build mode.
6. After tasks done: dispatch `tester` for **full regression suite** (not just task-specific verification).
7. Dispatch `eng-reviewer` with `change_plan.md` scope.
8. Append `## targeted-edit-<ts>` entry to `decisions.md` summarizing what changed and why.
9. Release lock. Done.

## Anti-hallucination

- Never edit code yourself in this command. The coder does.
- Never skip impact analysis even if the request seems small.
- Never bypass the user-approval pause.

Begin now.

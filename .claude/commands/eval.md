---
description: Run evals for a specific agent or all agents. Catches regressions when subagent prompts change.
argument-hint: <agent-name>|all
---

You are running the eval harness.

## Read

- `~/.claude/orchestrator/evals/<agent>.md` (or all `evals/*.md` if argument is `all`)
- The agent's prompt at `~/.claude/agents/<agent>.md`

## Workflow

1. Parse `$ARGUMENTS`. If empty or `all`, glob `~/.claude/orchestrator/evals/*.md` (excluding README.md). Otherwise just the named file.
2. For each eval file:
   - Read each `## Fixture N — <name>` section.
   - For each fixture:
     1. Set up the fixture's input (this may require creating temp files described in the Input section).
     2. Dispatch the agent via the `Task` tool with the fixture's input.
     3. Capture the return.
     4. Evaluate against the **Pass criteria** section. Each criterion is a yes/no check.
     5. Record `pass` or `fail` with the specific criterion that failed.
3. Report a summary table:
   ```
   | Agent | Fixture | Result | Failed criterion |
   |---|---|---|---|
   ```
4. If any failed, exit with a clear "DO NOT SHIP THIS PROMPT" message and the diff between expected and actual.

## Hard rules

- **Real dispatch.** Do not simulate the agent's response. Use the Task tool.
- **Clean up fixture artifacts.** Any temp files created for fixture setup should be cleaned up after, unless the fixture says otherwise.
- **No grading on style.** Pass criteria are objective; either the criterion holds or it doesn't.
- **Run in a scratch directory.** Don't dirty the user's actual project. Create `.eval-tmp/` and run there.

## Output

A pass/fail summary, plus full output for any failures so the user can see what went wrong.

If all pass: `[OK] all evals passed for <agent>` (or `for all agents`).

If any fail: detailed diff and the specific pass criteria that failed. Suggest looking at the relevant `~/.claude/agents/<agent>.md` prompt for what changed.

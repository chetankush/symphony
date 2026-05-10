# Orchestrator hooks

Deterministic enforcement layer for the orchestrator. Hooks run as out-of-process Node scripts and cannot be hallucinated by any agent.

## What each hook does

| Hook | Trigger | Purpose |
|---|---|---|
| `no-delete.js` | PreToolUse, matcher `Bash` | Blocks `rm`/`Remove-Item`/`Del`/`unlink` on `.tsx/.ts/.jsx/.js/.css/.scss/.module.css` files |
| `append-only.js` | PreToolUse, matcher `Write\|Edit` | Blocks any Write/Edit on `decisions.md` or `standup.md` that would lose existing content |
| `post-task.js` | PostToolUse, matcher `Task` | Appends to `state.json.action_history`; writes `blocker.md` if 3 identical Task dispatches in a row |
| `release-lock.js` | Stop | Releases `state.json.lock` on session end |

## Install

Add to `~/.claude/settings.json` (or per-project `.claude/settings.local.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node ~/.claude/orchestrator/hooks/no-delete.js" }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "node ~/.claude/orchestrator/hooks/append-only.js" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          { "type": "command", "command": "node ~/.claude/orchestrator/hooks/post-task.js" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node ~/.claude/orchestrator/hooks/release-lock.js" }
        ]
      }
    ]
  }
}
```

On Windows expand `~` to `%USERPROFILE%` if your shell needs it (PowerShell auto-expands in newer versions).

## Why this matters

Per Claude Code 2026 best practice: *"Keep policy in CLAUDE.md, execution routines in Skills, automatic enforcement in Hooks."* Guardrails written into the supervisor's prompt can be violated by the model. Hooks are out-of-process scripts that the model cannot bypass.

## Testing a hook locally

```sh
echo '{"tool_name":"Bash","tool_input":{"command":"rm src/Component.tsx"}}' | node ~/.claude/orchestrator/hooks/no-delete.js
# expected: {"decision":"block","reason":"..."}

echo '{"tool_name":"Write","tool_input":{"file_path":".orchestrator/decisions.md","content":"# Empty"}}' | node ~/.claude/orchestrator/hooks/append-only.js
# expected: {"decision":"block","reason":"..."}
```

## Disabling temporarily

Comment out the hook block in `settings.json`. Or invoke Claude Code with `--no-hooks` for one-off bypass (use sparingly; the orchestrator depends on these for determinism).

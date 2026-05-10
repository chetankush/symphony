#!/usr/bin/env bash
# Bootstraps a new Symphony-enabled project.
#
# Usage:
#   ./new-symphony-project.sh <project-path>
#
# Example:
#   ./new-symphony-project.sh ~/Desktop/personal/my-app
#
# What it does:
#   1. Creates the project directory.
#   2. Copies .claude/ (agents, commands, orchestrator) into it.
#   3. Rewrites ~/.claude/orchestrator/ references to project-relative .claude/orchestrator/.
#   4. Writes .claude/settings.local.json with project-scoped hook paths.
#   5. Prints next steps.
#
# Result: Symphony only activates when Claude Code runs from inside this project.
# Your other Claude Code sessions are untouched.

set -euo pipefail

SYMPHONY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <project-path>" >&2
  echo "Example: $0 ~/Desktop/personal/my-app" >&2
  exit 1
fi

PROJECT_PATH="${1/#\~/$HOME}"

if [ -e "$PROJECT_PATH" ]; then
  echo "Error: $PROJECT_PATH already exists. Pick a new path." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed. Run 'brew install node' first (hooks need it)." >&2
  exit 1
fi

echo "Creating project at $PROJECT_PATH"
mkdir -p "$PROJECT_PATH"

echo "Copying Symphony .claude/ into project"
cp -R "$SYMPHONY_ROOT/.claude" "$PROJECT_PATH/"

echo "Rewriting ~/.claude/orchestrator/ refs to project-relative"
# macOS sed needs '' after -i; this works on BSD sed (default on macOS).
find "$PROJECT_PATH/.claude/agents" "$PROJECT_PATH/.claude/commands" -type f -name '*.md' \
  -exec sed -i '' 's|~/.claude/orchestrator/|.claude/orchestrator/|g' {} +

echo "Writing project-scoped hook config to .claude/settings.local.json"
cat > "$PROJECT_PATH/.claude/settings.local.json" <<'JSON'
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/orchestrator/hooks/no-delete.js" }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/orchestrator/hooks/append-only.js" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/orchestrator/hooks/post-task.js" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/orchestrator/hooks/release-lock.js" }
        ]
      }
    ]
  },
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(pnpm:*)",
      "Bash(yarn:*)",
      "Bash(npx:*)",
      "Bash(bun:*)",
      "Bash(node:*)",
      "Bash(deno:*)",
      "Bash(tsc:*)",
      "Bash(eslint:*)",
      "Bash(prettier:*)",
      "Bash(biome:*)",
      "Bash(jest:*)",
      "Bash(vitest:*)",
      "Bash(playwright:*)",
      "Bash(mocha:*)",
      "Bash(cypress:*)",
      "Bash(vite:*)",
      "Bash(next:*)",
      "Bash(nuxt:*)",
      "Bash(webpack:*)",
      "Bash(rollup:*)",
      "Bash(esbuild:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)",
      "Bash(git branch:*)",
      "Bash(git remote:*)",
      "Bash(git add:*)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(grep:*)",
      "Bash(rg:*)",
      "Bash(find:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(wc:*)",
      "Bash(pwd)",
      "Bash(tree:*)",
      "Bash(mkdir:*)",
      "Bash(which:*)",
      "Bash(file:*)",
      "Bash(echo:*)"
    ]
  }
}
JSON

echo ""
echo "Done."
echo ""
echo "Next steps:"
echo "  cd $PROJECT_PATH"
echo "  claude"
echo "  /build"
echo ""
echo "Symphony is scoped to this project only. Other Claude Code sessions are unaffected."

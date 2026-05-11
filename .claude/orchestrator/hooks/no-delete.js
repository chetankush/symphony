#!/usr/bin/env node
// PreToolUse hook — blocks deletion of .tsx/.ts/.css project files.
// Reads the tool call from stdin (Claude Code hook protocol).
//
// Trigger: PreToolUse, matcher: "Bash"
// Behavior:
//   - Bash: blocks `rm`/`Remove-Item` against .tsx/.ts/.css/.scss/.module.css paths.
// Protocol:
//   - Exit 0 with no output → allow.
//   - Exit 2 with stderr message → block; the reason is fed back to Claude.

const fs = require('fs');
let input = '';
try { input = fs.readFileSync(0, 'utf8'); } catch (_) {}

let payload;
try { payload = JSON.parse(input); } catch (_) { payload = {}; }

const toolName = payload.tool_name || payload.toolName || '';
const toolInput = payload.tool_input || payload.toolInput || {};
const command = (toolInput.command || '').toString();

const PROTECTED = /\.(tsx|ts|jsx|js|css|scss|sass|less|module\.css)\b/i;
const DELETE_PATTERNS = [
  /\brm\s+(-[rRfF]+\s+)?\S*/i,
  /\bRemove-Item\s+\S*/i,
  /\bDel\s+\S*/i,
  /\bunlink\s+\S*/i,
];

function isDangerous(cmd) {
  if (!cmd) return false;
  for (const pat of DELETE_PATTERNS) {
    const match = cmd.match(pat);
    if (match && PROTECTED.test(match[0])) return match[0];
  }
  return false;
}

if (toolName === 'Bash') {
  const hit = isDangerous(command);
  if (hit) {
    process.stderr.write(`File-deletion guardrail: command "${hit.trim()}" appears to delete a protected file type (.tsx/.ts/.css/etc.). Project policy: never delete these files; orphan them by removing imports instead. If this is intentional, ask the user explicitly.\n`);
    process.exit(2);
  }
}

process.exit(0);

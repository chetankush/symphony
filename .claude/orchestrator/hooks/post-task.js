#!/usr/bin/env node
// PostToolUse hook — bumps action_history in .orchestrator/state.json after each Task dispatch.
// Detects same-action-3-in-a-row loops deterministically (supervisor prompt could miss this).
//
// Trigger: PostToolUse, matcher: "Task"
// Behavior:
//   - Append {agent, input_hash, ts} to state.json.action_history (last 20 kept).
//   - If last 3 entries have identical agent + input_hash → write blocker.md flagging loop.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let input = '';
try { input = fs.readFileSync(0, 'utf8'); } catch (_) {}

let payload;
try { payload = JSON.parse(input); } catch (_) { process.exit(0); }

const toolName = payload.tool_name || payload.toolName || '';
if (toolName !== 'Task') process.exit(0);

const toolInput = payload.tool_input || payload.toolInput || {};
const agent = toolInput.subagent_type || toolInput.agent || 'unknown';
const promptText = (toolInput.prompt || toolInput.description || '').toString();

const cwd = process.cwd();
const statePath = path.join(cwd, '.orchestrator', 'state.json');

let state = {};
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (_) {}

const hash = crypto.createHash('sha256').update(promptText).digest('hex').slice(0, 16);
state.action_history = state.action_history || [];
state.action_history.push({ agent, input_hash: hash, ts: new Date().toISOString() });
if (state.action_history.length > 20) state.action_history = state.action_history.slice(-20);

// Loop detection: last 3 entries identical
const last3 = state.action_history.slice(-3);
const looped = last3.length === 3 && last3.every(e => e.agent === last3[0].agent && e.input_hash === last3[0].input_hash);

if (looped) {
  const blockerPath = path.join(cwd, '.orchestrator', 'blocker.md');
  const note = `\n\n## ${new Date().toISOString()} hooks/post-task — loop detected\nAgent ${last3[0].agent} dispatched 3 times in a row with identical input hash ${last3[0].input_hash}. Supervisor must replan or escalate.\n`;
  try {
    const existing = fs.existsSync(blockerPath) ? fs.readFileSync(blockerPath, 'utf8') : '# Blockers\n';
    fs.writeFileSync(blockerPath, existing + note);
  } catch (_) {}
}

try {
  fs.mkdirSync(path.join(cwd, '.orchestrator'), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
} catch (_) {}

process.exit(0);

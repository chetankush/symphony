#!/usr/bin/env node
// PreToolUse hook — enforces append-only on .orchestrator/decisions.md and standup.md.
// Allows Edit (which adds content) but blocks Write that would shrink/replace these files.
//
// Trigger: PreToolUse, matcher: "Write|Edit"
// Behavior: when target is decisions.md or standup.md and the operation would lose existing content, block.

const fs = require('fs');
const path = require('path');

let input = '';
try { input = fs.readFileSync(0, 'utf8'); } catch (_) {}

let payload;
try { payload = JSON.parse(input); } catch (_) { payload = {}; }

const toolName = payload.tool_name || payload.toolName || '';
const toolInput = payload.tool_input || payload.toolInput || {};

const APPEND_ONLY_FILES = ['decisions.md', 'standup.md'];

function isAppendOnly(filePath) {
  if (!filePath) return false;
  const lower = filePath.replace(/\\/g, '/').toLowerCase();
  return APPEND_ONLY_FILES.some(f => lower.endsWith('/.orchestrator/' + f) || lower.endsWith('.orchestrator/' + f));
}

function existingContent(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch (_) { return ''; }
}

if (toolName === 'Write') {
  const filePath = toolInput.file_path || toolInput.path || '';
  if (isAppendOnly(filePath)) {
    const current = existingContent(filePath);
    const incoming = (toolInput.content || '').toString();
    if (current && !incoming.startsWith(current)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `Append-only guardrail: ${path.basename(filePath)} is append-only. Use Edit to add new entries; never overwrite existing content. Existing content not found at start of new content.`
      }));
      process.exit(0);
    }
  }
}

if (toolName === 'Edit') {
  const filePath = toolInput.file_path || toolInput.path || '';
  if (isAppendOnly(filePath)) {
    const oldString = (toolInput.old_string || '').toString();
    const newString = (toolInput.new_string || '').toString();
    // Only allow edits whose new_string contains the old_string (i.e. additions, not replacements that lose content).
    if (oldString && !newString.includes(oldString)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `Append-only guardrail: ${path.basename(filePath)} edits must preserve old_string within new_string (i.e. only add content). To override a past entry, append a new entry that supersedes it.`
      }));
      process.exit(0);
    }
  }
}

console.log(JSON.stringify({ decision: 'allow' }));
process.exit(0);

#!/usr/bin/env node
// Stop hook — releases .orchestrator/state.json.lock if held by this session.
// Trigger: Stop event (when Claude Code session ends or user interrupts).

const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const statePath = path.join(cwd, '.orchestrator', 'state.json');

try {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  if (state.lock) {
    state.lock = null;
    state.lock_released_at = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }
} catch (_) {}

process.exit(0);

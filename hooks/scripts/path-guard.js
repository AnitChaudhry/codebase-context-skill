#!/usr/bin/env node
// Path Guard — PreToolUse hook (cross-platform Node.js)
// Blocks writes/edits/deletes to protected CCS paths.
// Reads tool input JSON from stdin.
// Returns {"decision":"block","reason":"..."} to prevent the tool from running.

const fs = require('fs');
const path = require('path');

const CCS_DIR = path.join(process.cwd(), '.ccs');

// Only run in CCS-enabled projects
if (!fs.existsSync(CCS_DIR)) {
  process.stdin.resume();
  process.stdin.on('data', () => {});
  process.stdin.on('end', () => {});
  process.exit(0);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = (data.tool_input && (data.tool_input.file_path || data.tool_input.path)) || '';
    const command = (data.tool_input && data.tool_input.command) || '';
    const toolName = data.tool_name || '';
    const rel = filePath ? path.relative(process.cwd(), filePath).replace(/\\/g, '/') : '';

    // BLOCK: ops/sessions — immutable
    if (rel.startsWith('ops/sessions/') || rel === 'ops/sessions') {
      output({ decision: 'block', reason: 'PROTECTED: ops/sessions/ records are immutable. Session data must never be modified or deleted after capture.' });
      return;
    }

    // BLOCK: installed skill plugin files
    if (rel.match(/^\.claude\/skills\/ccs-/)) {
      output({ decision: 'block', reason: 'PROTECTED: Installed CCS skill plugin files (.claude/skills/ccs-*/) must not be modified. To update, reinstall from the source repo.' });
      return;
    }

    // BLOCK: hook scripts and manifest
    if (rel.startsWith('hooks/scripts/') || rel === 'hooks/hooks.json') {
      output({ decision: 'block', reason: 'PROTECTED: CCS hook scripts and hooks.json must not be modified during normal operation.' });
      return;
    }

    // BLOCK: Bash commands that delete session files
    if (command && /ops\/sessions/.test(command) && /(rm|del|unlink|truncate)/.test(command)) {
      output({ decision: 'block', reason: 'PROTECTED: Deletion commands targeting ops/sessions/ are blocked. Session records are immutable.' });
      return;
    }

    // WARN: references/ — no bulk refactor
    if (rel.startsWith('references/')) {
      if (toolName === 'Write') {
        const content = (data.tool_input && data.tool_input.content) || '';
        if (!content) {
          output({ decision: 'block', reason: 'GUARDED: Refusing to overwrite a references/ file with empty content.' });
          return;
        }
      }
      output({ additionalContext: 'GUARDED PATH: references/ files are CCS system documentation. Scoped individual edits are allowed. Do NOT bulk-refactor, mass-rename, or delete reference files.' });
      return;
    }

    // WARN: skills/ and agents/
    if (rel.match(/^skills\/.*\/SKILL\.md$/) || rel.match(/^agents\/.*\.md$/)) {
      output({ additionalContext: 'GUARDED PATH: CCS skill/agent definition files. Targeted single-file edits are permitted. Do NOT bulk-refactor.' });
      return;
    }

  } catch {
    // Silent failure — hooks must never break the session
  }
});

function output(obj) {
  process.stdout.write(JSON.stringify(obj));
}

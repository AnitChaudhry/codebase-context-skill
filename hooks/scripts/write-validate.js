#!/usr/bin/env node
// Write Validate — PostToolUse hook (cross-platform)
// Validates notes in knowledge space have required YAML frontmatter fields.

const fs = require('fs');
const path = require('path');

const CCS_DIR = path.join(process.cwd(), '.ccs');
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
    const filePath = data.tool_input && (data.tool_input.file_path || data.tool_input.path);
    if (!filePath || !fs.existsSync(filePath)) return;

    const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    if (!rel.includes('/notes/') && !rel.includes('thinking/')) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').slice(0, 20).join('\n');
    const warns = [];

    if (!lines.includes('description:')) warns.push('Missing description field.');
    if (!lines.includes('topics:')) warns.push('Missing topics field.');
    if (!content.startsWith('---')) warns.push('Missing YAML frontmatter.');

    if (warns.length > 0) {
      const name = path.basename(filePath, '.md');
      process.stdout.write(JSON.stringify({
        additionalContext: 'Schema warnings for ' + name + ': ' + warns.join(' ')
      }));
    }
  } catch {
    // Silent failure
  }
});

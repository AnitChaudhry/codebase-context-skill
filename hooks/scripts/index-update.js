#!/usr/bin/env node
// Index Update Hook — PostToolUse Write/Edit (cross-platform, async)
// After Claude writes or edits a file, incrementally update the CCS index.
// Works on Windows, Mac, and Linux — no bash dependency.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CCS_INDEX = path.join(process.cwd(), '.ccs', 'index.json');

// Only run if index exists
if (!fs.existsSync(CCS_INDEX)) {
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
    const filePath = data.tool_input?.file_path || data.tool_input?.path || '';

    if (!filePath) process.exit(0);

    // Skip .ccs/ files (our own index)
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    if (relPath.startsWith('.ccs/') || relPath.startsWith('.ccs\\')) {
      process.exit(0);
    }

    const enginePath = findEngine();
    if (!enginePath) process.exit(0);

    execFileSync(process.execPath, [enginePath, 'update', filePath], {
      cwd: process.cwd(),
      timeout: 8000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Silent failure
  }
});

function findEngine() {
  const candidates = [
    path.join(__dirname, '..', '..', 'dist', 'cli.js'),
    path.join(process.cwd(), 'node_modules', '.bin', 'ccs'),
    path.join(process.cwd(), 'dist', 'cli.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try { return require.resolve('codebase-context-skill/dist/cli.js'); } catch {}
  return null;
}

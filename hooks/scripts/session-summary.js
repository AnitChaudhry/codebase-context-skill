#!/usr/bin/env node
// Session Summary Hook — SessionStart (cross-platform)
// Injects a compact project summary into Claude's context.
// Stable output → maximizes prompt cache hits.
// Works on Windows, Mac, and Linux — no bash dependency.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CCS_INDEX = path.join(process.cwd(), '.ccs', 'index.json');

// Only run if index exists
if (!fs.existsSync(CCS_INDEX)) {
  process.exit(0);
}

try {
  const enginePath = findEngine();
  if (!enginePath) process.exit(0);

  const result = execFileSync(process.execPath, [enginePath, 'summary'], {
    cwd: process.cwd(),
    timeout: 5000,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result) process.stdout.write(result);
} catch {
  // Silent failure
}

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

#!/usr/bin/env node
// Auto-Commit — PostToolUse hook (cross-platform, async)
// Commits changes after writes to keep the project in version control.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CCS_DIR = path.join(process.cwd(), '.ccs');
if (!fs.existsSync(CCS_DIR)) process.exit(0);

// Only commit if inside a git repository
try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: process.cwd(), stdio: 'pipe', timeout: 5000
  });
} catch {
  process.exit(0);
}

try {
  // Stage all changes
  execFileSync('git', ['add', '-A'], { cwd: process.cwd(), stdio: 'pipe', timeout: 5000 });

  // Check if there are staged changes
  try {
    execFileSync('git', ['diff', '--cached', '--quiet'], { cwd: process.cwd(), stdio: 'pipe', timeout: 5000 });
    process.exit(0); // No changes
  } catch {
    // Has changes — continue
  }

  // Get changed file info
  const changedFiles = execFileSync('git', ['diff', '--cached', '--name-only'], {
    cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe', timeout: 5000
  }).trim().split('\n').filter(Boolean);

  const count = changedFiles.length;
  let msg = count === 1 ? 'Auto: ' + changedFiles[0] : 'Auto: ' + count + ' files';

  try {
    const stats = execFileSync('git', ['diff', '--cached', '--stat'], {
      cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe', timeout: 5000
    }).trim().split('\n').pop();
    if (stats) msg += ' | ' + stats.trim();
  } catch {}

  execFileSync('git', ['commit', '-m', msg, '--no-verify'], {
    cwd: process.cwd(), stdio: 'pipe', timeout: 10000
  });
} catch {
  // Silent failure
}

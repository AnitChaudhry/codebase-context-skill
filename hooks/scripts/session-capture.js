#!/usr/bin/env node
// Session Capture — Stop hook (cross-platform)
// Persists session state on session end.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const cwd = process.cwd();
const CCS_DIR = path.join(cwd, '.ccs');
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
    const data = JSON.parse(input || '{}');
    const sessionId = data.session_id || '';
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const sessionsDir = path.join(cwd, 'ops', 'sessions');

    if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

    // Save session state
    if (sessionId) {
      const record = JSON.stringify({
        id: sessionId,
        ended: now.toISOString(),
        status: 'completed'
      });
      fs.writeFileSync(path.join(sessionsDir, timestamp + '.json'), record + '\n');
    }

    // Auto-commit session artifacts
    try {
      execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd, stdio: 'pipe', timeout: 3000 });
      execFileSync('git', ['add', 'ops/sessions/', 'ops/observations/', 'ops/methodology/', 'self/goals.md'], {
        cwd, stdio: 'pipe', timeout: 5000
      });
      execFileSync('git', ['commit', '-m', 'Session capture: ' + timestamp, '--quiet', '--no-verify'], {
        cwd, stdio: 'pipe', timeout: 10000
      });
    } catch {
      // Not a git repo or nothing to commit
    }
  } catch {
    // Silent failure
  }
});

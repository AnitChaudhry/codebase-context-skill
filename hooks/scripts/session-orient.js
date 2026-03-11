#!/usr/bin/env node
// Session Orientation — SessionStart hook (cross-platform)
// Injects workspace structure and maintenance signals at session start.

const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const CCS_DIR = path.join(cwd, '.ccs');
if (!fs.existsSync(CCS_DIR)) process.exit(0);

const lines = [];

lines.push('## Workspace Structure');
lines.push('');

// Show markdown files (3 levels deep)
try {
  const mdFiles = findFiles(cwd, /\.md$/, 3, ['.git', 'node_modules', '.ccs']);
  for (const f of mdFiles.slice(0, 30)) {
    const rel = path.relative(cwd, f).replace(/\\/g, '/');
    const depth = rel.split('/').length - 1;
    const indent = '  '.repeat(depth);
    lines.push(indent + path.basename(f));
  }
} catch {}

lines.push('');
lines.push('---');
lines.push('');

// Previous session state
const currentSession = path.join(cwd, 'ops', 'sessions', 'current.json');
if (fs.existsSync(currentSession)) {
  lines.push('--- Previous session context ---');
  try { lines.push(fs.readFileSync(currentSession, 'utf8')); } catch {}
  lines.push('');
}

// Goals
for (const goalsPath of ['self/goals.md', 'ops/goals.md']) {
  const p = path.join(cwd, goalsPath);
  if (fs.existsSync(p)) {
    try { lines.push(fs.readFileSync(p, 'utf8')); } catch {}
    lines.push('');
    break;
  }
}

// Identity
const identityPath = path.join(cwd, 'self', 'identity.md');
if (fs.existsSync(identityPath)) {
  try { lines.push(fs.readFileSync(identityPath, 'utf8')); } catch {}
  lines.push('');
}

// Maintenance signals
const counts = {
  observations: countFiles(path.join(cwd, 'ops', 'observations'), '.md'),
  tensions: countFiles(path.join(cwd, 'ops', 'tensions'), '.md'),
  sessions: countFiles(path.join(cwd, 'ops', 'sessions'), '.json') - (fs.existsSync(currentSession) ? 1 : 0),
  inbox: countFiles(path.join(cwd, 'inbox'), '.md'),
};

if (counts.observations >= 10) lines.push('CONDITION: ' + counts.observations + ' pending observations. Consider reviewing them.');
if (counts.tensions >= 5) lines.push('CONDITION: ' + counts.tensions + ' unresolved tensions. Consider reviewing them.');
if (counts.sessions >= 5) lines.push('CONDITION: ' + counts.sessions + ' unprocessed sessions. Consider mining insights.');
if (counts.inbox >= 3) lines.push('CONDITION: ' + counts.inbox + ' items in inbox. Consider processing.');

process.stdout.write(lines.join('\n'));

function countFiles(dir, ext) {
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith(ext)).length;
  } catch { return 0; }
}

function findFiles(root, pattern, maxDepth, ignoreDirs, depth) {
  depth = depth || 0;
  if (depth > maxDepth) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoreDirs.includes(entry.name)) continue;
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) {
        results.push(...findFiles(full, pattern, maxDepth, ignoreDirs, depth + 1));
      } else if (pattern.test(entry.name)) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

#!/usr/bin/env node
// Context Injection Hook — UserPromptSubmit (cross-platform)
// Intercepts user queries, runs the CCS engine to find relevant files,
// and injects precise context into Claude's prompt.
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

// Read stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = data.prompt || '';

    // Skip empty, short, or slash-command prompts
    if (!prompt || prompt.length < 10 || prompt.startsWith('/')) {
      process.exit(0);
    }

    // Skip greetings and non-code queries
    if (/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|bye)\b/i.test(prompt.trim())) {
      process.exit(0);
    }

    // Find the CCS engine
    const enginePath = findEngine();
    if (!enginePath) process.exit(0);

    // Run: ccs context "<query>"
    const result = execFileSync(process.execPath, [enginePath, 'context', prompt], {
      cwd: process.cwd(),
      timeout: 8000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (result && result.length > 50) {
      process.stdout.write(JSON.stringify({ additionalContext: result }));
    }
  } catch {
    // Silent failure — hooks must never break the session
  }
});

function findEngine() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  // Check common locations for the compiled CCS CLI
  const candidates = [
    // Installed location (npm install -g → bin/cli.js copies engine here)
    path.join(home, '.claude', 'skills', '_ccs', 'engine', 'cli.js'),
    // Project-local install (init --project)
    path.join(process.cwd(), '.claude', 'skills', '_ccs', 'engine', 'cli.js'),
    // Relative to hooks dir (installed layout: _ccs/hooks/scripts/ → _ccs/engine/)
    path.join(__dirname, '..', '..', 'engine', 'cli.js'),
    // Source repo (dist/ exists alongside hooks/)
    path.join(__dirname, '..', '..', 'dist', 'cli.js'),
    // Project node_modules
    path.join(process.cwd(), 'node_modules', 'codebase-context-skill', 'dist', 'cli.js'),
    path.join(process.cwd(), 'dist', 'cli.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Try requiring the module directly
  try {
    return require.resolve('codebase-context-skill/dist/cli.js');
  } catch {}

  return null;
}

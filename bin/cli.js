#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

const PKG_DIR = path.resolve(__dirname, '..');
const CWD = process.cwd();

const COLORS = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(msg) { console.log(msg); }
function success(msg) { log(`${COLORS.green}✓${COLORS.reset} ${msg}`); }
function warn(msg) { log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`); }
function info(msg) { log(`${COLORS.dim}  ${msg}${COLORS.reset}`); }

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function mergeMcpJson(destPath) {
  const ccsEntry = {
    type: 'http',
    url: 'https://contextcode.thinqmesh.com/api/mcp'
  };

  let config = { mcpServers: {} };

  if (fs.existsSync(destPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(destPath, 'utf8'));
      if (existing.mcpServers) {
        config = existing;
      }
    } catch (e) {
      warn('.mcp.json exists but is invalid JSON — recreating');
    }
  }

  if (config.mcpServers.ccs) {
    info('.mcp.json already has ccs entry — skipping');
    return false;
  }

  config.mcpServers.ccs = ccsEntry;
  fs.writeFileSync(destPath, JSON.stringify(config, null, 2) + '\n');
  return true;
}

function init() {
  log('');
  log(`${COLORS.bold}codebase-context-skill${COLORS.reset} v1.0.0`);
  log(`${COLORS.dim}Context engineering middleware for Claude Code${COLORS.reset}`);
  log('');

  // 1. Copy skills
  const skillsSrc = path.join(PKG_DIR, 'skills');
  const skillsDest = path.join(CWD, '.claude', 'skills', 'ccs');

  if (fs.existsSync(skillsDest)) {
    warn('Skills already installed at .claude/skills/ccs/ — overwriting');
  }

  copyDirRecursive(skillsSrc, skillsDest);
  success(`Installed 15 slash commands to .claude/skills/ccs/`);

  // 2. Copy agents
  const agentsSrc = path.join(PKG_DIR, 'agents');
  const agentsDest = path.join(CWD, '.claude', 'skills', 'ccs', 'agents');
  copyDirRecursive(agentsSrc, agentsDest);
  success('Installed 3 agents');

  // 3. Copy templates
  const templatesSrc = path.join(PKG_DIR, 'templates');
  const templatesDest = path.join(CWD, '.claude', 'skills', 'ccs', 'templates');
  copyDirRecursive(templatesSrc, templatesDest);
  success('Installed 5 templates');

  // 4. Copy references
  const refsSrc = path.join(PKG_DIR, 'references');
  const refsDest = path.join(CWD, '.claude', 'skills', 'ccs', 'references');
  copyDirRecursive(refsSrc, refsDest);
  success('Installed 4 reference docs');

  // 5. Set up .mcp.json
  const mcpDest = path.join(CWD, '.mcp.json');
  const merged = mergeMcpJson(mcpDest);
  if (merged) {
    success('Configured MCP server in .mcp.json');
  } else {
    success('MCP server already configured');
  }

  // 6. Check .gitignore for .ccs/
  const gitignorePath = path.join(CWD, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignore.includes('.ccs/')) {
      fs.appendFileSync(gitignorePath, '\n# CCS context files (generated)\n.ccs/\n');
      success('Added .ccs/ to .gitignore');
    }
  }

  // Done
  log('');
  log(`${COLORS.green}${COLORS.bold}Ready.${COLORS.reset} Run ${COLORS.cyan}/ccs:init${COLORS.reset} in Claude Code to index your codebase.`);
  log('');
  info('Commands: /ccs:init, /ccs:plan, /ccs:build, /ccs:fix, /ccs:test, /ccs:audit');
  info('Docs:     https://contextcode.thinqmesh.com/docs.html');
  info('GitHub:   https://github.com/AnitChaudhry/codebase-context-skill');
  log('');
}

function showHelp() {
  log('');
  log(`${COLORS.bold}codebase-context-skill${COLORS.reset} v1.0.0`);
  log('');
  log('Usage:');
  log(`  ${COLORS.cyan}npx codebase-context-skill init${COLORS.reset}    Install skills + MCP config into current project`);
  log(`  ${COLORS.cyan}npx codebase-context-skill help${COLORS.reset}    Show this help message`);
  log('');
  log('After installing, run /ccs:init in Claude Code to index your codebase.');
  log('');
  log(`Docs:   ${COLORS.dim}https://contextcode.thinqmesh.com${COLORS.reset}`);
  log(`GitHub: ${COLORS.dim}https://github.com/AnitChaudhry/codebase-context-skill${COLORS.reset}`);
  log('');
}

// Main
if (command === 'init') {
  init();
} else if (command === 'help' || command === '--help' || command === '-h') {
  showHelp();
} else {
  if (command) {
    warn(`Unknown command: ${command}`);
  }
  showHelp();
}

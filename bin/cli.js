#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

const PKG_DIR = path.resolve(__dirname, '..');
const CWD = process.cwd();

// Terminal colors
const R = '\x1b[0m';
const B = '\x1b[1m';
const D = '\x1b[2m';
const I = '\x1b[3m';
const GRN = '\x1b[32m';
const YLW = '\x1b[33m';
const CYN = '\x1b[36m';
const MAG = '\x1b[35m';
const WHT = '\x1b[97m';
const BG_DARK = '\x1b[48;2;17;17;19m';
const PURPLE = '\x1b[38;2;99;102;241m';
const PINK = '\x1b[38;2;168;85;247m';
const TEAL = '\x1b[38;2;6;182;212m';
const GRAY = '\x1b[38;2;90;90;99m';

function log(msg) { console.log(msg); }
function success(msg) { log(`  ${GRN}\u2502${R}  ${GRN}\u2713${R} ${msg}`); }
function warn(msg) { log(`  ${YLW}\u2502${R}  ${YLW}\u26A0${R} ${msg}`); }
function bar(msg) { log(`  ${GRAY}\u2502${R}  ${D}${msg}${R}`); }
function blank() { log(`  ${GRAY}\u2502${R}`); }

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
    url: 'https://skills.thinqmesh.com/api/mcp',
    headers: {
      Authorization: 'Bearer YOUR_TOKEN_HERE'
    }
  };

  let config = { mcpServers: {} };
  let status = 'created';

  if (fs.existsSync(destPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(destPath, 'utf8'));
      if (existing.mcpServers) {
        config = existing;
        status = 'merged';
      }
    } catch (e) {
      status = 'recreated';
    }
  }

  if (config.mcpServers.ccs) {
    return 'exists';
  }

  config.mcpServers.ccs = ccsEntry;
  fs.writeFileSync(destPath, JSON.stringify(config, null, 2) + '\n');
  return status;
}

function header() {
  log('');
  log(`  ${GRAY}\u250C${''.padEnd(58, '\u2500')}\u2510${R}`);
  log(`  ${GRAY}\u2502${R}                                                          ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${PURPLE}${B}\u2588\u2588\u2588${R} ${PINK}${B}\u2588\u2588\u2588${R}  ${WHT}${B}codebase-context-skill${R}  ${D}v1.0.0${R}            ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${PURPLE}\u2588${R} ${PINK}\u2588${R} ${PURPLE}\u2588${R}  ${D}Context engineering for Claude Code${R}       ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${PURPLE}${B}\u2588\u2588\u2588${R} ${PINK}${B}\u2588\u2588\u2588${R}                                           ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}                                                          ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${TEAL}Thinqmesh Technologies${R}                                ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${GRAY}contextcode.thinqmesh.com${R}                              ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}                                                          ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u251C${''.padEnd(58, '\u2500')}\u2524${R}`);
}

function footer() {
  log(`  ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2514${''.padEnd(58, '\u2500')}\u2518${R}`);
  log('');
}

function installSkill(skillDir, skillsDest, sharedDir) {
  const skillName = path.basename(skillDir);
  const destName = 'ccs-' + skillName;
  const destDir = path.join(skillsDest, destName);

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  // Copy SKILL.md with updated name field
  const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  const updated = skillMd
    .replace(/^name:\s*.+$/m, 'name: ' + destName)
    .replace(/\/ccs:/g, '/ccs-');
  fs.writeFileSync(path.join(destDir, 'SKILL.md'), updated);

  // Copy any other files in the skill directory
  const entries = fs.readdirSync(skillDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'SKILL.md') continue;
    const srcPath = path.join(skillDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function checkGit() {
  try {
    require('child_process').execSync('git --version', { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

function init() {
  header();
  blank();

  // 0. Check git is installed (required for git workflow skills)
  if (!checkGit()) {
    warn(`Git not found — git workflow skills require git`);
    blank();
    log(`  ${GRAY}\u2502${R}   Install git:`);
    log(`  ${GRAY}\u2502${R}      ${CYN}Windows:${R}  winget install Git.Git`);
    log(`  ${GRAY}\u2502${R}      ${CYN}macOS:${R}    xcode-select --install`);
    log(`  ${GRAY}\u2502${R}      ${CYN}Ubuntu:${R}   sudo apt install git`);
    log(`  ${GRAY}\u2502${R}      ${CYN}Fedora:${R}   sudo dnf install git`);
    blank();
  } else {
    success('Git detected');
  }

  // 1. Copy each skill directly into .claude/skills/ccs-<name>/
  //    Claude Code discovers skills at .claude/skills/<name>/SKILL.md (one level deep)
  const skillsSrc = path.join(PKG_DIR, 'skills');
  const skillsDest = path.join(CWD, '.claude', 'skills');
  const sharedDir = path.join(skillsDest, '_ccs');

  // Check for old nested install and warn
  const oldInstall = path.join(skillsDest, 'ccs');
  if (fs.existsSync(oldInstall)) {
    warn(`Removing old nested install at .claude/skills/ccs/`);
    fs.rmSync(oldInstall, { recursive: true, force: true });
  }

  if (!fs.existsSync(skillsDest)) fs.mkdirSync(skillsDest, { recursive: true });

  const skillDirs = fs.readdirSync(skillsSrc, { withFileTypes: true })
    .filter(e => e.isDirectory());

  for (const dir of skillDirs) {
    installSkill(path.join(skillsSrc, dir.name), skillsDest, sharedDir);
  }
  success(`${B}${skillDirs.length} slash commands${R} installed to .claude/skills/`);

  // 2. Copy agents, templates, references into shared _ccs directory
  //    (underscore prefix = not a skill, just shared resources)
  if (!fs.existsSync(sharedDir)) fs.mkdirSync(sharedDir, { recursive: true });

  const agentsSrc = path.join(PKG_DIR, 'agents');
  const agentsDest = path.join(sharedDir, 'agents');
  copyDirRecursive(agentsSrc, agentsDest);
  success(`${B}4 agents${R} installed`);

  const templatesSrc = path.join(PKG_DIR, 'templates');
  const templatesDest = path.join(sharedDir, 'templates');
  copyDirRecursive(templatesSrc, templatesDest);
  success(`${B}8 templates${R} installed`);

  const refsSrc = path.join(PKG_DIR, 'references');
  const refsDest = path.join(sharedDir, 'references');
  copyDirRecursive(refsSrc, refsDest);
  success(`${B}5 reference docs${R} installed`);

  // 5. Set up .mcp.json
  const mcpDest = path.join(CWD, '.mcp.json');
  const mcpStatus = mergeMcpJson(mcpDest);
  if (mcpStatus === 'exists') {
    success(`MCP server already configured`);
  } else if (mcpStatus === 'merged') {
    success(`MCP server ${B}merged${R} into existing .mcp.json`);
    warn(`Replace YOUR_TOKEN_HERE in .mcp.json with your token from ${CYN}skills.thinqmesh.com/playground.html${R}`);
  } else {
    success(`MCP server ${B}configured${R} in .mcp.json`);
    warn(`Replace YOUR_TOKEN_HERE in .mcp.json with your token from ${CYN}skills.thinqmesh.com/playground.html${R}`);
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

  blank();
  log(`  ${GRAY}\u251C${''.padEnd(58, '\u2500')}\u2524${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}   ${GRN}${B}Ready.${R} Open Claude Code and run:`);
  blank();
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-init${R}     ${D}Index your codebase${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-plan${R}     ${D}Plan a task${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-build${R}    ${D}Build with context${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-fix${R}      ${D}Debug with root-cause analysis${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-branch${R}   ${D}Create/switch branches with context${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-pr${R}       ${D}Prepare PR with blast radius${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-merge${R}    ${D}Merge with dependency checking${R}`);
  blank();
  bar(`Docs     ${R}${TEAL}https://contextcode.thinqmesh.com${R}`);
  bar(`GitHub   ${R}${PURPLE}https://github.com/AnitChaudhry/codebase-context-skill${R}`);

  footer();
}

function showHelp() {
  header();
  blank();
  log(`  ${GRAY}\u2502${R}   ${WHT}${B}Usage:${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}      ${CYN}npx codebase-context-skill init${R}   Install into current project`);
  log(`  ${GRAY}\u2502${R}      ${CYN}npx codebase-context-skill help${R}   Show this help`);
  log(`  ${GRAY}\u2502${R}      ${CYN}ccs init${R}                          Install (if globally installed)`);
  blank();
  log(`  ${GRAY}\u2502${R}   ${WHT}${B}What it does:${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}      Copies ${B}15 slash commands${R} to ${CYN}.claude/skills/ccs-*/${R}`);
  log(`  ${GRAY}\u2502${R}      Copies ${B}agents, templates, refs${R} to ${CYN}.claude/skills/_ccs/${R}`);
  log(`  ${GRAY}\u2502${R}      Configures MCP server in ${CYN}.mcp.json${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}   ${WHT}${B}After install:${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}      Run ${CYN}${B}/ccs-init${R} in Claude Code to index your codebase.`);
  blank();
  bar(`Docs     ${R}${TEAL}https://contextcode.thinqmesh.com${R}`);
  bar(`GitHub   ${R}${PURPLE}https://github.com/AnitChaudhry/codebase-context-skill${R}`);

  footer();
}

// Main
if (command === 'init') {
  init();
} else if (command === 'help' || command === '--help' || command === '-h') {
  showHelp();
} else {
  if (command) {
    warn(`Unknown command: ${command}`);
    log('');
  }
  showHelp();
}

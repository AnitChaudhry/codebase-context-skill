#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const command = args[0];
const flags = args.slice(1);
const isProjectOnly = flags.includes('--project') || flags.includes('-p');

const PKG_DIR = path.resolve(__dirname, '..');
const CWD = process.cwd();
const HOME = os.homedir();
const VERSION = '2.0.0';

// Terminal colors
const R = '\x1b[0m';
const B = '\x1b[1m';
const D = '\x1b[2m';
const GRN = '\x1b[32m';
const YLW = '\x1b[33m';
const CYN = '\x1b[36m';
const WHT = '\x1b[97m';
const PURPLE = '\x1b[38;2;99;102;241m';
const PINK = '\x1b[38;2;168;85;247m';
const TEAL = '\x1b[38;2;6;182;212m';
const GRAY = '\x1b[38;2;90;90;99m';

function log(msg) { console.log(msg); }
function success(msg) { log(`  ${GRN}\u2502${R}  ${GRN}\u2713${R} ${msg}`); }
function warn(msg) { log(`  ${YLW}\u2502${R}  ${YLW}\u26A0${R} ${msg}`); }
function info(msg) { log(`  ${GRAY}\u2502${R}  ${CYN}\u2139${R} ${msg}`); }
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
    headers: { Authorization: 'Bearer YOUR_TOKEN_HERE' }
  };

  let config = { mcpServers: {} };
  let status = 'created';

  if (fs.existsSync(destPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(destPath, 'utf8'));
      if (existing.mcpServers) { config = existing; status = 'merged'; }
    } catch (e) { status = 'recreated'; }
  }

  if (config.mcpServers.ccs) return 'exists';

  config.mcpServers.ccs = ccsEntry;
  fs.writeFileSync(destPath, JSON.stringify(config, null, 2) + '\n');
  return status;
}

function header() {
  log('');
  log(`  ${GRAY}\u250C${''.padEnd(58, '\u2500')}\u2510${R}`);
  log(`  ${GRAY}\u2502${R}                                                          ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${PURPLE}${B}\u2588\u2588\u2588${R} ${PINK}${B}\u2588\u2588\u2588${R}  ${WHT}${B}codebase-context-skill${R}  ${D}v${VERSION}${R}          ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${PURPLE}\u2588${R} ${PINK}\u2588${R} ${PURPLE}\u2588${R}  ${D}Context engineering for Claude Code${R}       ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${PURPLE}${B}\u2588\u2588\u2588${R} ${PINK}${B}\u2588\u2588\u2588${R}                                           ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}                                                          ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${TEAL}Thinqmesh Technologies${R}                                ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}   ${GRAY}skills.thinqmesh.com${R}                              ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2502${R}                                                          ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u251C${''.padEnd(58, '\u2500')}\u2524${R}`);
}

function footer() {
  log(`  ${GRAY}\u2502${R}`);
  log(`  ${GRAY}\u2514${''.padEnd(58, '\u2500')}\u2518${R}`);
  log('');
}

function installSkill(skillDir, skillsDest) {
  const skillName = path.basename(skillDir);
  const destName = 'ccs-' + skillName;
  const destDir = path.join(skillsDest, destName);

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  const updated = skillMd
    .replace(/^name:\s*.+$/m, 'name: ' + destName)
    .replace(/\/ccs:/g, '/ccs-');
  fs.writeFileSync(path.join(destDir, 'SKILL.md'), updated);

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
  } catch (e) { return false; }
}

function installSkillsAndResources(targetBase) {
  // targetBase is either ~/.claude (global) or ./.claude (project)
  const skillsSrc = path.join(PKG_DIR, 'skills');
  const skillsDest = path.join(targetBase, 'skills');
  const sharedDir = path.join(skillsDest, '_ccs');

  // Clean old nested install
  const oldInstall = path.join(skillsDest, 'ccs');
  if (fs.existsSync(oldInstall)) {
    warn(`Removing old nested install at ${path.relative(CWD, oldInstall) || 'skills/ccs/'}`);
    fs.rmSync(oldInstall, { recursive: true, force: true });
  }

  if (!fs.existsSync(skillsDest)) fs.mkdirSync(skillsDest, { recursive: true });

  const skillDirs = fs.readdirSync(skillsSrc, { withFileTypes: true })
    .filter(e => e.isDirectory());

  for (const dir of skillDirs) {
    installSkill(path.join(skillsSrc, dir.name), skillsDest);
  }
  success(`${B}${skillDirs.length} slash commands${R} installed`);

  // Agents, templates, references
  if (!fs.existsSync(sharedDir)) fs.mkdirSync(sharedDir, { recursive: true });
  copyDirRecursive(path.join(PKG_DIR, 'agents'), path.join(sharedDir, 'agents'));
  success(`${B}6 agents${R} installed`);
  copyDirRecursive(path.join(PKG_DIR, 'templates'), path.join(sharedDir, 'templates'));
  success(`${B}9 templates${R} installed`);
  copyDirRecursive(path.join(PKG_DIR, 'references'), path.join(sharedDir, 'references'));
  success(`${B}15 reference docs${R} installed`);

  // Install CCS v2 engine (compiled TypeScript)
  const distSrc = path.join(PKG_DIR, 'dist');
  if (fs.existsSync(distSrc)) {
    const engineDest = path.join(sharedDir, 'engine');
    copyDirRecursive(distSrc, engineDest);
    success(`${B}CCS Engine v2${R} installed (programming-first context)`);
  }

  // Install hooks (cross-platform Node.js scripts)
  const hooksSrc = path.join(PKG_DIR, 'hooks');
  if (fs.existsSync(hooksSrc)) {
    const hooksDest = path.join(sharedDir, 'hooks');
    copyDirRecursive(hooksSrc, hooksDest);
    success(`${B}Hooks${R} installed (context injection, auto-indexing)`);
  }
}

function installStatusline() {
  const claudeDir = path.join(HOME, '.claude');
  if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });

  // Copy entry point script
  const slSrc = path.join(PKG_DIR, 'bin', 'statusline.sh');
  const slDest = path.join(claudeDir, 'statusline-command.sh');
  if (fs.existsSync(slSrc)) {
    fs.copyFileSync(slSrc, slDest);
  }

  // Copy v2 engine (statusline/ directory with core, themes, layouts)
  const slEngineSrc = path.join(PKG_DIR, 'statusline');
  const slEngineDest = path.join(claudeDir, 'statusline');
  if (fs.existsSync(slEngineSrc)) {
    copyDirRecursive(slEngineSrc, slEngineDest);
    success(`${B}Statusline v2${R} engine installed (5 themes, 3 layouts)`);
  } else {
    success(`${B}Statusline${R} installed to ~/.claude/`);
  }

  // Write default config if none exists
  const configPath = path.join(claudeDir, 'statusline-config.json');
  if (!fs.existsSync(configPath)) {
    const defaultConfig = { version: 2, theme: 'default', layout: 'standard', options: {} };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\n');
  }

  // Merge into ~/.claude/settings.json
  const settingsPath = path.join(claudeDir, 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch (e) {}
  }
  if (!settings.statusLine || settings.statusLine.command === 'bash ~/.claude/statusline-command.sh') {
    const isWin = process.platform === 'win32';
    let cmd;
    if (isWin) {
      const gitBash = 'C:\\\\Program Files\\\\Git\\\\usr\\\\bin\\\\bash.exe';
      const script = path.join(claudeDir, 'statusline-command.sh').replace(/\//g, '\\\\');
      cmd = `"${gitBash}" "${script}"`;
    } else {
      cmd = 'bash ~/.claude/statusline-command.sh';
    }
    settings.statusLine = { type: 'command', command: cmd };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    success(`${B}Statusline config${R} added to ~/.claude/settings.json`);
  } else {
    success(`Statusline already configured`);
  }
}

function installMcp(targetDir) {
  const mcpDest = path.join(targetDir, '.mcp.json');
  const mcpStatus = mergeMcpJson(mcpDest);
  if (mcpStatus === 'exists') {
    success(`MCP server already configured`);
  } else {
    success(`MCP server ${B}configured${R} in .mcp.json`);
    warn(`Replace YOUR_TOKEN_HERE — get token at ${CYN}skills.thinqmesh.com/playground.html${R}`);
  }
}

function updateGitignore() {
  const gitignorePath = path.join(CWD, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return;

  let content = fs.readFileSync(gitignorePath, 'utf8');
  let append = '';
  if (!content.includes('.ccs/')) append += '\n# CCS context files (generated)\n.ccs/\n';
  if (!content.includes('.mcp.json')) append += '# MCP config contains auth token\n.mcp.json\n';
  if (append) {
    fs.appendFileSync(gitignorePath, append);
    success('Updated .gitignore');
  }
}

// ── GLOBAL INSTALL (default): ~/.claude/ ──
function initGlobal() {
  header();
  blank();
  info(`${B}Global install${R} — skills available in all projects`);
  blank();

  if (!checkGit()) {
    warn(`Git not found — git workflow skills require git`);
    blank();
  } else {
    success('Git detected');
  }

  // Install skills + resources to ~/.claude/
  const globalClaudeDir = path.join(HOME, '.claude');
  installSkillsAndResources(globalClaudeDir);

  // Statusline (always global — ~/.claude/)
  installStatusline();

  // MCP in current project
  installMcp(CWD);

  // .gitignore in current project
  updateGitignore();

  blank();
  log(`  ${GRAY}\u251C${''.padEnd(58, '\u2500')}\u2524${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}   ${GRN}${B}Ready.${R} ${B}v2 Engine${R} — programming-first context.`);
  blank();
  log(`  ${GRAY}\u2502${R}   ${D}Terminal commands (zero AI tokens):${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}ccs index${R}         ${D}Build the codebase index${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}ccs search${R} ${D}<q>${R}    ${D}Search files & symbols${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}ccs context${R} ${D}<q>${R}   ${D}Build precise context blob${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}ccs watch${R}         ${D}Auto-update on file changes${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}   ${D}Slash commands (in Claude Code):${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-init${R}         ${D}Index + analyze codebase${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-plan${R}         ${D}Plan a task with context${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-build${R}        ${D}Build with minimal tokens${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-fix${R}          ${D}Debug with root-cause analysis${R}`);
  blank();
  bar(`${R}${D}Engine:${R}      ${CYN}~/.claude/skills/_ccs/engine/${R}  ${D}(v2)${R}`);
  bar(`${R}${D}Skills:${R}      ${CYN}~/.claude/skills/${R}  ${D}(global)${R}`);
  bar(`${R}${D}Statusline:${R}  ${CYN}~/.claude/statusline/${R}  ${D}(v2)${R}`);
  bar(`${R}${D}MCP config:${R}  ${CYN}.mcp.json${R}  ${D}(this project)${R}`);
  blank();
  bar(`Docs     ${R}${TEAL}https://skills.thinqmesh.com${R}`);
  bar(`GitHub   ${R}${PURPLE}https://github.com/AnitChaudhry/codebase-context-skill${R}`);

  footer();
}

// ── PROJECT INSTALL (--project): ./.claude/ ──
function initProject() {
  header();
  blank();
  info(`${B}Project install${R} — skills available in this project only`);
  blank();

  if (!checkGit()) {
    warn(`Git not found — git workflow skills require git`);
    blank();
  } else {
    success('Git detected');
  }

  // Install skills + resources to ./.claude/
  const projectClaudeDir = path.join(CWD, '.claude');
  installSkillsAndResources(projectClaudeDir);

  // Statusline always goes to ~/.claude/ (it's a global Claude Code setting)
  installStatusline();

  // MCP in current project
  installMcp(CWD);

  // .gitignore
  updateGitignore();

  blank();
  log(`  ${GRAY}\u251C${''.padEnd(58, '\u2500')}\u2524${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}   ${GRN}${B}Ready.${R} Open Claude Code ${B}in this folder${R} and run:`);
  blank();
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-init${R}     ${D}Index your codebase${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-plan${R}     ${D}Plan a task${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-build${R}    ${D}Build with context${R}`);
  log(`  ${GRAY}\u2502${R}      ${CYN}${B}/ccs-fix${R}      ${D}Debug with root-cause analysis${R}`);
  blank();
  bar(`${R}${D}Installed to:${R}  ${CYN}.claude/skills/${R}  ${D}(this project)${R}`);
  bar(`${R}${D}Statusline:${R}    ${CYN}~/.claude/statusline/${R}  ${D}(v2 engine, global)${R}`);
  bar(`${R}${D}MCP config:${R}    ${CYN}.mcp.json${R}  ${D}(this project)${R}`);
  blank();
  bar(`Docs     ${R}${TEAL}https://skills.thinqmesh.com${R}`);
  bar(`GitHub   ${R}${PURPLE}https://github.com/AnitChaudhry/codebase-context-skill${R}`);

  footer();
}

function showHelp() {
  header();
  blank();
  log(`  ${GRAY}\u2502${R}   ${WHT}${B}Usage:${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}      ${CYN}ccs init${R}              Install globally to ~/.claude/`);
  log(`  ${GRAY}\u2502${R}      ${CYN}ccs init --project${R}    Install to this project only`);
  log(`  ${GRAY}\u2502${R}      ${CYN}ccs help${R}              Show this help`);
  blank();
  log(`  ${GRAY}\u2502${R}   ${WHT}${B}Global (default):${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}      Skills install to ${CYN}~/.claude/skills/${R}`);
  log(`  ${GRAY}\u2502${R}      Available in ${B}every project${R} you open`);
  log(`  ${GRAY}\u2502${R}      Statusline + MCP auto-configured`);
  blank();
  log(`  ${GRAY}\u2502${R}   ${WHT}${B}Project (--project):${R}`);
  blank();
  log(`  ${GRAY}\u2502${R}      Skills install to ${CYN}./.claude/skills/${R}`);
  log(`  ${GRAY}\u2502${R}      Available ${B}only in this project${R}`);
  log(`  ${GRAY}\u2502${R}      Statusline still global (Claude Code setting)`);
  blank();
  bar(`Docs     ${R}${TEAL}https://skills.thinqmesh.com${R}`);
  bar(`GitHub   ${R}${PURPLE}https://github.com/AnitChaudhry/codebase-context-skill${R}`);

  footer();
}

// Main
if (command === 'init') {
  if (isProjectOnly) {
    initProject();
  } else {
    initGlobal();
  }
} else if (command === 'help' || command === '--help' || command === '-h') {
  showHelp();
} else {
  if (command) {
    warn(`Unknown command: ${command}`);
    log('');
  }
  showHelp();
}

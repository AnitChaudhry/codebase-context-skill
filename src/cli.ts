#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { indexProject, loadIndex, updateFile } from './indexer';
import { searchIndex, expandWithDependencies } from './searcher';
import { buildContext, formatContext, generateSummary } from './context';
import { handlePromptSubmit, handlePostWrite, handleSessionStart } from './hooks';
import { startWatcher } from './watcher';
import { HookInput } from './types';

// ── Terminal Colors ─────────────────────────────────────────────────────────

const R = '\x1b[0m';
const B = '\x1b[1m';
const D = '\x1b[2m';
const GRN = '\x1b[32m';
const YLW = '\x1b[33m';
const CYN = '\x1b[36m';
const RED = '\x1b[31m';
const PURPLE = '\x1b[38;2;99;102;241m';
const GRAY = '\x1b[38;2;90;90;99m';

function log(msg: string) { console.log(msg); }
function ok(msg: string) { log(`  ${GRN}✓${R} ${msg}`); }
function warn(msg: string) { log(`  ${YLW}⚠${R} ${msg}`); }
function err(msg: string) { log(`  ${RED}✗${R} ${msg}`); }
function info(msg: string) { log(`  ${CYN}ℹ${R} ${msg}`); }

// ── CLI Entry Point ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];
const subArgs = args.slice(1);
const cwd = process.cwd();

function main() {
  switch (command) {
    case 'index':
      cmdIndex();
      break;
    case 'search':
      cmdSearch(subArgs.join(' '));
      break;
    case 'context':
      cmdContext(subArgs.join(' '));
      break;
    case 'summary':
      cmdSummary();
      break;
    case 'stats':
      cmdStats();
      break;
    case 'graph':
      cmdGraph(subArgs[0]);
      break;
    case 'update':
      cmdUpdate(subArgs[0]);
      break;
    case 'watch':
      cmdWatch();
      break;
    case 'hook:prompt':
      cmdHookPrompt();
      break;
    case 'hook:post-write':
      cmdHookPostWrite();
      break;
    case 'hook:session-start':
      cmdHookSessionStart();
      break;
    case 'help':
    case '--help':
    case '-h':
      cmdHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      log('2.0.0');
      break;
    default:
      if (command) err(`Unknown command: ${command}`);
      cmdHelp();
      process.exit(command ? 1 : 0);
  }
}

// ── Commands ────────────────────────────────────────────────────────────────

function cmdIndex() {
  const incremental = subArgs.includes('--incremental') || subArgs.includes('-i');
  const startTime = Date.now();

  log('');
  log(`  ${PURPLE}${B}CCS Engine${R} ${D}v2.0.0${R}`);
  log(`  ${GRAY}${'─'.repeat(40)}${R}`);
  info(`Indexing ${B}${path.basename(cwd)}${R}${incremental ? ' (incremental)' : ''}...`);
  log('');

  const index = indexProject({ root: cwd, incremental });
  const elapsed = Date.now() - startTime;

  ok(`${B}${index.stats.totalFiles}${R} files indexed in ${B}${elapsed}ms${R}`);
  ok(`${B}${index.stats.totalLines.toLocaleString()}${R} total lines`);
  ok(`${B}${index.stats.totalDirs}${R} directories`);

  if (index.stats.techStack.length > 0) {
    ok(`Stack: ${B}${index.stats.techStack.join(', ')}${R}`);
  }

  if (index.stats.languages.length > 0) {
    const topLangs = index.stats.languages.slice(0, 5);
    for (const lang of topLangs) {
      info(`${lang.language}: ${lang.files} files (${lang.percentage}%)`);
    }
  }

  // Count symbols
  const symbolCount = Object.keys(index.symbols).length;
  ok(`${B}${symbolCount}${R} unique symbols indexed`);

  // Count by rank
  const ranks = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const file of Object.values(index.files)) {
    ranks[file.rank]++;
  }
  info(`Ranks: S=${ranks.S} A=${ranks.A} B=${ranks.B} C=${ranks.C} D=${ranks.D}`);

  log('');
  ok(`Index written to ${CYN}.ccs/index.json${R}`);
  log('');
}

function cmdSearch(query: string) {
  if (!query) {
    err('Usage: ccs search <query>');
    process.exit(1);
  }

  const index = loadIndex(cwd);
  if (!index) {
    err('No index found. Run "ccs index" first.');
    process.exit(1);
  }

  const results = searchIndex(query, index);
  const expanded = expandWithDependencies(results, index);

  log('');
  log(`  ${PURPLE}${B}Search:${R} ${query}`);
  log(`  ${GRAY}${'─'.repeat(40)}${R}`);

  if (expanded.length === 0) {
    warn('No results found.');
  } else {
    for (const result of expanded.slice(0, 15)) {
      const scoreStr = result.score.toFixed(0).padStart(4);
      const rankColor = result.node.rank === 'S' ? RED : result.node.rank === 'A' ? YLW : GRAY;
      log(`  ${D}${scoreStr}${R}  ${rankColor}[${result.node.rank}]${R}  ${B}${result.file}${R}`);
      log(`        ${D}${result.matchDetail} (${result.matchType})${R}`);
    }
  }
  log('');
}

function cmdContext(query: string) {
  if (!query) {
    err('Usage: ccs context <query>');
    process.exit(1);
  }

  const index = loadIndex(cwd);
  if (!index) {
    err('No index found. Run "ccs index" first.');
    process.exit(1);
  }

  const context = buildContext(query, index);
  const formatted = formatContext(context);

  // Output raw context (designed to be piped or captured by hooks/skills)
  process.stdout.write(formatted);
}

function cmdSummary() {
  const index = loadIndex(cwd);
  if (!index) {
    err('No index found. Run "ccs index" first.');
    process.exit(1);
  }

  const summary = generateSummary(index);
  process.stdout.write(summary);
}

function cmdStats() {
  const index = loadIndex(cwd);
  if (!index) {
    err('No index found. Run "ccs index" first.');
    process.exit(1);
  }

  log('');
  log(`  ${PURPLE}${B}CCS Index Stats${R}`);
  log(`  ${GRAY}${'─'.repeat(40)}${R}`);
  info(`Last indexed: ${B}${new Date(index.timestamp).toLocaleString()}${R}`);
  info(`Files: ${B}${index.stats.totalFiles}${R}`);
  info(`Lines: ${B}${index.stats.totalLines.toLocaleString()}${R}`);
  info(`Directories: ${B}${index.stats.totalDirs}${R}`);
  info(`Symbols: ${B}${Object.keys(index.symbols).length}${R}`);

  if (index.stats.techStack.length > 0) {
    info(`Stack: ${B}${index.stats.techStack.join(', ')}${R}`);
  }

  // File size on disk
  const indexPath = path.join(cwd, '.ccs', 'index.json');
  if (fs.existsSync(indexPath)) {
    const size = fs.statSync(indexPath).size;
    const sizeKB = (size / 1024).toFixed(1);
    info(`Index size: ${B}${sizeKB} KB${R}`);
  }

  // Architecture
  info(`Architecture: ${B}${index.conventions.architecture}${R}`);

  // Top files
  const topFiles = Object.values(index.files)
    .filter(f => f.rank === 'S' || f.rank === 'A')
    .sort((a, b) => b.centrality - a.centrality)
    .slice(0, 5);

  if (topFiles.length > 0) {
    log('');
    info('Top files by centrality:');
    for (const f of topFiles) {
      log(`    ${f.rank === 'S' ? RED : YLW}[${f.rank}]${R}  ${B}${f.path}${R}  ${D}(${f.importedBy.length} importers)${R}`);
    }
  }
  log('');
}

function cmdGraph(filePath: string | undefined) {
  if (!filePath) {
    err('Usage: ccs graph <file-path>');
    process.exit(1);
  }

  const index = loadIndex(cwd);
  if (!index) {
    err('No index found. Run "ccs index" first.');
    process.exit(1);
  }

  const relPath = path.relative(cwd, path.resolve(cwd, filePath)).replace(/\\/g, '/');
  const node = index.files[relPath];

  if (!node) {
    err(`File not in index: ${relPath}`);
    process.exit(1);
  }

  log('');
  log(`  ${PURPLE}${B}Dependency Graph:${R} ${relPath}`);
  log(`  ${GRAY}${'─'.repeat(40)}${R}`);
  log(`  Rank: ${B}${node.rank}${R}  Role: ${B}${node.role}${R}  Lines: ${B}${node.lines}${R}`);
  log('');

  if (node.imports.length > 0) {
    info(`${B}Imports${R} (this file depends on):`);
    for (const imp of node.imports) {
      const impNode = index.files[imp];
      const rank = impNode ? `[${impNode.rank}]` : '';
      log(`    → ${imp} ${D}${rank}${R}`);
    }
  } else {
    info('No imports (leaf node)');
  }

  log('');

  if (node.importedBy.length > 0) {
    info(`${B}Imported by${R} (depends on this file):`);
    for (const imp of node.importedBy) {
      const impNode = index.files[imp];
      const rank = impNode ? `[${impNode.rank}]` : '';
      log(`    ← ${imp} ${D}${rank}${R}`);
    }
  } else {
    info('No importers (not imported by any file)');
  }

  if (node.exports.length > 0) {
    log('');
    info(`${B}Exports:${R} ${node.exports.join(', ')}`);
  }

  if (node.symbols.length > 0) {
    log('');
    info(`${B}Symbols:${R}`);
    for (const sym of node.symbols) {
      const exp = sym.exported ? `${GRN}exported${R}` : `${D}private${R}`;
      log(`    L${sym.line}: ${B}${sym.name}${R} (${sym.type}) ${exp}`);
    }
  }
  log('');
}

function cmdUpdate(filePath: string | undefined) {
  if (!filePath) {
    err('Usage: ccs update <file-path>');
    process.exit(1);
  }

  const absPath = path.resolve(cwd, filePath);
  const result = updateFile(cwd, absPath);

  if (result) {
    ok(`Updated index for ${filePath}`);
  } else {
    err('No index found. Run "ccs index" first.');
    process.exit(1);
  }
}

function cmdWatch() {
  const index = loadIndex(cwd);
  if (!index) {
    err('No index found. Run "ccs index" first.');
    process.exit(1);
  }

  log('');
  log(`  ${PURPLE}${B}CCS Watcher${R} ${D}v2.0.0${R}`);
  info(`Watching ${B}${path.basename(cwd)}${R} for changes...`);
  info(`Press ${B}Ctrl+C${R} to stop.`);
  log('');

  const watcher = startWatcher({
    root: cwd,
    onUpdate(file) {
      const rel = path.relative(cwd, file).replace(/\\/g, '/');
      const time = new Date().toLocaleTimeString();
      log(`  ${D}${time}${R}  ${GRN}↻${R} ${rel}`);
    },
    onError(error) {
      warn(`Watch error: ${error.message}`);
    },
  });

  process.on('SIGINT', () => {
    watcher.stop();
    log('');
    ok('Watcher stopped.');
    process.exit(0);
  });
}

// ── Hook Commands ───────────────────────────────────────────────────────────
// These read JSON from stdin and output results for Claude Code hooks.

function cmdHookPrompt() {
  readStdin((data) => {
    try {
      const input: HookInput = JSON.parse(data);
      const result = handlePromptSubmit(input, cwd);
      if (result) process.stdout.write(result);
    } catch {
      // Silent failure — hooks should not break the session
    }
  });
}

function cmdHookPostWrite() {
  readStdin((data) => {
    try {
      const input: HookInput = JSON.parse(data);
      handlePostWrite(input, cwd);
    } catch {
      // Silent failure
    }
  });
}

function cmdHookSessionStart() {
  const result = handleSessionStart(cwd);
  if (result) process.stdout.write(result);
}

function readStdin(callback: (data: string) => void) {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { data += chunk; });
  process.stdin.on('end', () => { callback(data); });
  // Timeout after 5 seconds (hooks shouldn't block)
  setTimeout(() => {
    if (!data) callback('{}');
  }, 5000);
}

// ── Help ────────────────────────────────────────────────────────────────────

function cmdHelp() {
  log('');
  log(`  ${PURPLE}${B}CCS Engine${R} ${D}v2.0.0${R}`);
  log(`  ${D}Programming-first context engine for Claude Code${R}`);
  log(`  ${GRAY}${'─'.repeat(48)}${R}`);
  log('');
  log(`  ${B}Indexing${R}`);
  log(`    ${CYN}ccs index${R}                 Build the .ccs/ index`);
  log(`    ${CYN}ccs index --incremental${R}    Re-index only changed files`);
  log(`    ${CYN}ccs update <file>${R}          Update index for one file`);
  log(`    ${CYN}ccs watch${R}                  Watch for changes, auto-update`);
  log('');
  log(`  ${B}Querying${R}`);
  log(`    ${CYN}ccs search <query>${R}         Search the index`);
  log(`    ${CYN}ccs context <query>${R}        Build context blob for Claude`);
  log(`    ${CYN}ccs summary${R}               Project summary for CLAUDE.md`);
  log(`    ${CYN}ccs graph <file>${R}           Show file dependency graph`);
  log(`    ${CYN}ccs stats${R}                 Index statistics`);
  log('');
  log(`  ${B}Hooks${R} ${D}(called by Claude Code automatically)${R}`);
  log(`    ${CYN}ccs hook:prompt${R}            Intercept query, inject context`);
  log(`    ${CYN}ccs hook:post-write${R}        Update index after file change`);
  log(`    ${CYN}ccs hook:session-start${R}     Inject project summary`);
  log('');
  log(`  ${B}Other${R}`);
  log(`    ${CYN}ccs help${R}                  This help`);
  log(`    ${CYN}ccs version${R}               Show version`);
  log('');
}

// ── Run ─────────────────────────────────────────────────────────────────────

main();

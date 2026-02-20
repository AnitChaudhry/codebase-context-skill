#!/usr/bin/env node
// skill-statusline v2.3 — Node.js statusline renderer
// Zero bash dependency — works on Windows, macOS, Linux
// Synchronous stdin read + transcript tail for live activity

'use strict';
const fs = require('fs');
const path = require('path');
try {
  const input = fs.readFileSync(0, 'utf8');
  if (input) render(JSON.parse(input));
} catch (e) { /* silent exit on any error */ }

function getActivity(transcriptPath) {
  try {
    const stat = fs.statSync(transcriptPath);
    const readSize = Math.min(16384, stat.size);
    const buf = Buffer.alloc(readSize);
    const fd = fs.openSync(transcriptPath, 'r');
    fs.readSync(fd, buf, 0, readSize, Math.max(0, stat.size - readSize));
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split('\n').filter(l => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
          const toolUses = entry.message.content.filter(c => c.type === 'tool_use');
          if (toolUses.length) {
            const last = toolUses[toolUses.length - 1];
            const name = last.name;
            const inp = last.input || {};
            // Enrich with context for special tools
            if (name === 'Task' && inp.subagent_type) {
              const desc = inp.description ? ': ' + inp.description.slice(0, 25) : '';
              return `Task(${inp.subagent_type}${desc})`;
            }
            if (name === 'Skill' && inp.skill) return `Skill(${inp.skill})`;
            return name;
          }
        }
      } catch (e) { continue; }
    }
  } catch (e) { /* ignore */ }
  return 'Idle';
}

function getGitInfo(projectDir) {
  let branch = '', remote = '';
  try {
    const gitHead = fs.readFileSync(path.join(projectDir, '.git', 'HEAD'), 'utf8').trim();
    branch = gitHead.startsWith('ref: refs/heads/') ? gitHead.slice(16) : gitHead.slice(0, 7);
  } catch (e) { return 'no-git'; }
  // Parse remote URL from .git/config
  try {
    const config = fs.readFileSync(path.join(projectDir, '.git', 'config'), 'utf8');
    const urlMatch = config.match(/\[remote "origin"\][^[]*url\s*=\s*(.+)/);
    if (urlMatch) {
      const url = urlMatch[1].trim();
      // Extract owner/repo from various URL formats
      const ghMatch = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (ghMatch) remote = ghMatch[1] + '/' + ghMatch[2];
    }
  } catch (e) { /* ignore */ }
  return remote ? `${remote}:${branch}` : branch;
}

function render(data) {
  const RST = '\x1b[0m', BOLD = '\x1b[1m';
  const CYAN = '\x1b[38;2;6;182;212m', PURPLE = '\x1b[38;2;168;85;247m';
  const GREEN = '\x1b[38;2;34;197;94m', YELLOW = '\x1b[38;2;245;158;11m';
  const RED = '\x1b[38;2;239;68;68m', ORANGE = '\x1b[38;2;251;146;60m';
  const WHITE = '\x1b[38;2;228;228;231m', PINK = '\x1b[38;2;236;72;153m';
  const SEP = '\x1b[38;2;55;55;62m', DIM = '\x1b[38;2;40;40;45m';
  const BLUE = '\x1b[38;2;59;130;246m';

  // Model
  const model = data.model?.display_name || 'unknown';

  // Directory — last 3 path segments
  const cwd = (data.workspace?.current_dir || data.cwd || '').replace(/\\/g, '/').replace(/\/\/+/g, '/');
  const parts = cwd.split('/').filter(Boolean);
  const dir = parts.length > 3 ? parts.slice(-3).join('/') : parts.length > 0 ? parts.join('/') : '~';

  // Git — account/repo:branch from .git/HEAD + .git/config
  const projectDir = data.workspace?.project_dir || data.workspace?.current_dir || data.cwd || '';
  const gitInfo = getGitInfo(projectDir);

  // Live activity — tail transcript for current tool/skill/agent/task
  const activity = getActivity(data.transcript_path);

  // Context — use Claude's provided percentage
  let pct = Math.floor(data.context_window?.used_percentage || 0);
  if (pct > 100) pct = 100;
  const ctxClr = pct > 90 ? RED : pct > 75 ? ORANGE : pct > 40 ? YELLOW : WHITE;
  const barW = 40;
  const filled = Math.min(Math.floor(pct * barW / 100), barW);
  const bar = ctxClr + '\u2588'.repeat(filled) + RST + DIM + '\u2591'.repeat(barW - filled) + RST;

  // Cost
  const costRaw = data.cost?.total_cost_usd || 0;
  const cost = costRaw === 0 ? '$0.00' : costRaw < 0.01 ? `$${costRaw.toFixed(4)}` : `$${costRaw.toFixed(2)}`;

  // Tokens — session totals (in + out = total)
  const fmtTok = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : `${n}`;
  const totIn = data.context_window?.total_input_tokens || 0;
  const totOut = data.context_window?.total_output_tokens || 0;
  const tokTotal = fmtTok(totIn + totOut);
  const tokIn = fmtTok(totIn);
  const tokOut = fmtTok(totOut);

  // Session duration
  const durMs = data.cost?.total_duration_ms || 0;
  const durMin = Math.floor(durMs / 60000);
  const durSec = Math.floor((durMs % 60000) / 1000);
  const duration = durMin > 0 ? `${durMin}m ${durSec}s` : `${durSec}s`;

  // Activity color — highlight when active
  const actClr = activity === 'Idle' ? DIM : GREEN;

  // Separator + padding
  const S = `  ${SEP}\u2502${RST}  `;
  const rpad = (s, w) => {
    const plain = s.replace(/\x1b\[[0-9;]*m/g, '');
    return s + (plain.length < w ? ' '.repeat(w - plain.length) : '');
  };
  const C1 = 44;

  // Output 4 rows
  let out = '';
  out += ' ' + rpad(`${actClr}Action:${RST} ${actClr}${activity}${RST}`, C1) + S + `${WHITE}Git:${RST} ${WHITE}${gitInfo}${RST}\n`;
  out += ' ' + rpad(`${PURPLE}Model:${RST} ${PURPLE}${BOLD}${model}${RST}`, C1) + S + `${CYAN}Dir:${RST} ${CYAN}${dir}${RST}\n`;
  out += ' ' + rpad(`${YELLOW}Tokens:${RST} ${YELLOW}${tokIn} ${WHITE}in${RST} ${YELLOW}+ ${tokOut} ${WHITE}out${RST} ${YELLOW}= ${BOLD}${tokTotal}${RST}`, C1) + S + `${GREEN}Cost:${RST} ${GREEN}${cost}${RST}\n`;
  out += ' ' + rpad(`${BLUE}Session:${RST} ${BLUE}${duration}${RST}`, C1) + S + `${ctxClr}Context:${RST} ${bar} ${ctxClr}${pct}%${RST}`;

  process.stdout.write(out);
}

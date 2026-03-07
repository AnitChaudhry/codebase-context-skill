import * as fs from 'fs';
import * as path from 'path';
import { CCSIndex, ContextOutput, ContextBlock, FileSection, SearchResult } from './types';
import { searchIndex, expandWithDependencies } from './searcher';
import { MAX_CONTEXT_FILES, MAX_CONTEXT_LINES, MAX_SECTION_LINES } from './constants';

// ── Context Builder ─────────────────────────────────────────────────────────
// The core of the engine. Takes a query + index, returns the minimal context
// Claude needs to answer accurately. Zero exploration, zero wasted tokens.

export function buildContext(
  query: string,
  index: CCSIndex,
  options: { maxFiles?: number; maxLines?: number } = {}
): ContextOutput {
  const maxFiles = options.maxFiles ?? MAX_CONTEXT_FILES;
  const maxLines = options.maxLines ?? MAX_CONTEXT_LINES;

  // 1. Search the index for matching files
  let results = searchIndex(query, index);

  // 2. Expand with dependency context
  results = expandWithDependencies(results, index);

  // 3. Take top results (within limits)
  const topResults = results.slice(0, maxFiles);

  // 4. For each result, extract the relevant sections
  const blocks: ContextBlock[] = [];
  let totalLines = 0;

  for (const result of topResults) {
    if (totalLines >= maxLines) break;

    const remaining = maxLines - totalLines;
    const block = buildBlock(result, index, query, remaining);
    if (block && block.sections.length > 0) {
      blocks.push(block);
      totalLines += block.sections.reduce((sum, s) => sum + (s.endLine - s.startLine + 1), 0);
    }
  }

  return {
    query,
    files: blocks,
    conventions: index.conventions,
    totalLines,
    totalFiles: blocks.length,
  };
}

// ── Block Builder ───────────────────────────────────────────────────────────
// For a single search result, extract the relevant code sections.

function buildBlock(
  result: SearchResult,
  index: CCSIndex,
  query: string,
  maxLines: number
): ContextBlock | null {
  const absPath = path.join(index.root, result.file);
  if (!fs.existsSync(absPath)) return null;

  let content: string;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }

  const allLines = content.split('\n');
  const sections: FileSection[] = [];
  let linesUsed = 0;

  // Strategy depends on match type
  if (result.matchType === 'symbol') {
    // Extract the matched symbol's definition
    const symbolName = extractSymbolFromDetail(result.matchDetail);
    if (symbolName) {
      const symbolSections = extractSymbolContext(allLines, symbolName, result.node, maxLines);
      for (const section of symbolSections) {
        if (linesUsed + (section.endLine - section.startLine + 1) > maxLines) break;
        sections.push(section);
        linesUsed += section.endLine - section.startLine + 1;
      }
    }
  }

  if (sections.length === 0) {
    // Fallback: extract the most important sections
    // Start with imports (first 5 lines) + exports + key symbols
    const importSection = extractSection(allLines, 1, Math.min(5, allLines.length), 'imports');
    if (importSection) {
      sections.push(importSection);
      linesUsed += importSection.endLine - importSection.startLine + 1;
    }

    // Add exported symbol definitions
    for (const sym of result.node.symbols.filter(s => s.exported)) {
      if (linesUsed >= maxLines) break;
      const endLine = sym.endLine ?? Math.min(sym.line + 15, allLines.length);
      const sectionLines = endLine - sym.line + 1;
      if (linesUsed + sectionLines > maxLines) continue;

      const section = extractSection(
        allLines,
        sym.line,
        endLine,
        `${sym.type} ${sym.name}`
      );
      if (section) {
        sections.push(section);
        linesUsed += sectionLines;
      }
    }
  }

  // If still no sections, take the first N lines (header)
  if (sections.length === 0) {
    const headerLines = Math.min(MAX_SECTION_LINES, maxLines, allLines.length);
    const section = extractSection(allLines, 1, headerLines, 'file header');
    if (section) sections.push(section);
  }

  return {
    file: result.file,
    sections,
    rank: result.node.rank,
    importerCount: result.node.importedBy.length,
    role: result.node.role,
  };
}

// ── Section Extraction ──────────────────────────────────────────────────────

function extractSection(
  lines: string[],
  startLine: number,
  endLine: number,
  reason: string
): FileSection | null {
  const start = Math.max(1, startLine);
  const end = Math.min(lines.length, endLine);
  if (start > end) return null;

  const content = lines.slice(start - 1, end).join('\n');
  return { startLine: start, endLine: end, content, reason };
}

function extractSymbolContext(
  lines: string[],
  symbolName: string,
  node: any,
  maxLines: number
): FileSection[] {
  const sections: FileSection[] = [];

  // Find the symbol in the node's symbol list
  const symbols = node.symbols?.filter((s: any) =>
    s.name.toLowerCase() === symbolName.toLowerCase()
  ) ?? [];

  if (symbols.length === 0) {
    // Fall back to searching line content
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(symbolName)) {
        const start = Math.max(1, i + 1 - 2); // 2 lines before
        const end = Math.min(lines.length, i + 1 + MAX_SECTION_LINES);
        sections.push(extractSection(lines, start, end, `contains "${symbolName}"`)!);
        break;
      }
    }
    return sections.filter(Boolean);
  }

  let linesUsed = 0;
  for (const sym of symbols) {
    if (linesUsed >= maxLines) break;

    // Determine end of symbol (use endLine if available, else scan for block end)
    let endLine = sym.endLine;
    if (!endLine) {
      endLine = findBlockEnd(lines, sym.line - 1);
    }
    endLine = Math.min(endLine, sym.line + MAX_SECTION_LINES - 1);

    const sectionLen = endLine - sym.line + 1;
    if (linesUsed + sectionLen > maxLines) continue;

    const section = extractSection(lines, sym.line, endLine, `${sym.type} ${sym.name}`);
    if (section) {
      sections.push(section);
      linesUsed += sectionLen;
    }
  }

  return sections;
}

/**
 * Find the end of a code block starting at a given line.
 * Tracks brace/indent depth to find the closing brace.
 */
function findBlockEnd(lines: string[], startIdx: number): number {
  let depth = 0;
  let foundOpen = false;

  for (let i = startIdx; i < lines.length && i < startIdx + MAX_SECTION_LINES; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{' || ch === '(') { depth++; foundOpen = true; }
      if (ch === '}' || ch === ')') depth--;
    }
    if (foundOpen && depth <= 0) return i + 1;
  }

  // For Python (indent-based), find where indentation returns to start level
  if (!foundOpen && startIdx < lines.length) {
    const startIndent = lines[startIdx].length - lines[startIdx].trimStart().length;
    for (let i = startIdx + 1; i < lines.length && i < startIdx + MAX_SECTION_LINES; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const indent = line.length - line.trimStart().length;
      if (indent <= startIndent && i > startIdx + 1) return i;
    }
  }

  return Math.min(startIdx + MAX_SECTION_LINES, lines.length);
}

function extractSymbolFromDetail(detail: string): string | null {
  const match = detail.match(/Symbol "(\w+)"/i);
  return match ? match[1] : null;
}

// ── Format Context Output ───────────────────────────────────────────────────
// Formats the context as a compact string for injection into Claude's prompt.

export function formatContext(context: ContextOutput): string {
  const parts: string[] = [];

  parts.push(`## Context for: ${context.query}`);
  parts.push(`> ${context.totalFiles} files, ${context.totalLines} lines of relevant code`);
  parts.push('');

  for (const block of context.files) {
    const meta = [
      `Rank: ${block.rank}`,
      `${block.importerCount} importers`,
      `Role: ${block.role}`,
    ].join(', ');

    parts.push(`### ${block.file} [${meta}]`);

    for (const section of block.sections) {
      parts.push(`Lines ${section.startLine}-${section.endLine}: ${section.reason}`);
      parts.push('```');
      // Add line numbers to each line
      const sectionLines = section.content.split('\n');
      for (let i = 0; i < sectionLines.length; i++) {
        parts.push(`${section.startLine + i}| ${sectionLines[i]}`);
      }
      parts.push('```');
      parts.push('');
    }
  }

  // Add conventions summary (compact)
  if (context.conventions) {
    parts.push('## Conventions');
    parts.push(`- Naming: files=${context.conventions.naming.files}, vars=${context.conventions.naming.variables}, classes=${context.conventions.naming.classes}`);
    parts.push(`- Architecture: ${context.conventions.architecture}`);
    if (context.conventions.testing.framework !== 'unknown') {
      parts.push(`- Testing: ${context.conventions.testing.framework} (${context.conventions.testing.pattern})`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

// ── Project Summary ─────────────────────────────────────────────────────────
// Generates a compact project summary for CLAUDE.md / SessionStart injection.
// Designed to be stable across sessions → maximizes prompt cache hits.

export function generateSummary(index: CCSIndex): string {
  const parts: string[] = [];

  parts.push('## Codebase Summary (auto-generated by CCS engine)');
  parts.push('');
  parts.push(`- **Files:** ${index.stats.totalFiles} | **Lines:** ${index.stats.totalLines.toLocaleString()} | **Dirs:** ${index.stats.totalDirs}`);

  if (index.stats.techStack.length > 0) {
    parts.push(`- **Stack:** ${index.stats.techStack.join(', ')}`);
  }

  if (index.stats.languages.length > 0) {
    const topLangs = index.stats.languages.slice(0, 5)
      .map(l => `${l.language} (${l.percentage}%)`)
      .join(', ');
    parts.push(`- **Languages:** ${topLangs}`);
  }

  parts.push(`- **Architecture:** ${index.conventions.architecture}`);

  if (index.stats.entryPoints.length > 0) {
    parts.push(`- **Entry points:** ${index.stats.entryPoints.join(', ')}`);
  }

  // Top 10 most important files (S and A rank)
  const topFiles = Object.values(index.files)
    .filter(f => f.rank === 'S' || f.rank === 'A')
    .sort((a, b) => b.centrality - a.centrality)
    .slice(0, 10);

  if (topFiles.length > 0) {
    parts.push('');
    parts.push('### Key Files');
    parts.push('| File | Rank | Role | Importers | Exports |');
    parts.push('|------|------|------|-----------|---------|');
    for (const f of topFiles) {
      parts.push(`| ${f.path} | ${f.rank} | ${f.role} | ${f.importedBy.length} | ${f.exports.slice(0, 3).join(', ')}${f.exports.length > 3 ? '...' : ''} |`);
    }
  }

  parts.push('');
  parts.push('> Use `ccs context "<query>"` to get precise context for any task.');
  parts.push(`> Index: .ccs/index.json (${new Date(index.timestamp).toLocaleDateString()})`);

  return parts.join('\n');
}

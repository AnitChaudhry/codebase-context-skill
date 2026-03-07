import * as path from 'path';
import { loadIndex } from './indexer';
import { buildContext, formatContext, generateSummary } from './context';
import { updateFile } from './indexer';
import { HookInput } from './types';

// ── Hook Handlers ───────────────────────────────────────────────────────────
// These functions are called by the CLI when Claude Code triggers hooks.
// They read stdin (JSON), process via the engine, and output results.

/**
 * UserPromptSubmit hook handler.
 * Intercepts the user's query, searches the index, and returns
 * additionalContext with precisely the right codebase context.
 */
export function handlePromptSubmit(input: HookInput, cwd: string): string {
  const query = input.prompt;
  if (!query) return '';

  // Skip if it's a simple greeting or non-code query
  if (isNonCodeQuery(query)) return '';

  const index = loadIndex(cwd);
  if (!index) return '';

  const context = buildContext(query, index);
  if (context.totalFiles === 0) return '';

  const formatted = formatContext(context);

  return JSON.stringify({
    additionalContext: formatted,
  });
}

/**
 * PostToolUse hook handler (async).
 * Called after Write/Edit operations. Updates the index for the changed file.
 */
export function handlePostWrite(input: HookInput, cwd: string): string {
  const filePath = input.tool_input?.file_path || input.tool_input?.path;
  if (!filePath) return '';

  // Resolve to absolute path if relative
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);

  // Update the index for this single file
  updateFile(cwd, absPath);

  return '';
}

/**
 * SessionStart hook handler.
 * Returns a compact project summary for context injection.
 */
export function handleSessionStart(cwd: string): string {
  const index = loadIndex(cwd);
  if (!index) return '';

  const summary = generateSummary(index);
  return summary;
}

/**
 * PreCompact hook handler.
 * Before context compaction, output the project summary so it survives.
 */
export function handlePreCompact(cwd: string): string {
  return handleSessionStart(cwd);
}

// ── Query Classification ────────────────────────────────────────────────────
// Detects queries that don't need codebase context injection.

const NON_CODE_PATTERNS = [
  /^(hi|hello|hey|thanks|thank you|ok|okay|sure|yes|no|yep|nope|bye)/i,
  /^(what is|who is|tell me about|explain)\s+(your|the|a|an|claude)/i,
  /^(help|\/help|\/compact|\/clear|\/config|\/model)/i,
  /^(remember|forget|don't|do not)\s/i,
];

function isNonCodeQuery(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 5) return true;
  if (trimmed.startsWith('/')) return true; // slash commands handle their own context
  return NON_CODE_PATTERNS.some(p => p.test(trimmed));
}

// ── Core Index Types ─────────────────────────────────────────────────────────

export interface CCSIndex {
  version: string;
  timestamp: string;
  root: string;
  stats: ProjectStats;
  files: Record<string, FileNode>;
  symbols: Record<string, SymbolRef[]>;
  conventions: Conventions;
}

export interface ProjectStats {
  totalFiles: number;
  totalDirs: number;
  totalLines: number;
  languages: LanguageStat[];
  techStack: string[];
  entryPoints: string[];
}

export interface LanguageStat {
  language: string;
  files: number;
  lines: number;
  percentage: number;
}

export interface FileNode {
  path: string;
  role: FileRole;
  language: string;
  lines: number;
  size: number;
  hash: string;
  lastModified: number;
  imports: string[];
  importedBy: string[];
  exports: string[];
  symbols: SymbolEntry[];
  rank: FileRank;
  centrality: number;
}

export interface SymbolEntry {
  name: string;
  type: SymbolType;
  line: number;
  endLine?: number;
  exported: boolean;
  signature?: string;
}

export interface SymbolRef {
  file: string;
  line: number;
  type: SymbolType;
  exported: boolean;
}

export type FileRole =
  | 'entry'
  | 'component'
  | 'page'
  | 'service'
  | 'controller'
  | 'model'
  | 'util'
  | 'helper'
  | 'config'
  | 'test'
  | 'type'
  | 'style'
  | 'middleware'
  | 'hook'
  | 'context'
  | 'store'
  | 'api'
  | 'schema'
  | 'script'
  | 'unknown';

export type FileRank = 'S' | 'A' | 'B' | 'C' | 'D';

export type SymbolType =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable'
  | 'const'
  | 'method'
  | 'property';

// ── Conventions ─────────────────────────────────────────────────────────────

export interface Conventions {
  naming: {
    files: string;
    variables: string;
    classes: string;
    functions: string;
  };
  imports: string;
  testing: {
    framework: string;
    pattern: string;
    location: string;
  };
  errorHandling: string;
  architecture: string;
}

// ── Search & Context Types ──────────────────────────────────────────────────

export interface SearchResult {
  file: string;
  score: number;
  matchType: 'path' | 'symbol' | 'import' | 'content' | 'dependency';
  matchDetail: string;
  node: FileNode;
}

export interface ContextBlock {
  file: string;
  sections: FileSection[];
  rank: FileRank;
  importerCount: number;
  role: FileRole;
}

export interface FileSection {
  startLine: number;
  endLine: number;
  content: string;
  reason: string;
}

export interface ContextOutput {
  query: string;
  files: ContextBlock[];
  conventions: Conventions;
  totalLines: number;
  totalFiles: number;
}

// ── Graph Types ─────────────────────────────────────────────────────────────

export interface DependencyGraph {
  adjacency: Record<string, string[]>;
  reverseAdjacency: Record<string, string[]>;
  centrality: Record<string, number>;
}

// ── CLI Types ───────────────────────────────────────────────────────────────

export interface HookInput {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  prompt?: string;
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    path?: string;
    command?: string;
    content?: string;
    pattern?: string;
  };
}

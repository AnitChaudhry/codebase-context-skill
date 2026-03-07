import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  CCSIndex, FileNode, FileRole, ProjectStats, LanguageStat,
  Conventions, SymbolRef,
} from './types';
import { parseFile } from './parsers';
import { buildGraph, rankByCentrality } from './graph';
import {
  IGNORED_DIRS, IGNORED_EXTENSIONS, IGNORED_FILES, LANGUAGE_MAP,
  ENTRY_PATTERNS, CONFIG_PATTERNS, TEST_PATTERNS, PACKAGE_FILES,
  MAX_FILE_SIZE,
} from './constants';

const CCS_DIR = '.ccs';
const INDEX_FILE = 'index.json';

// ── Main Indexer ────────────────────────────────────────────────────────────

export interface IndexOptions {
  root: string;
  incremental?: boolean;
}

export function indexProject(options: IndexOptions): CCSIndex {
  const { root, incremental } = options;
  const ccsDir = path.join(root, CCS_DIR);
  const indexPath = path.join(ccsDir, INDEX_FILE);

  // Load existing index for incremental mode
  let existing: CCSIndex | null = null;
  if (incremental && fs.existsSync(indexPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch { /* rebuild from scratch */ }
  }

  // Walk the file tree
  const filePaths = walkTree(root);

  // Parse each file
  const fileNodes = new Map<string, FileNode>();
  const fileImports = new Map<string, string[]>();
  let totalLines = 0;
  const langCounts = new Map<string, { files: number; lines: number }>();

  for (const absPath of filePaths) {
    const relPath = path.relative(root, absPath).replace(/\\/g, '/');
    const ext = path.extname(absPath).toLowerCase();
    const language = LANGUAGE_MAP[ext] || '';

    // Incremental: skip unchanged files
    if (incremental && existing) {
      const existingNode = existing.files[relPath];
      if (existingNode) {
        const stat = fs.statSync(absPath);
        const hash = hashFile(absPath);
        if (existingNode.hash === hash) {
          fileNodes.set(relPath, existingNode);
          fileImports.set(relPath, existingNode.imports);
          totalLines += existingNode.lines;
          const lc = langCounts.get(existingNode.language) || { files: 0, lines: 0 };
          lc.files++;
          lc.lines += existingNode.lines;
          langCounts.set(existingNode.language, lc);
          continue;
        }
      }
    }

    const stat = fs.statSync(absPath);
    if (stat.size > MAX_FILE_SIZE) continue;

    let content: string;
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch {
      continue; // Skip unreadable files
    }

    const lines = content.split('\n').length;
    totalLines += lines;

    // Track language stats
    if (language) {
      const lc = langCounts.get(language) || { files: 0, lines: 0 };
      lc.files++;
      lc.lines += lines;
      langCounts.set(language, lc);
    }

    // Parse imports, exports, symbols
    const parsed = language ? parseFile(content, language, relPath) : { imports: [], exports: [], symbols: [] };

    // Resolve relative imports to project-relative paths
    const resolvedImports = parsed.imports
      .filter(imp => imp.startsWith('.') || imp.startsWith('/'))
      .map(imp => resolveImport(relPath, imp, root))
      .filter((imp): imp is string => imp !== null);

    const role = classifyFile(relPath, ext, content);
    const hash = hashContent(content);

    const node: FileNode = {
      path: relPath,
      role,
      language: language || path.extname(absPath).slice(1),
      lines,
      size: stat.size,
      hash,
      lastModified: stat.mtimeMs,
      imports: resolvedImports,
      importedBy: [], // filled after graph build
      exports: parsed.exports,
      symbols: parsed.symbols,
      rank: 'D', // updated after graph build
      centrality: 0,
    };

    fileNodes.set(relPath, node);
    fileImports.set(relPath, resolvedImports);
  }

  // Build dependency graph
  const graph = buildGraph(fileImports);

  // Update nodes with graph data
  for (const [filePath, node] of fileNodes) {
    const importerCount = graph.reverseAdjacency[filePath]?.length ?? 0;
    node.importedBy = graph.reverseAdjacency[filePath] ?? [];
    node.centrality = importerCount;
    node.rank = rankByCentrality(importerCount);
  }

  // Build symbol index (global lookup)
  const symbols: Record<string, SymbolRef[]> = {};
  for (const [filePath, node] of fileNodes) {
    for (const sym of node.symbols) {
      if (!symbols[sym.name]) symbols[sym.name] = [];
      symbols[sym.name].push({
        file: filePath,
        line: sym.line,
        type: sym.type,
        exported: sym.exported,
      });
    }
  }

  // Detect tech stack
  const techStack = detectTechStack(root);

  // Detect conventions
  const conventions = detectConventions(fileNodes, root);

  // Find entry points
  const entryPoints = Array.from(fileNodes.values())
    .filter(n => n.role === 'entry')
    .map(n => n.path);

  // Build language stats
  const languages: LanguageStat[] = Array.from(langCounts.entries())
    .map(([language, { files, lines }]) => ({
      language,
      files,
      lines,
      percentage: Math.round((lines / (totalLines || 1)) * 100),
    }))
    .sort((a, b) => b.lines - a.lines);

  // Count directories
  const dirs = new Set<string>();
  for (const filePath of fileNodes.keys()) {
    const dir = path.dirname(filePath);
    if (dir !== '.') dirs.add(dir);
  }

  const stats: ProjectStats = {
    totalFiles: fileNodes.size,
    totalDirs: dirs.size,
    totalLines,
    languages,
    techStack,
    entryPoints,
  };

  const index: CCSIndex = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    root,
    stats,
    files: Object.fromEntries(fileNodes),
    symbols,
    conventions,
  };

  // Write index
  if (!fs.existsSync(ccsDir)) fs.mkdirSync(ccsDir, { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  return index;
}

// ── Update a single file in the index ───────────────────────────────────────

export function updateFile(root: string, filePath: string): CCSIndex | null {
  const indexPath = path.join(root, CCS_DIR, INDEX_FILE);
  if (!fs.existsSync(indexPath)) return null;

  const index: CCSIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const relPath = path.relative(root, filePath).replace(/\\/g, '/');
  const absPath = path.resolve(root, filePath);

  if (!fs.existsSync(absPath)) {
    // File was deleted
    delete index.files[relPath];
    // Remove from symbol index
    for (const [name, refs] of Object.entries(index.symbols)) {
      index.symbols[name] = refs.filter(r => r.file !== relPath);
      if (index.symbols[name].length === 0) delete index.symbols[name];
    }
    // Remove from importedBy lists
    for (const node of Object.values(index.files)) {
      node.importedBy = node.importedBy.filter(f => f !== relPath);
      node.imports = node.imports.filter(f => f !== relPath);
    }
  } else {
    // File was created or modified — re-parse it
    const ext = path.extname(absPath).toLowerCase();
    const language = LANGUAGE_MAP[ext] || '';
    const stat = fs.statSync(absPath);

    if (stat.size > MAX_FILE_SIZE) return index;

    let content: string;
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch {
      return index;
    }

    const lines = content.split('\n').length;
    const parsed = language ? parseFile(content, language, relPath) : { imports: [], exports: [], symbols: [] };
    const resolvedImports = parsed.imports
      .filter(imp => imp.startsWith('.') || imp.startsWith('/'))
      .map(imp => resolveImport(relPath, imp, root))
      .filter((imp): imp is string => imp !== null);

    const role = classifyFile(relPath, ext, content);

    // Remove old importedBy references
    const oldNode = index.files[relPath];
    if (oldNode) {
      for (const imp of oldNode.imports) {
        if (index.files[imp]) {
          index.files[imp].importedBy = index.files[imp].importedBy.filter(f => f !== relPath);
        }
      }
    }

    const node: FileNode = {
      path: relPath,
      role,
      language: language || ext.slice(1),
      lines,
      size: stat.size,
      hash: hashContent(content),
      lastModified: stat.mtimeMs,
      imports: resolvedImports,
      importedBy: [], // recalculated below
      exports: parsed.exports,
      symbols: parsed.symbols,
      rank: 'D',
      centrality: 0,
    };

    index.files[relPath] = node;

    // Rebuild importedBy for this file's imports
    for (const imp of resolvedImports) {
      if (index.files[imp]) {
        if (!index.files[imp].importedBy.includes(relPath)) {
          index.files[imp].importedBy.push(relPath);
        }
      }
    }

    // Recalculate importedBy for this file
    for (const otherNode of Object.values(index.files)) {
      if (otherNode.imports.includes(relPath) && !node.importedBy.includes(otherNode.path)) {
        node.importedBy.push(otherNode.path);
      }
    }

    node.centrality = node.importedBy.length;
    node.rank = rankByCentrality(node.centrality);

    // Update symbol index
    for (const [name, refs] of Object.entries(index.symbols)) {
      index.symbols[name] = refs.filter(r => r.file !== relPath);
      if (index.symbols[name].length === 0) delete index.symbols[name];
    }
    for (const sym of node.symbols) {
      if (!index.symbols[sym.name]) index.symbols[sym.name] = [];
      index.symbols[sym.name].push({
        file: relPath,
        line: sym.line,
        type: sym.type,
        exported: sym.exported,
      });
    }
  }

  index.timestamp = new Date().toISOString();
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  return index;
}

// ── Load existing index ─────────────────────────────────────────────────────

export function loadIndex(root: string): CCSIndex | null {
  const indexPath = path.join(root, CCS_DIR, INDEX_FILE);
  if (!fs.existsSync(indexPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    return null;
  }
}

// ── File Tree Walker ────────────────────────────────────────────────────────

function walkTree(root: string): string[] {
  const files: string[] = [];

  // Respect .gitignore if present
  const gitignorePatterns = loadGitignore(root);

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        if (isGitignored(relPath, gitignorePatterns)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        if (IGNORED_FILES.has(entry.name)) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (IGNORED_EXTENSIONS.has(ext)) continue;
        if (isGitignored(relPath, gitignorePatterns)) continue;
        files.push(fullPath);
      }
    }
  }

  walk(root);
  return files;
}

function loadGitignore(root: string): string[] {
  const gitignorePath = path.join(root, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];

  return fs.readFileSync(gitignorePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function isGitignored(relPath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const cleanPattern = pattern.replace(/^\//, '').replace(/\/$/, '');
    if (relPath.startsWith(cleanPattern + '/') || relPath === cleanPattern) return true;
    if (cleanPattern.includes('*')) {
      const regex = new RegExp(
        '^' + cleanPattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '(/|$)'
      );
      if (regex.test(relPath)) return true;
    }
  }
  return false;
}

// ── File Classification ─────────────────────────────────────────────────────

function classifyFile(relPath: string, ext: string, content: string): FileRole {
  const basename = path.basename(relPath, ext).toLowerCase();
  const dir = path.dirname(relPath).toLowerCase();
  const firstLines = content.split('\n').slice(0, 20).join('\n').toLowerCase();

  // Test files
  for (const pattern of TEST_PATTERNS) {
    if (pattern.test(relPath)) return 'test';
  }

  // Config files
  for (const pattern of CONFIG_PATTERNS) {
    if (pattern.test(path.basename(relPath))) return 'config';
  }

  // Entry points
  for (const entry of ENTRY_PATTERNS) {
    if (basename === entry || basename === `${entry}.server` || basename === `${entry}.client`) {
      return 'entry';
    }
  }

  // Style files
  if (['.css', '.scss', '.sass', '.less', '.styl'].includes(ext)) return 'style';

  // Type definition files
  if (relPath.endsWith('.d.ts') || dir.includes('types') || basename.includes('type')) return 'type';

  // Classify by directory name
  if (dir.includes('component') || dir.includes('widget')) return 'component';
  if (dir.includes('page') || dir.includes('view') || dir.includes('screen')) return 'page';
  if (dir.includes('service')) return 'service';
  if (dir.includes('controller') || dir.includes('handler')) return 'controller';
  if (dir.includes('model') || dir.includes('entity') || dir.includes('schema')) return 'model';
  if (dir.includes('util') || dir.includes('lib') || dir.includes('common')) return 'util';
  if (dir.includes('helper')) return 'helper';
  if (dir.includes('middleware')) return 'middleware';
  if (dir.includes('hook')) return 'hook';
  if (dir.includes('context') || dir.includes('provider')) return 'context';
  if (dir.includes('store') || dir.includes('state') || dir.includes('redux') || dir.includes('zustand')) return 'store';
  if (dir.includes('api') || dir.includes('route') || dir.includes('endpoint')) return 'api';
  if (dir.includes('script') || dir.includes('bin') || dir.includes('tool')) return 'script';

  // Classify by content patterns
  if (firstLines.includes('express') || firstLines.includes('fastify') || firstLines.includes('koa')) {
    if (firstLines.includes('router') || firstLines.includes('route')) return 'api';
    if (firstLines.includes('middleware')) return 'middleware';
  }
  if (firstLines.includes('react') || firstLines.includes('vue') || firstLines.includes('svelte')) {
    if (firstLines.includes('export default') || firstLines.includes('export function')) return 'component';
  }

  return 'unknown';
}

// ── Import Resolution ───────────────────────────────────────────────────────

function resolveImport(fromFile: string, importPath: string, root: string): string | null {
  const fromDir = path.dirname(fromFile);
  let resolved = path.posix.normalize(path.posix.join(fromDir, importPath));

  // Try exact match
  const absResolved = path.join(root, resolved);
  if (fs.existsSync(absResolved) && fs.statSync(absResolved).isFile()) {
    return resolved;
  }

  // Try with extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.vue', '.svelte'];
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (fs.existsSync(path.join(root, withExt))) return withExt;
  }

  // Try as directory with index file
  for (const ext of extensions) {
    const indexFile = path.posix.join(resolved, 'index' + ext);
    if (fs.existsSync(path.join(root, indexFile))) return indexFile;
  }

  return null;
}

// ── Tech Stack Detection ────────────────────────────────────────────────────

function detectTechStack(root: string): string[] {
  const stack: string[] = [];

  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const depNames = Object.keys(allDeps);

      // Frameworks
      if (depNames.includes('next')) stack.push('Next.js');
      else if (depNames.includes('nuxt')) stack.push('Nuxt');
      else if (depNames.includes('@angular/core')) stack.push('Angular');
      else if (depNames.includes('svelte') || depNames.includes('@sveltejs/kit')) stack.push('SvelteKit');
      else if (depNames.includes('astro')) stack.push('Astro');
      else if (depNames.includes('gatsby')) stack.push('Gatsby');
      else if (depNames.includes('remix')) stack.push('Remix');

      if (depNames.includes('react')) stack.push('React');
      if (depNames.includes('vue')) stack.push('Vue');

      // Backend
      if (depNames.includes('express')) stack.push('Express');
      if (depNames.includes('fastify')) stack.push('Fastify');
      if (depNames.includes('nest') || depNames.includes('@nestjs/core')) stack.push('NestJS');
      if (depNames.includes('hono')) stack.push('Hono');

      // ORMs / DB
      if (depNames.includes('prisma') || depNames.includes('@prisma/client')) stack.push('Prisma');
      if (depNames.includes('drizzle-orm')) stack.push('Drizzle');
      if (depNames.includes('typeorm')) stack.push('TypeORM');
      if (depNames.includes('mongoose')) stack.push('Mongoose');
      if (depNames.includes('sequelize')) stack.push('Sequelize');

      // Testing
      if (depNames.includes('vitest')) stack.push('Vitest');
      else if (depNames.includes('jest')) stack.push('Jest');
      if (depNames.includes('@playwright/test')) stack.push('Playwright');
      if (depNames.includes('cypress')) stack.push('Cypress');

      // Build tools
      if (depNames.includes('vite')) stack.push('Vite');
      if (depNames.includes('webpack')) stack.push('Webpack');
      if (depNames.includes('esbuild')) stack.push('esbuild');
      if (depNames.includes('turbo') || depNames.includes('@turbo/gen')) stack.push('Turborepo');

      // Languages
      if (depNames.includes('typescript')) stack.push('TypeScript');

      // Styling
      if (depNames.includes('tailwindcss')) stack.push('Tailwind CSS');
      if (depNames.includes('styled-components')) stack.push('Styled Components');

    } catch { /* ignore */ }
  }

  // Python
  if (fs.existsSync(path.join(root, 'pyproject.toml'))) {
    stack.push('Python');
    const content = fs.readFileSync(path.join(root, 'pyproject.toml'), 'utf8');
    if (content.includes('django')) stack.push('Django');
    if (content.includes('fastapi')) stack.push('FastAPI');
    if (content.includes('flask')) stack.push('Flask');
    if (content.includes('pytest')) stack.push('pytest');
  } else if (fs.existsSync(path.join(root, 'requirements.txt'))) {
    stack.push('Python');
  }

  // Go
  if (fs.existsSync(path.join(root, 'go.mod'))) {
    stack.push('Go');
    const content = fs.readFileSync(path.join(root, 'go.mod'), 'utf8');
    if (content.includes('gin-gonic')) stack.push('Gin');
    if (content.includes('fiber')) stack.push('Fiber');
    if (content.includes('echo')) stack.push('Echo');
  }

  // Rust
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) {
    stack.push('Rust');
    const content = fs.readFileSync(path.join(root, 'Cargo.toml'), 'utf8');
    if (content.includes('actix')) stack.push('Actix');
    if (content.includes('axum')) stack.push('Axum');
    if (content.includes('tokio')) stack.push('Tokio');
  }

  return [...new Set(stack)];
}

// ── Conventions Detection ───────────────────────────────────────────────────

function detectConventions(files: Map<string, FileNode>, root: string): Conventions {
  const fileNames: string[] = [];
  const varNames: string[] = [];
  const classNames: string[] = [];
  const funcNames: string[] = [];
  let testFramework = 'unknown';
  let testPattern = '';
  let testLocation = 'unknown';
  let importStyle = 'relative';
  let errorStyle = 'try-catch';
  let architecture = 'unknown';

  // Sample up to 20 files for convention detection
  const sampleFiles = Array.from(files.values())
    .filter(f => f.language && !['json', 'yaml', 'toml', 'markdown', 'html', 'css'].includes(f.language))
    .slice(0, 20);

  for (const node of sampleFiles) {
    const basename = path.basename(node.path, path.extname(node.path));
    fileNames.push(basename);

    for (const sym of node.symbols) {
      if (sym.type === 'function' || sym.type === 'method') funcNames.push(sym.name);
      if (sym.type === 'class') classNames.push(sym.name);
      if (sym.type === 'const' || sym.type === 'variable') varNames.push(sym.name);
    }
  }

  // Detect test framework
  const testFiles = Array.from(files.values()).filter(f => f.role === 'test');
  if (testFiles.length > 0) {
    const testPath = testFiles[0].path;
    if (testPath.match(/\.test\./)) testPattern = '*.test.*';
    else if (testPath.match(/\.spec\./)) testPattern = '*.spec.*';
    else if (testPath.match(/test_/)) testPattern = 'test_*';

    if (testPath.includes('__tests__')) testLocation = 'colocated (__tests__/)';
    else if (testPath.includes('/tests/') || testPath.includes('/test/')) testLocation = 'separate (tests/)';
    else testLocation = 'colocated';
  }

  // Detect architecture from directory structure
  const topDirs = new Set<string>();
  for (const filePath of files.keys()) {
    const parts = filePath.split('/');
    if (parts.length > 1) topDirs.add(parts[0]);
  }

  if (topDirs.has('src') && topDirs.has('app')) architecture = 'Next.js app router';
  else if (topDirs.has('pages') && topDirs.has('components')) architecture = 'page-based (Next/Nuxt)';
  else if (topDirs.has('controllers') && topDirs.has('models') && topDirs.has('views')) architecture = 'MVC';
  else if (topDirs.has('cmd') && topDirs.has('internal')) architecture = 'Go standard layout';
  else if (topDirs.has('src') && topDirs.has('lib')) architecture = 'library';
  else if (topDirs.has('src')) architecture = 'src-based';
  else architecture = 'flat';

  return {
    naming: {
      files: detectCase(fileNames, 'files'),
      variables: detectCase(varNames, 'variables'),
      classes: detectCase(classNames, 'classes'),
      functions: detectCase(funcNames, 'functions'),
    },
    imports: importStyle,
    testing: {
      framework: testFramework,
      pattern: testPattern,
      location: testLocation,
    },
    errorHandling: errorStyle,
    architecture,
  };
}

function detectCase(names: string[], _context: string): string {
  if (names.length === 0) return 'unknown';

  let camel = 0, pascal = 0, kebab = 0, snake = 0;
  for (const name of names) {
    if (name.includes('-')) kebab++;
    else if (name.includes('_')) snake++;
    else if (/^[A-Z]/.test(name)) pascal++;
    else if (/^[a-z]/.test(name)) camel++;
  }

  const max = Math.max(camel, pascal, kebab, snake);
  if (max === kebab) return 'kebab-case';
  if (max === snake) return 'snake_case';
  if (max === pascal) return 'PascalCase';
  return 'camelCase';
}

// ── Hashing ─────────────────────────────────────────────────────────────────

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
}

function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
}

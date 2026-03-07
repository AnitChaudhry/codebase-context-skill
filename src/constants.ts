// Directories to always skip during indexing
export const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  'coverage', '.cache', '.turbo', '.nuxt', '.output', '.svelte-kit',
  '.parcel-cache', 'vendor', 'target', '.gradle', '.idea', '.vscode',
  '.ccs', '.claude', 'venv', '.venv', 'env', '.env', '__mocks__',
  '.pytest_cache', '.mypy_cache', '.tox', 'eggs', '*.egg-info',
]);

// File extensions to skip (binary, generated, non-source)
export const IGNORED_EXTENSIONS = new Set([
  '.lock', '.min.js', '.min.css', '.map', '.d.ts',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.pyc', '.pyo', '.class', '.o', '.obj',
  '.sqlite', '.db', '.sqlite3',
]);

// Files to always skip
export const IGNORED_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  'composer.lock', 'Gemfile.lock', 'Cargo.lock', 'poetry.lock',
  'go.sum', 'Pipfile.lock',
  '.DS_Store', 'Thumbs.db', 'desktop.ini',
]);

// Source file extensions → language mapping
export const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp',
  '.c': 'c',
  '.swift': 'swift',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.scala': 'scala',
  '.r': 'r', '.R': 'r',
  '.lua': 'lua',
  '.dart': 'dart',
  '.ex': 'elixir', '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.ml': 'ocaml', '.mli': 'ocaml',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.astro': 'astro',
  '.sql': 'sql',
  '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
  '.css': 'css', '.scss': 'scss', '.sass': 'sass', '.less': 'less',
  '.html': 'html', '.htm': 'html',
  '.json': 'json',
  '.yaml': 'yaml', '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.md': 'markdown',
  '.graphql': 'graphql', '.gql': 'graphql',
  '.proto': 'protobuf',
};

// Entry point file patterns (basename)
export const ENTRY_PATTERNS = [
  'index', 'main', 'app', 'server', 'cli',
  'mod', 'lib', 'init', '__init__',
  'manage', 'wsgi', 'asgi',
];

// Config file patterns
export const CONFIG_PATTERNS = [
  /^tsconfig/, /^\.eslint/, /^\.prettier/, /^jest\.config/,
  /^vitest\.config/, /^vite\.config/, /^next\.config/, /^nuxt\.config/,
  /^webpack\.config/, /^rollup\.config/, /^babel\.config/, /^\.babel/,
  /^tailwind\.config/, /^postcss\.config/, /^docker-compose/,
  /^Dockerfile/, /^Makefile/, /^CMakeLists/,
  /^\.env\.example$/, /^\.editorconfig$/, /^\.gitignore$/,
];

// Test file patterns
export const TEST_PATTERNS = [
  /\.test\.\w+$/, /\.spec\.\w+$/, /\.tests\.\w+$/,
  /^test_/, /_test\.\w+$/, /_spec\.\w+$/,
  /\/tests?\//, /\/__tests__\//,
];

// Package manager files that indicate tech stack
export const PACKAGE_FILES = [
  'package.json', 'pyproject.toml', 'setup.py', 'setup.cfg',
  'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts',
  'Gemfile', 'requirements.txt', 'Pipfile', 'composer.json',
  'mix.exs', 'pubspec.yaml', 'Package.swift',
];

// Max file size to parse (skip very large files)
export const MAX_FILE_SIZE = 500 * 1024; // 500KB

// Max lines to read for import extraction
export const IMPORT_SCAN_LINES = 80;

// Max lines to read for symbol extraction
export const SYMBOL_SCAN_LINES = 500;

// Context builder limits
export const MAX_CONTEXT_FILES = 15;
export const MAX_CONTEXT_LINES = 300;
export const MAX_SECTION_LINES = 50;

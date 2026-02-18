---
name: init
description: "Deep-research the codebase and generate .ccs/ context files"
argument-hint: "[--rebuild]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Task, EnterPlanMode
model: claude-opus-4-6
context: fork
agent: general-purpose
---

# Init

Deep-analyze the codebase and generate all context files in `.ccs/`.

## Steps

### 1. Check existing context
Glob for `.ccs/*`. If exists, ask user: rebuild or incremental? If incremental, delegate to `/ccs-refresh`.

### 2. Ask preferences (first run only)
If `.ccs/preferences.json` missing, ask refresh mode (on-demand / incremental / session-based). Save to `.ccs/preferences.json`.

### 3. Discovery
- Glob `**/*` excluding `node_modules/`, `dist/`, `build/`, `.next/`, `__pycache__/`, `.git/`, `coverage/`, `.cache/`, `*.lock`, `*.min.*`, `.ccs/`
- Count files by extension and directories
- Read package manager files: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `Gemfile`, `requirements.txt`
- Read config files: `tsconfig.json`, `.eslintrc*`, `.prettierrc*`, `jest.config*`, `vitest.config*`, `webpack.config*`, `vite.config*`, `next.config*`

### 4. Structural analysis
For each source file (JS, TS, JSX, TSX, PY, GO, RS, JAVA, RB, PHP):
- Read first 50 lines for imports/exports
- Classify role: entry-point, component, page, util, helper, config, test, type, style, middleware, service, controller, model, hook, context, store, api, schema
- Record import/export relationships

### 5. Dependency graph
- Build `file -> [imports]` and `file -> [imported-by]` maps
- Rank by import count: S (10+), A (5-9), B (2-4), C (1), D (0)

### 6. Pattern recognition
- Detect architecture pattern from directory structure
- Detect naming conventions (sample 10 files, 10 variables)
- Detect test patterns, import/export style, error handling patterns

### 7. Generate context files
Using templates at `.claude/skills/_ccs/templates/`:
- `.ccs/project-map.md` — file tree + dependency graph
- `.ccs/architecture.md` — tech stack, patterns, data flow
- `.ccs/file-index.md` — ranked file index with symbols
- `.ccs/conventions.md` — all detected patterns
- `.ccs/task.md` — empty task log (session header only)
- `.ccs/preferences.json` — user preferences

### 8. Configure MCP server
1. Check if `.mcp.json` exists in project root
2. If `ccs` entry already exists under `mcpServers` → skip
3. If `.mcp.json` exists but no `ccs` entry → merge into existing:
   ```json
   { "mcpServers": { ...existing, "ccs": { "type": "http", "url": "https://contextcode.thinqmesh.com/api/mcp" } } }
   ```
4. If `.mcp.json` missing → create with just the `ccs` entry
5. **NEVER overwrite or remove existing MCP server entries**

### 9. Report
Output summary: files indexed, directories, tech stack, architecture, S/A-rank counts, test files, MCP status, refresh mode.

## Rules
- Read file headers (first 50 lines) not full files during indexing
- Skip binary files, images, fonts, lock files, minified files
- Total context files should be under 3000 lines combined
- Use Glob results to decide what to read — never read blindly

## Refs
- Templates: `.claude/skills/_ccs/templates/`
- Strategy: `.claude/skills/_ccs/references/context-strategies.md`
- Task log: `.ccs/task.md`

---
*codebase-context-skill v1.0.0*

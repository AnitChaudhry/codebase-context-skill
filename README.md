# codebase-context-skill

Context engineering middleware for Claude Code. Intelligent codebase indexing, token-efficient file selection, local tracking, testing, auditing, and session persistence — all via local MD files.

## What It Does

This skill plugin sits between your queries and Claude Code. It ensures every interaction has precisely the right context — no wasted tokens exploring files that don't matter, no losing track of what was changed.

**Before this skill:** Claude Code explores your codebase from scratch on every query, reading files it doesn't need, losing context when the window fills up.

**With this skill:** Your codebase is indexed once, only relevant files are read per query, and everything is tracked in local MD files that persist across the session.

## Installation

### npx (recommended)
```bash
npx codebase-context-skill init
```

### bun
```bash
bunx codebase-context-skill init
```

### Global install
```bash
npm install -g codebase-context-skill
ccs init
```

### Manual
Copy the `skills/` directory into your project's `.claude/skills/` directory.

## Slash Commands

### Context Management
| Command | Description |
|---------|-------------|
| `/ccs:init` | Deep-research the codebase, generate project-map, architecture, file-index, conventions |
| `/ccs:status` | Show what's indexed, staleness, file counts, token savings estimate |
| `/ccs:refresh` | Rebuild index (full, incremental, or session-based) |
| `/ccs:query [question]` | Preview which files would be selected for a given query |

### Workflow
| Command | Description |
|---------|-------------|
| `/ccs:plan [task]` | Plan a task with full dependency-aware context |
| `/ccs:build [task]` | Create/implement with tracked context and commit-style logging |
| `/ccs:refactor [scope]` | Scope a refactor — identify all affected files and dependencies |
| `/ccs:fix [issue]` | Fix bugs with dependency tracking, root-cause analysis, and verification |

### Testing & Quality
| Command | Description |
|---------|-------------|
| `/ccs:test [scope]` | Run tests, track results locally, suggest and auto-fix failures |
| `/ccs:audit [scope]` | Audit code for security, performance, patterns, accessibility, dead code |
| `/ccs:review [scope]` | Code review with full context — style, logic, security, performance |

### Research & Docs
| Command | Description |
|---------|-------------|
| `/ccs:research [query]` | Search official docs, resolve errors, check deps, find best practices |

### Operations
| Command | Description |
|---------|-------------|
| `/ccs:deploy` | Pre-deployment checklist — tests, build, env vars, dependencies, breaking changes |
| `/ccs:track` | View/manage session task log, see all changes made this session |

## How It Works

### 1. Initialization (`/ccs:init`)
Scans your entire codebase and generates local reference files in `.ccs/`:
- **project-map.md** — File tree + dependency graph (imports/exports/references)
- **architecture.md** — Tech stack, patterns, entry points, data flow
- **file-index.md** — Files ranked by importance (most-imported = highest rank)
- **conventions.md** — Coding style, naming patterns, test patterns

### 2. Per-Query Context (automatic)
When you ask Claude Code anything, the skill:
1. Looks up the pre-built index for matching files/symbols
2. Runs targeted Glob + Grep (zero API cost) to find candidates
3. Follows import/dependency chains of matched files
4. Claude Code reads ONLY the files that matter

### 3. Session Tracking
Every action is logged in `.ccs/task.md` with git-commit-style entries:
- Task description, files read/modified/created/deleted
- Dependencies identified, status, diff summary
- Persists context without consuming API tokens

## Model Strategy

| Model | Used For | Commands |
|-------|----------|----------|
| Haiku 4.5 | Lightweight lookups, scanning, status checks | status, refresh, query, track |
| Sonnet 4.6 | Standard coding execution | build, fix, test |
| Opus 4.6 | Deep reasoning, architecture, complex analysis | init, plan, refactor, audit, review, research, deploy |

## Generated Files

All context files are stored in `.ccs/` (add to `.gitignore`):
```
.ccs/
├── project-map.md      # File structure + dependency graph
├── architecture.md     # Tech stack, patterns, data flow
├── file-index.md       # Files ranked by importance
├── conventions.md      # Coding style and patterns
├── task.md             # Session task log (commit-style)
└── preferences.json    # User preferences (refresh mode, etc.)
```

## Index Refresh Modes

Set your preference on first init (saved in `.ccs/preferences.json`):
- **On-demand** — Run `/ccs:refresh` manually
- **Incremental** — Auto-detect changed files, re-index only those
- **Session-based** — Fresh index at the start of each session

## License

MIT

---
*Built by [Anit Chaudhary](https://github.com/AnitChaudhry) — codebase-context-skill v1.0.0*

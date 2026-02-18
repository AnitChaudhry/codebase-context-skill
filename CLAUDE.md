# Codebase Context Skill

Context engineering middleware for Claude Code. Builds intelligent, token-efficient context for every user query by indexing the codebase locally and maintaining session state as MD files.

## Slash Commands

### Context Management
| Command | Purpose |
|---------|---------|
| `/ccs-init` | Deep-research the codebase, generate project-map, architecture, file-index, conventions |
| `/ccs-status` | Show what's indexed, staleness, file counts, token savings |
| `/ccs-refresh` | Rebuild index (full, incremental, or session-based per user preference) |
| `/ccs-query` | Preview which files would be selected for a given query |

### Workflow
| Command | Purpose |
|---------|---------|
| `/ccs-plan` | Plan a task with full dependency-aware context |
| `/ccs-build` | Create/implement with tracked context and commit-style logging |
| `/ccs-refactor` | Scope a refactor — identify all affected files and dependencies |
| `/ccs-fix` | Fix bugs with dependency tracking, root-cause analysis, and verification |

### Testing & Quality
| Command | Purpose |
|---------|---------|
| `/ccs-test` | Run tests, track results, suggest fixes, auto-fix failing tests |
| `/ccs-audit` | Audit code for security, performance, patterns, accessibility, dead code |
| `/ccs-review` | Code review with context — style, logic, security, performance checks |

### Research & Docs
| Command | Purpose |
|---------|---------|
| `/ccs-research` | Search official docs, resolve errors, check dependency health, find best practices |

### Setup
| Command | Purpose |
|---------|---------|
| `/ccs-connect` | Set up MCP server — creates/updates .mcp.json, configures remote tools endpoint, verifies connection |

### Git Workflow
| Command | Purpose |
|---------|---------|
| `/ccs-branch` | Create/switch branches with auto-generated context reference files |
| `/ccs-pr` | Prepare PR with full context — title, summary, blast radius, review areas |
| `/ccs-merge` | Merge with dependency checking — conflict prediction, resolution context |
| `/ccs-diff` | Smart diff with impact analysis — dependency chains, blast radius, categorization |
| `/ccs-sync` | Pull/rebase/push with conflict context and resolution recommendations |
| `/ccs-stash` | Stash with tracked context — remembers what you were working on |
| `/ccs-log` | Smart commit history — groups by branch, cross-references with task.md |

### Operations
| Command | Purpose |
|---------|---------|
| `/ccs-deploy` | Pre-deployment checklist — tests, build, env vars, dependencies, breaking changes |
| `/ccs-track` | View/manage session task log, see all changes made this session |

## Model Strategy
- **Haiku 4.5**: File scanning, index lookup, status checks, query preview, session tracking, stash, log
- **Sonnet 4.6**: Building features, fixing bugs, running tests, branch management, sync (standard coding execution)
- **Opus 4.6**: Initialization, planning, refactoring, auditing, code review, research, deployment, PR preparation, merge analysis, diff impact analysis (deep reasoning, architecture, complex analysis)

## Context Files (generated in `.ccs/`)
- `project-map.md` — File structure + dependency graph
- `architecture.md` — Tech stack, patterns, entry points, data flow
- `file-index.md` — Files ranked by importance/centrality
- `conventions.md` — Coding style, naming, testing patterns
- `task.md` — Session task log with commit-style entries
- `preferences.json` — User preferences (refresh mode, etc.)
- `branches/<name>.md` — Per-branch reference: purpose, changed files, diffs, dependencies
- `pulls/<name>.md` — PR documentation: summary, blast radius, review areas
- `merge-history.md` — Append-only merge log with conflict resolutions
- `commit-log.md` — Summarized commit history with task cross-references

## Key Directories
```
codebase-context-skill/
├── skills/          # All slash command definitions
├── agents/          # Subagent definitions
├── references/      # Strategy docs, quality standards, and feature docs
├── templates/       # MD templates for generated files
└── hooks/           # Claude Code hooks (session orient, auto-commit, validate, capture)
```

## Principles
1. **Never explore unnecessarily** — index first, read only what matters
2. **Local tools first** — Glob + Grep + Read before any API calls
3. **Everything persists locally** — MD files maintain context across the session
4. **Token guardrails** — smaller models for scanning, larger for thinking
5. **Commit-style tracking** — every change logged like a git commit locally
6. **Session rhythm** — Orient → Work → Persist cycle prevents context loss
7. **Processing pipeline** — Capture → Process → Connect → Verify for knowledge work
8. **Graph compounds quality** — well-connected notes are worth more than many orphaned ones
9. **Complexity at pain points** — activate features only when friction proves they're needed

## Hooks System (`hooks/`)

Automated lifecycle hooks for session management:

| Hook | Trigger | What It Does |
|------|---------|-------------|
| `session-orient.sh` | SessionStart | Injects workspace tree, goals, conditions, maintenance signals |
| `write-validate.sh` | PostToolUse (Write) | Validates YAML frontmatter on note files |
| `auto-commit.sh` | PostToolUse (Write, async) | Auto-commits changes to git after writes |
| `session-capture.sh` | Stop | Saves session state to ops/sessions/, commits artifacts |

Hooks only activate in CCS-enabled projects (detected via `.ccs` marker).

## Knowledge System Features (`references/`)

| Reference | Purpose |
|-----------|---------|
| `session-rhythm.md` | Orient-Work-Persist cycle, handoff protocol, anti-patterns |
| `processing-pipeline.md` | 4-phase pipeline: Capture → Process → Connect → Verify |
| `graph-analysis.md` | Query vault as graph DB using ripgrep — traversal, synthesis, density |
| `maintenance.md` | Condition-based health checks, reweaving, invariants |
| `self-evolution.md` | Friction-driven module adoption, observation/tension capture, lifecycle |
| `atomic-notes.md` | Prose-as-title pattern, composability test, schema |
| `topic-maps.md` | Navigation hubs, lifecycle, health metrics |
| `wiki-links.md` | Link philosophy, propositional semantics, dangling link policy |
| `self-space.md` | Agent identity/memory separate from user knowledge |
| `guardrails.md` | Privacy, transparency, autonomy — non-negotiable boundaries |

## Agents (`agents/`)

| Agent | Role |
|-------|------|
| `context-builder.md` | Deep codebase analysis, generates .ccs/ index files |
| `test-runner.md` | Runs tests, tracks results, auto-fixes failures |
| `code-auditor.md` | Security, performance, dead code, accessibility audits |
| `git-tracker.md` | Git workflow — branches, PRs, merges, diffs, sync |
| `knowledge-guide.md` | Proactive methodology guidance, note quality, connection suggestions |

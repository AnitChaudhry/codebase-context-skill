# Git Workflow Strategy

## Core Principle
Maintain lightweight reference files per branch so Claude reads one MD file instead of re-scanning hundreds of source files. Every git operation updates the relevant reference file.

## Branch Reference Lifecycle

### Creation
When `/ccs-branch` creates a new branch:
1. Record parent branch and merge-base commit
2. Record purpose (from user input or auto-detected from task.md)
3. Initialize empty changed files table
4. File: `.ccs/branches/<name>.md`

### Active Development
As `/ccs-build`, `/ccs-fix`, or other skills modify files on a branch:
1. The skill updates `.ccs/task.md` (existing behavior)
2. On next `/ccs-branch` or `/ccs-diff` call, branch ref is refreshed from git state
3. Changed files table updated via `git diff --stat <parent>..HEAD`

### Pre-Merge
When `/ccs-pr` or `/ccs-merge` runs:
1. Branch ref is fully regenerated with latest state
2. Dependency impact analysis run against `.ccs/file-index.md`
3. Blast radius calculated (direct changes + downstream dependents)

### Post-Merge
After `/ccs-merge` completes:
1. Branch ref status updated to `merged`
2. Entry appended to `.ccs/merge-history.md`
3. Stale branch refs for deleted branches are cleaned up

## When to Generate Branch Refs
- **Always:** On `/ccs-branch` create
- **Always:** On `/ccs-pr` (full regeneration)
- **Always:** On `/ccs-merge` (pre and post)
- **On request:** On `/ccs-diff` between any two branches
- **Never automatically** during `/ccs-build` or `/ccs-fix` (too expensive — only task.md is updated)

## Keeping Refs Fresh
Branch refs go stale when commits happen outside CCS skills (manual git commits, other tools). Detection strategy:
1. Compare ref file mtime with `git log -1 --format=%ci <branch>`
2. If branch has newer commits than ref, mark stale and regenerate on next access
3. `/ccs-status` reports stale branch refs

## Merge Conflict Resolution Context
When `/ccs-merge` or `/ccs-sync` encounters conflicts:
1. Read both branch refs to understand what each branch changed and why
2. Cross-reference with `.ccs/file-index.md` for file importance
3. Check `.ccs/architecture.md` for module boundaries
4. Provide conflict resolution recommendation:
   - Which side to prefer based on recency and scope
   - Whether manual review is needed (both branches touched core logic)
   - Dependencies that may break after resolution

## Git Commands — No External Services
All operations use local git commands only:
- `git branch`, `git checkout`, `git switch` — branch management
- `git log`, `git shortlog` — history
- `git diff`, `git diff --stat` — change analysis
- `git merge-tree` — conflict preview without merging
- `git merge-base` — common ancestor detection
- `git stash` — work-in-progress management
- `git status` — working tree state

**Never used:** `gh` CLI, GitHub API, external webhooks, CI/CD APIs

## Model Assignments for Git Skills
| Skill | Model | Rationale |
|-------|-------|-----------|
| `/ccs-branch` | Sonnet | Standard git operations, context file generation |
| `/ccs-pr` | Opus | Deep analysis of changes, PR description writing |
| `/ccs-merge` | Opus | Dependency analysis, conflict resolution strategy |
| `/ccs-diff` | Opus | Impact analysis across dependency chains |
| `/ccs-sync` | Sonnet | Standard pull/rebase with conflict context |
| `/ccs-stash` | Haiku | Lightweight stash with context logging |
| `/ccs-log` | Haiku | Simple history summarization |

## Integration with Existing Skills
- `/ccs-init` generates the base context (project-map, file-index, etc.) that git skills reference
- `/ccs-build` and `/ccs-fix` log to task.md — git skills cross-reference these entries
- `/ccs-status` reports branch ref freshness alongside index freshness
- `/ccs-plan` can read branch refs to understand work-in-progress across branches

---
*Built by [Anit Chaudhary](https://github.com/AnitChaudhry) — codebase-context-skill v1.0.0*

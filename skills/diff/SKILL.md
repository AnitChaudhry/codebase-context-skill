---
name: diff
description: "Smart diff between branches with impact analysis — follows dependency chains, categorizes changes, calculates blast radius beyond line changes"
argument-hint: "[branch1] [branch2]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
model: claude-opus-4-6
context: fork
agent: general-purpose
---

# Smart Diff with Impact Analysis

## Overview
Goes beyond raw `git diff` to show the real impact of changes between branches. Follows dependency chains of changed files, categorizes changes (feature/fix/refactor), and calculates blast radius using the file-index rankings. Outputs a structured impact report.

## When to Use
- Before merging to understand full impact
- Reviewing what a branch actually changed (not just line diffs)
- Assessing whether a feature branch is safe to merge
- Understanding dependency ripple effects of changes

## Instructions

### Step 1: Identify Branches
1. Parse arguments: `<branch1>` and `<branch2>` (default: current branch vs main)
2. If only one arg, compare that branch against main/master
3. Run `git merge-base <branch1> <branch2>` to find common ancestor
4. Read `.ccs/branches/<branch1>.md` and `.ccs/branches/<branch2>.md` if they exist

### Step 2: Gather Raw Diff
1. Run `git diff --stat <branch1>...<branch2>` for file-level changes
2. Run `git diff --shortstat <branch1>...<branch2>` for totals
3. Run `git diff --name-only <branch1>...<branch2>` for clean file list
4. Run `git log --oneline <branch1>...<branch2>` for commit list

### Step 3: Analyze Impact
1. Read `.ccs/file-index.md` — check ranks of changed files
2. Read `.ccs/project-map.md` — find downstream dependents of changed files
3. For each changed file:
   - Note its rank (S/A/B/C/D)
   - Find files that import/depend on it (1 level deep)
   - Flag if it's an entry point, config, or shared utility
4. Categorize the overall change:
   - **Feature:** new files created, new exports added
   - **Fix:** small changes to existing files, test additions
   - **Refactor:** renames, moves, restructuring without new functionality
   - **Config:** package.json, config files, CI/CD changes

### Step 4: Calculate Blast Radius
- **Direct changes:** files modified in the diff
- **First-order dependents:** files that import changed files
- **Risk level:** based on file ranks (S-rank changes = high risk)
- **Breaking change potential:** exports removed, interfaces changed, types modified

### Step 5: Generate Report
Write to `.ccs/branches/<branch-name>.md` (update existing) and display:

```markdown
## Impact Analysis: <branch1> → <branch2>

### Summary
- **Type:** feature | fix | refactor | mixed
- **Risk:** low | medium | high
- **Direct changes:** N files (X insertions, Y deletions)
- **Blast radius:** N downstream files affected

### Changed Files by Importance
| File | Rank | +/- | Downstream Dependents |
|------|------|-----|-----------------------|
| src/auth.ts | S | +45 -12 | 8 files |
| src/utils.ts | A | +3 -1 | 15 files |

### Dependency Impact
| Changed File | Dependents That May Need Updates |
|--------------|----------------------------------|
| src/auth.ts | src/middleware.ts, src/routes/*.ts |

### Change Categories
| Category | Files | Lines |
|----------|-------|-------|
| Feature | 3 | +120 |
| Fix | 1 | +5 -3 |
| Config | 1 | +2 |

### Commits (<count>)
| Hash | Message | Files |
|------|---------|-------|

### Risk Assessment
- **Breaking changes:** {yes/no — list if yes}
- **S-rank files modified:** {count}
- **Shared utilities changed:** {count}
- **Test coverage:** {new tests added? existing tests modified?}
```

### Step 6: Track in task.md
```markdown
## Task #{number}: Diff — <branch1> vs <branch2>

**Timestamp:** {now}
**Status:** done
**Type:** diff

### Results
- **Direct changes:** {count} files
- **Blast radius:** {count} downstream
- **Risk level:** {low|medium|high}
- **Change type:** {feature|fix|refactor|mixed}
```

## Token Efficiency Rules
- Use `--name-only` and `--stat` instead of full diff output
- Read file-index once, project-map once — don't re-read per file
- For dependency walking, use Grep for import statements rather than reading entire files
- Cap dependency walking at 1 level (direct dependents only)

## Limitations
- Dependency analysis uses static import scanning (Grep-based), not runtime analysis
- Blast radius is an estimate — actual impact may be larger or smaller
- Does not analyze semantic changes (e.g., function signature changes)
- For very large diffs (100+ files), output is summarized to top 20 by rank

---
*Built by [Anit Chaudhary](https://github.com/AnitChaudhry) — codebase-context-skill v1.0.0*

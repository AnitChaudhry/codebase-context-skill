---
name: log
description: "Smart commit history with context — groups commits by branch/feature, cross-references with task.md entries, shows visual graph"
argument-hint: "[branch] [--all] [--since=7d]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
model: claude-haiku-4-5-20251001
context: fork
agent: general-purpose
---

# Smart Commit Log

## Overview
Displays commit history with context that raw `git log` doesn't provide. Groups commits by branch/feature, cross-references with `.ccs/task.md` entries, and shows dependency impact. Much faster than manually parsing git history.

## When to Use
- Understanding what happened on a branch
- Reviewing recent work across all branches
- Finding which commit introduced a change
- Getting an overview before a merge or PR

## Instructions

### Step 1: Parse Arguments
- No args: show last 20 commits on current branch
- `<branch>`: show commits on specific branch
- `--all`: show commits across all branches
- `--since=7d`: filter by time (7d, 2w, 1m, etc.)

### Step 2: Gather Git History
1. Run `git log --oneline --graph --all -30` for visual overview
2. Run `git log --format="%h|%s|%an|%ar|%D" -20 <branch>` for structured data
3. If `--all`, run `git log --oneline --all --since=<period> -50`

### Step 3: Enrich with Context
1. Read `.ccs/task.md` — match commits to logged tasks by timestamp or description
2. Glob `.ccs/branches/*.md` — check which commits belong to tracked branches
3. For each commit, note if it has a matching task entry

### Step 4: Format Output
Present as a structured report:

```markdown
## Commit Log — <branch> (last <N> commits)

### Recent Commits
| Hash | Message | Author | When | Task |
|------|---------|--------|------|------|
| abc1234 | Add auth middleware | Anit | 2h ago | Task #3 |
| def5678 | Fix redirect loop | Anit | 5h ago | Task #2 |

### Branch Graph
<paste visual graph from git log --graph>

### Activity Summary
- **Commits this session:** N
- **Files touched:** N
- **Active branches:** branch1, branch2
- **Tracked in task.md:** N of M commits
```

### Step 5: Track in task.md
```markdown
## Task #{number}: Log — {scope}

**Timestamp:** {now}
**Status:** done
**Type:** log

### Details
- **Scope:** {branch|all}
- **Commits shown:** {count}
- **Matched to tasks:** {count}
```

## Token Efficiency Rules
- Use `--format` flags to get structured data instead of parsing verbose output
- Read task.md once, match by scanning — don't re-read per commit
- Keep output concise — summaries over full diffs

## Limitations
- Read-only — does not modify history
- Does not fetch from remote (use `/ccs-sync` first for latest)
- Task matching is best-effort based on timestamps and descriptions

---
*Built by [Anit Chaudhary](https://github.com/AnitChaudhry) — codebase-context-skill v1.0.0*

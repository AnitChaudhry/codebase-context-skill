---
name: sync
description: "Pull, rebase, or push with conflict context — reads branch refs to explain conflicts, provides resolution recommendations"
argument-hint: "[pull] [push] [rebase] [--force]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
model: claude-sonnet-4-6
context: fork
agent: general-purpose
---

# Sync with Context

## Overview
Handles pull, push, and rebase operations while providing context for any conflicts that arise. Before syncing, reads branch refs and remote state to anticipate issues. During conflicts, uses branch refs and file-index to explain WHY files conflict and recommend resolution strategies.

## When to Use
- Pulling latest changes from remote
- Pushing local commits to remote
- Rebasing a feature branch onto updated main
- Resolving merge conflicts with context

## Instructions

### Step 1: Parse Intent
- **Pull:** `/ccs-sync pull` or `/ccs-sync` (default)
- **Push:** `/ccs-sync push`
- **Rebase:** `/ccs-sync rebase` or `/ccs-sync rebase main`
- If ambiguous, default to pull

### Step 2: Pre-Sync Assessment
1. Run `git status` — check for uncommitted changes (warn if dirty)
2. Run `git fetch` — get latest remote state
3. Run `git rev-list --left-right --count HEAD...@{upstream}` — check divergence
4. Get current branch: `git rev-parse --abbrev-ref HEAD`
5. Read `.ccs/branches/<current-branch>.md` if it exists
6. Report: ahead N commits, behind N commits

### Step 3: Execute

#### Pull
1. If clean working tree: `git pull`
2. If dirty: ask user whether to stash first (reference `/ccs-stash`)
3. If conflicts occur → go to Step 4 (Conflict Resolution)
4. After successful pull, update branch ref with new commits

#### Push
1. Run `git push` via Bash
2. If rejected (behind remote): warn and suggest pull first
3. If `--force` flag provided, ask user to confirm before `git push --force-with-lease`
4. After successful push, log to task.md

#### Rebase
1. Run `git rebase <target-branch>` via Bash
2. If conflicts occur → go to Step 4
3. After successful rebase, regenerate branch ref (commit hashes changed)

### Step 4: Conflict Resolution Context
When conflicts are detected:
1. Run `git diff --name-only --diff-filter=U` to get conflicted files
2. Read `.ccs/file-index.md` — check importance of conflicted files
3. Read `.ccs/branches/<branch>.md` — understand what this branch changed and why
4. For each conflicted file:
   - Run `git log --oneline -5 -- <file>` on both branches
   - Check file rank (S/A/B/C/D)
   - Identify which branch has more recent meaningful changes
5. Present conflict resolution recommendations:

```markdown
## Sync Conflicts — <N> files

| File | Rank | Our Changes | Their Changes | Recommendation |
|------|------|-------------|---------------|----------------|
| src/auth.ts | S | Added validation | Refactored flow | Manual review needed |
| src/utils.ts | B | Fixed typo | Added helper | Accept theirs, re-apply our fix |

### Resolution Strategy
1. Start with low-risk files (B/C rank) — accept theirs or ours
2. Manually review S/A rank files — these are critical
3. After resolving, run `/ccs-test` to verify nothing broke
```

6. Ask user how to proceed via AskUserQuestion if conflicts exist

### Step 5: Post-Sync
1. If branch ref exists, update it with new state
2. Run `git log --oneline -5` to show latest commits
3. Report sync result

### Step 6: Track in task.md
```markdown
## Task #{number}: Sync — {action} {branch}

**Timestamp:** {now}
**Status:** done
**Type:** sync

### Details
- **Action:** {pull|push|rebase}
- **Branch:** {branch-name}
- **Remote:** {origin/branch}
- **Ahead:** {N} commits
- **Behind:** {N} commits
- **Conflicts:** {none|N files}
- **Resolution:** {clean|manual}
```

## Token Efficiency Rules
- Run `git fetch` once, not repeatedly
- Use `--name-only` flags to avoid full diff output
- Read branch ref for context instead of re-scanning source files
- Only read conflicted files, not all changed files

## Limitations
- Does not auto-resolve conflicts — provides context and recommendations only
- Force push requires explicit `--force` flag and user confirmation
- Does not handle submodule sync
- Network errors (no remote access) must be resolved by user

---
*Built by [Anit Chaudhary](https://github.com/AnitChaudhry) — codebase-context-skill v1.0.0*

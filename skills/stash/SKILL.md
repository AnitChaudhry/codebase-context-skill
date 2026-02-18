---
name: stash
description: "Stash and restore work-in-progress with tracked context — logs what was being worked on so Claude remembers when unstashing"
argument-hint: "[save \"message\"] [pop] [list]"
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash
model: claude-haiku-4-5-20251001
context: fork
agent: general-purpose
---

# Stash with Context

## Overview
Stashes and restores work-in-progress while tracking what was being worked on. When you stash, the context is logged in the branch ref and task.md. When you pop, Claude immediately knows what you were doing without re-scanning.

## When to Use
- Need to switch branches but have uncommitted work
- Want to save current state before experimenting
- Need to pull/rebase but have local changes
- Restoring previous work-in-progress

## Instructions

### Step 1: Parse Intent
- **Save:** `/ccs-stash save "working on auth middleware"`
- **Pop:** `/ccs-stash pop` or `/ccs-stash pop 0`
- **List:** `/ccs-stash list`
- **Drop:** `/ccs-stash drop 0`
- Default (no args): save with auto-generated message

### Step 2: Execute

#### Stash Save
1. Run `git status --short` to capture current state
2. Run `git diff --stat` to see what's changed
3. Run `git stash push -m "<message>"` via Bash
4. Get current branch: `git rev-parse --abbrev-ref HEAD`
5. Update `.ccs/branches/<current-branch>.md` if it exists — add stash note
6. Log to task.md

#### Stash Pop
1. Run `git stash list` to show available stashes
2. Read `.ccs/task.md` — find the matching stash save entry for context
3. Run `git stash pop <index>` via Bash
4. Run `git status --short` to show restored state
5. Display what was being worked on (from task.md entry)

#### Stash List
1. Run `git stash list --format="%gd|%gs|%cr"`
2. Cross-reference with task.md stash entries
3. Display enriched list with context

#### Stash Drop
1. Run `git stash drop <index>` via Bash
2. Log removal to task.md

### Step 3: Track in task.md
```markdown
## Task #{number}: Stash — {action}

**Timestamp:** {now}
**Status:** done
**Type:** stash

### Details
- **Action:** {save|pop|list|drop}
- **Branch:** {current-branch}
- **Message:** {stash message}
- **Files stashed:** {count}
- **Stash index:** {index}

### State at Stash Time
| File | Status |
|------|--------|
| {file} | modified |
| {file} | new file |
```

## Token Efficiency Rules
- `git status --short` is faster than `git status` — use short format
- Read task.md once for context matching, don't re-scan files
- Keep stash context under 20 lines — just enough to remember what was happening

## Limitations
- Does not handle merge conflicts from stash pop (user must resolve manually)
- Stash context is best-effort — untracked files may not have full context
- Cannot stash individual files (git limitation — use `git stash push -- <file>` if needed)

---
*Built by [Anit Chaudhary](https://github.com/AnitChaudhry) — codebase-context-skill v1.0.0*

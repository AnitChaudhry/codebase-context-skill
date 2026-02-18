---
name: build
description: "Implement a feature or task with tracked context — logs every file read, modified, and created as commit-style entries in task.md"
argument-hint: "[task description]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, Task
model: claude-sonnet-4-6
context: fork
agent: general-purpose
---

# Build with Context

## Overview
Implements a feature or task while maintaining full tracking in `.ccs/task.md`. Every file read, modification, and creation is logged as a commit-style entry. The local context files guide what to read and what to avoid.

## When to Use
- Implementing a new feature
- Building a new component, page, or module
- Adding a new API endpoint
- Creating new functionality based on a plan from `/ccs:plan`

## Instructions

### Step 1: Check for Existing Plan
1. Read `.ccs/task.md` — look for a recent "planned" status entry matching this task
2. If a plan exists, use its file lists and steps
3. If no plan exists, perform quick planning inline (read architecture + file-index)

### Step 2: Load Minimal Context
Only read what's needed:
1. Read `.ccs/file-index.md` — find relevant S-rank and A-rank files
2. Read `.ccs/conventions.md` — get patterns to follow
3. Use Grep to find similar existing implementations
4. Read ONLY the files identified as relevant (never browse aimlessly)

### Step 3: Implement
1. Follow the conventions from `.ccs/conventions.md`
2. Match existing patterns in the codebase
3. For each file touched, log it immediately in task.md

### Step 4: Track Changes
After implementation, update `.ccs/task.md`:

```markdown
## Task #{number}: {title}

**Timestamp:** {now}
**Status:** done
**Type:** build

### Context Used
| File | Action | Lines Read | Reason |
|------|--------|-----------|--------|
| {file} | read | {lines} | {reason} |
| {file} | modified | {lines} | {reason} |
| {file} | created | - | {reason} |

### Changes Made
{summary of what was built}

### Files Modified
- `{file}`: {what changed}

### Files Created
- `{file}`: {purpose}

### Verification
- [ ] Code follows conventions
- [ ] Imports are correct
- [ ] No unused imports added
- [ ] Error handling follows patterns
```

### Step 5: Update Index
1. Add any new files to `.ccs/file-index.md`
2. Update dependency chains in `.ccs/project-map.md` if new imports were added
3. This keeps the index fresh for subsequent commands

## Token Efficiency Rules
- NEVER read a file just to "understand the codebase" — use the index
- NEVER explore directories — use Glob with targeted patterns
- Read file headers first (50 lines) — only read full file if needed
- If you need to find something, use Grep first, then read the specific file
- Log everything in task.md so you never need to re-read files

## Limitations
- Does not run tests automatically (use `/ccs:test` after building)
- Does not deploy (use `/ccs:deploy` for deployment checks)
- Large features should be broken into smaller builds via `/ccs:plan`

---
*Built by [Anit Chaudhary](https://github.com/AnitChaudhry) — codebase-context-skill v1.0.0*

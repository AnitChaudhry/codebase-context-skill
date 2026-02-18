---
name: build
description: "Implement a feature with tracked context"
argument-hint: "[task description]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Task, EnterPlanMode
model: claude-sonnet-4-6
context: fork
agent: general-purpose
---

# Build

Implement the requested feature. Read only what's needed. Log everything.

## Steps

### 1. Check existing plan
Read `.ccs/task.md` — if a plan entry exists for this task, follow its file list and steps. If not, proceed to step 2.

### 2. Load context (read these files)
- `.ccs/file-index.md` → find S/A-rank files relevant to the task
- `.ccs/conventions.md` → patterns to follow
- `.ccs/branches/<current>.md` → if exists, current branch context
- Grep for similar implementations in matched files
- Read ONLY the files identified. Never browse.

### 3. Implement
- Follow patterns from `.ccs/conventions.md`
- Match existing code style
- Use Edit for modifications, Write for new files

### 4. Log to `.ccs/task.md`
Append using template at `.claude/skills/_ccs/templates/task-template.md`:
- Type: `build`
- List every file read/modified/created with line counts
- Summarize changes

### 5. Update index
- Add new files to `.ccs/file-index.md`
- Update `.ccs/project-map.md` if new imports added

## Rules
- NEVER explore — Grep first, then Read only matched sections
- Read headers (50 lines) before full files
- If stuck → tell user to run `/ccs-plan` first
- After build → suggest `/ccs-test` to verify

## Refs
- Conventions: `.ccs/conventions.md`
- Task log: `.ccs/task.md`
- Strategy: `.claude/skills/_ccs/references/context-strategies.md`

---
*codebase-context-skill v1.0.0*

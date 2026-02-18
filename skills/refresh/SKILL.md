---
name: refresh
description: "Rebuild codebase index (full, incremental, or session-based)"
argument-hint: "[full | incremental | session]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Task, EnterPlanMode
model: claude-opus-4-6
context: fork
agent: general-purpose
---

# Refresh

Update `.ccs/` context files. Supports full rebuild, incremental (changed files only), or session-based refresh.

## Steps

### 1. Read preferences
Read `.ccs/preferences.json` for refresh mode. If `$ARGUMENTS` specifies a mode, use that instead.

### 2. Execute refresh

**Full rebuild:**
- Delete all `.ccs/*.md` files (preserve `preferences.json` and `task.md`)
- Re-run full `/ccs-init` process

**Incremental:**
- Read `.ccs/file-index.md` for previously indexed files
- Glob current file list, diff against index
- New files → read headers, classify, add to index
- Deleted files → remove from all context files
- Existing files → check if imports/exports changed (first 50 lines)
- Update `project-map.md`, `file-index.md`, `architecture.md`
- Update timestamps in all context file headers

**Session-based:**
- Run incremental refresh
- Reset `task.md` to fresh session header (archive previous)

### 3. Report
Output: mode used, files added/removed/updated, total indexed, new timestamp.

### 4. Log to `.ccs/task.md`
Append entry using template at `.claude/skills/_ccs/templates/task-template.md`.

## Rules
- Read file headers (first 50 lines) not full files
- For best accuracy after major changes, use full mode
- Incremental may miss import chain changes — warn user

## Refs
- File index: `.ccs/file-index.md`
- Task log: `.ccs/task.md`
- Strategy: `.claude/skills/_ccs/references/context-strategies.md`

---
*codebase-context-skill v1.0.0*

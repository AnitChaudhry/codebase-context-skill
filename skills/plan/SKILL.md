---
name: plan
description: "Plan a task with full dependency-aware context"
category: workflow
tags: [plan, task, dependency]
depends-on: [init]
input: "task description"
output: "structured plan with dependency graph and file targets"
token-estimate: 4000
parallel-safe: true
argument-hint: "[task description]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Task, EnterPlanMode
model: claude-opus-4-6
context: fork
agent: general-purpose
---

# Plan

Create a comprehensive implementation plan before any code is written — identify all files to read, modify, create, and test.

## Steps

### 1. Understand the task
Parse `$ARGUMENTS`. Classify: new-feature, enhancement, bug-fix, refactor, migration, config-change.

### 2. Load context
- `.ccs/architecture.md` → where this task fits
- `.ccs/file-index.md` → relevant files by rank
- `.ccs/project-map.md` → dependency chains
- `.ccs/conventions.md` → patterns to follow

### 3. Identify files
Using index lookup + targeted Grep:
- **READ:** Direct matches, dependency chain files, similar implementations, test files
- **MODIFY:** Files where logic changes, importers (if interface changes), affected tests
- **CREATE:** New components/modules, new tests, new types
- **DELETE:** Replaced or deprecated files

### 4. Create plan in `.ccs/task.md`
Append entry using template at `.claude/skills/_ccs/templates/task-template.md`:
- Status: `planned`, Type: task type
- Implementation steps (numbered)
- Files to read/modify/create/delete (with ranks and reasons)
- Dependencies identified, test strategy
- Risk assessment: blast radius, breaking changes, test coverage impact

### 5. Present to user
Output the plan in readable format. Ask for confirmation before proceeding.

## Rules
- Never start coding — plan only
- If task is trivial (1-2 files, no dependencies) → suggest `/ccs-build` directly
- After approval → suggest `/ccs-build` to execute

## Refs
- Architecture: `.ccs/architecture.md`
- File index: `.ccs/file-index.md`
- Task template: `.claude/skills/_ccs/templates/task-template.md`
- Strategy: `.claude/skills/_ccs/references/context-strategies.md`

---
*codebase-context-skill v1.0.0*

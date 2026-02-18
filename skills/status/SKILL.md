---
name: status
description: "Show indexed context state, staleness, and token savings"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Task, EnterPlanMode
model: claude-haiku-4-5-20251001
context: fork
agent: general-purpose
---

# Status

Show current state of `.ccs/` context — what's indexed, freshness, and estimated savings.

## Steps

### 1. Check context exists
Glob for `.ccs/`. If missing → output: "No context found. Run `/ccs-init` to initialize."

### 2. Read context files
- `.ccs/project-map.md` → file count, directory count
- `.ccs/file-index.md` → rank distribution (S/A/B/C/D counts)
- `.ccs/architecture.md` → tech stack summary
- `.ccs/conventions.md` → test framework
- `.ccs/preferences.json` → refresh mode
- `.ccs/task.md` → count task entries this session

### 3. Check staleness
- Get timestamp from context file headers
- Glob current source files, compare count with indexed count
- If counts differ or files modified since index → flag as stale

### 4. Output report
Display: initialized timestamp, refresh mode, staleness (fresh/stale/very-stale), rank distribution, tech stack, architecture, test framework, session tasks logged, estimated token savings.

## Rules
- Read only `.ccs/` files — never scan the codebase
- If stale → suggest `/ccs-refresh`
- If missing → suggest `/ccs-init`

## Refs
- Context files: `.ccs/`
- Strategy: `.claude/skills/_ccs/references/context-strategies.md`

---
*codebase-context-skill v1.0.0*

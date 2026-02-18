---
name: fix
description: "Fix bugs with root-cause analysis and dependency tracking"
argument-hint: "[bug description or error message]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Task, EnterPlanMode
model: claude-sonnet-4-6
context: fork
agent: general-purpose
---

# Fix

Diagnose and fix bugs by tracing from symptom to root cause. Track investigation and verify the fix.

## Steps

### 1. Understand the symptom
Parse `$ARGUMENTS` for error message, affected feature, stack trace. Grep for the error in the codebase. If stack trace provided, identify originating file and line.

### 2. Trace to root cause
- Read `.ccs/file-index.md` → file's importance and role
- Read the file where the error occurs
- Trace call chain backward: what function threw, what called it, what data was passed
- Check `.ccs/project-map.md` for dependency chain
- Read each file in the chain until root cause is found

### 3. Research if needed
If error is from a library or framework:
1. **Check `.ccs/research/` FIRST** — Glob for files matching the error/library topic
2. If local research file exists and is recent → use it, skip web calls
3. If not found → WebSearch for exact error message + library name
4. WebFetch official docs for relevant API
5. **Save findings to `.ccs/research/<error-topic>.md`** so this research is never repeated

### 4. Develop fix
- Identify minimal change that fixes root cause
- Grep for same anti-pattern elsewhere
- Verify fix doesn't break interface contract (check imports/dependents)
- Follow `.ccs/conventions.md` patterns

### 5. Verify
- Run existing tests via Bash if they exist
- If no tests exist, suggest writing one
- Grep for side effects

### 6. Log to `.ccs/task.md`
Append using template at `.claude/skills/_ccs/templates/task-template.md`:
- Type: `fix`, symptom, root cause, investigation trail, fix applied, verification status

## Rules
- ALWAYS check `.ccs/research/` before any WebSearch
- Save all web research to `.ccs/research/<topic>.md`
- Grep first, Read only matched sections
- After fix → suggest `/ccs-test` to verify
- If stuck → tell user to run `/ccs-plan` first

## Refs
- Research cache: `.ccs/research/`
- Conventions: `.ccs/conventions.md`
- Task log: `.ccs/task.md`
- Strategy: `.claude/skills/_ccs/references/context-strategies.md`

---
*codebase-context-skill v1.0.0*

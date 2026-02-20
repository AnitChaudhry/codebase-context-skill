---
name: query
description: "Preview which files would be selected for a given query"
category: context
tags: [search, preview, lookup]
depends-on: [init]
input: "natural language query"
output: "ranked list of matching files with relevance"
token-estimate: 1500
parallel-safe: true
argument-hint: "[your question or task description]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Task, EnterPlanMode
model: claude-haiku-4-5-20251001
context: fork
agent: general-purpose
---

# Query

Preview which files would be read and why for a given query — without executing anything.

## Steps

### 1. Parse query
Extract key terms from `$ARGUMENTS`: file names, function names, feature names, tech terms. Classify query type: build, fix, refactor, test, audit, deploy, general.

### 2. Index lookup
- Read `.ccs/file-index.md` → search for files matching key terms
- Read `.ccs/project-map.md` → search dependency graph
- Score matches: exact file name (10), exact symbol (8), partial (5), directory (3)

### 3. Live scan
- Grep source files for key terms from the query
- Combine with index results, deduplicate

### 4. Dependency walk
- For each matched file, look up imports in project map
- Add direct dependencies (1 hop); for refactor/debug queries add 2 hops
- Cap at 15 files total

### 5. Output preview
Display table: file, rank, reason for selection. Show dependency chain. Show estimated token cost vs without-index cost and savings percentage.

## Rules
- Preview only — do not read the matched files
- Token estimates are approximate (average file sizes from index)
- If no context exists → suggest `/ccs-init`

## Refs
- File index: `.ccs/file-index.md`
- Project map: `.ccs/project-map.md`
- Strategy: `.claude/skills/_ccs/references/context-strategies.md`

---
*codebase-context-skill v1.0.0*

# Context Engineering Strategies

Reference document for the codebase-context-skill plugin. Contains proven strategies for intelligent file selection, context building, and token optimization.

## File Selection Strategy (Hybrid Approach)

### Pass 1: Index Lookup (Zero Cost)
Read `.ccs/file-index.md` and `.ccs/project-map.md` to find files matching the query by:
- File name/path keywords
- Export/import symbols
- File role (component, util, config, test, etc.)
- Centrality rank (most-imported files first)

### Pass 2: Local Live Scan (Zero API Cost)
Use Glob + Grep with targeted patterns:
- Search for function/class/variable names mentioned in query
- Search for related terms (e.g., "auth" -> login, session, token, middleware)
- Check file modification times for recently changed files

### Pass 3: Dependency Walking
For each matched file from Pass 1+2:
- Follow import statements to find dependencies
- Follow reverse imports to find dependents
- Limit depth to 2 levels (file -> imports -> imports of imports)
- Only include files that add context to the query

### Decision Rules
- If index lookup returns 3+ high-confidence matches → skip live scan
- If index has no matches → do full live scan
- If query mentions specific file/function → go directly to that file
- Never read more than 15 files per query unless explicitly requested
- Prefer reading file headers (first 50 lines) before full file reads

## Context Building Patterns

### For Feature Building
1. Read the architecture doc to understand where the feature fits
2. Find existing similar features via grep
3. Read the conventions doc for patterns to follow
4. Identify all files that need modification
5. Read those files + their direct dependencies

### For Bug Fixing
1. Find the error message or symptom in the codebase
2. Trace the call chain from symptom to root cause
3. Read the test files for the affected code
4. Check recent git changes to the affected files
5. Identify the minimal set of files to fix

### For Refactoring
1. Find all usages of the target code (grep for symbols)
2. Build the full dependency tree (who imports this?)
3. Identify the blast radius (all files affected by change)
4. Read test files to understand expected behavior
5. Check for interface contracts that must be preserved

### For Auditing
1. Read architecture doc for system overview
2. Scan for known patterns (security: eval, innerHTML, SQL strings; performance: N+1, blocking I/O; patterns: consistency)
3. Focus on boundary code (API handlers, auth middleware, DB queries)
4. Check test coverage for critical paths
5. Review error handling patterns

### For Testing
1. Read existing test files and test config
2. Understand test framework and patterns used
3. Identify untested code paths
4. Read source files that tests target
5. Check CI/CD config for test commands

## Token Optimization Rules

1. **Read file-index.md first** — it's a compact summary of the entire codebase
2. **Use Glob for discovery** — file names alone tell you a lot
3. **Use Grep for confirmation** — search for specific symbols before reading whole files
4. **Read headers first** — first 50 lines of a file usually contain imports and exports
5. **Skip test files initially** — unless the query is about testing
6. **Skip generated files** — node_modules, dist, build, .next, etc.
7. **Skip config files** — unless the query is about configuration
8. **Batch reads** — read multiple small files in parallel instead of sequentially
9. **Cache in task.md** — record what you learned so you don't re-read files
10. **Use the architecture doc** — it tells you where to look without reading source code

## Token Guardrails — Anti-Waste Rules

### The Problem This Solves
Without guardrails, Claude Code wastes 200K+ tokens per task:
1. Spawns an Explore agent → reads 50+ files to "understand" the codebase
2. Spawns a Plan agent → re-reads many of the same files
3. Starts coding → reads files again because the previous context is gone
4. Each agent is a separate context fork — nothing is shared

### How CCS Eliminates This
CCS maintains `.ccs/` reference files that replace all exploratory reading:
- **`.ccs/file-index.md`** replaces "let me scan the codebase" (saves ~100K tokens)
- **`.ccs/architecture.md`** replaces "let me understand the system" (saves ~50K tokens)
- **`.ccs/project-map.md`** replaces "let me trace dependencies" (saves ~30K tokens)
- **`.ccs/branches/<name>.md`** replaces "let me check what changed on this branch" (saves ~50K tokens)

### Rules for All CCS Skills

1. **NEVER spawn an Explore agent** — the index already exists. Read `.ccs/file-index.md` instead.
2. **NEVER read a file "just to understand"** — read it only if you need to modify it or it directly answers the query.
3. **NEVER read more than 15 files per command** — if you need more, the index is stale (run `/ccs-refresh`).
4. **ALWAYS read the header first (50 lines)** — only read the full file if the header confirms relevance.
5. **ALWAYS check `.ccs/task.md` first** — a previous task may have already gathered the context you need.
6. **ALWAYS use Grep before Read** — find the exact line, then read only that section.
7. **NEVER re-explore after switching branches** — read `.ccs/branches/<name>.md` instead.
8. **Model selection is final** — Haiku skills never escalate to Sonnet. Sonnet skills never escalate to Opus. If more analysis is needed, the user runs a different skill.

### Token Budget Per Skill Type
| Skill Type | Max Files Read | Max Lines Read | Target Tokens |
|-----------|---------------|----------------|---------------|
| Status/Query/Track/Log/Stash | 3-5 | 500 | <5K |
| Build/Fix/Test/Branch/Sync | 5-15 | 2000 | <20K |
| Init/Plan/Refactor/Audit/Review/PR/Merge/Diff | 10-25 | 5000 | <50K |

### What Replaces Agent Spawning
| Without CCS | With CCS |
|-------------|----------|
| Spawn Explore agent (100K+ tokens) | Read `.ccs/file-index.md` (2K tokens) |
| Spawn Plan agent (50K+ tokens) | Read `.ccs/architecture.md` + branch ref (3K tokens) |
| Re-read files after branch switch | Read `.ccs/branches/<name>.md` (1K tokens) |
| Full codebase scan for PR | Read branch ref + `git diff --stat` (2K tokens) |
| Manual dependency tracing | Read `.ccs/project-map.md` (2K tokens) |

## Aider's Repo Map Approach (Reference)

The most token-efficient codebase understanding technique:
1. Parse all files with tree-sitter for definitions and references
2. Build a graph: files are nodes, imports/references are edges
3. Run PageRank to rank files by importance
4. Generate a map with only the highest-ranked symbols
5. Result: 5-10% of codebase size captures 90% of architecture

## JetBrains Research Finding

Observation masking outperforms LLM summarization for context compression:
- Replace older tool outputs with placeholders using a rolling window
- Maintain complete reasoning and action history
- 50%+ cost reduction vs unmanaged context
- Simpler approaches win on both cost and performance

## Sourcegraph Cody's Multi-Signal Retrieval

Different retrieval methods surface complementary information:
- **Keyword search** — precise for known terms
- **Semantic search** — for conceptually related code
- **Graph-based retrieval** — for function calls and implementations
- **Local context** — editor state, recent history

No single approach is sufficient. Combine at least 2 for good results.

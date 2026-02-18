# Context Engineering Strategies

Strict rules for every CCS skill. This document governs how context is gathered, which model handles what, and how tokens are spent. Every skill MUST follow these rules.

---

## Model Roles — The Three Minds

Each model has ONE job. Do not misuse them.

### Haiku 4.5 — The Eyes (Scout)
**Job:** Look at things fast and cheap. Scan files. Search patterns. Read indexes. Report findings.
- Reads `.ccs/` reference files
- Runs Glob and Grep searches
- Reads file headers (first 50 lines)
- Counts, lists, summarizes existing data
- **NEVER writes code.** NEVER reasons about architecture. NEVER makes decisions.

### Sonnet 4.6 — The Hands (Executor)
**Job:** Write code. Edit files. Run commands. Execute plans that already exist.
- Implements features from a plan
- Fixes bugs where the root cause is already identified
- Runs tests and applies fixes
- Writes to files, runs Bash commands
- **NEVER explores.** NEVER reads files to "understand." Gets told exactly what to do.

### Opus 4.6 — The Brain (Thinker)
**Job:** Understand. Reason. Plan. Decide. Analyze complex situations.
- Reads code to understand WHY it works that way
- Plans implementation strategies
- Analyzes dependencies and blast radius
- Reviews code for logic, security, architecture issues
- Resolves ambiguous situations (merge conflicts, refactoring scope)
- **NEVER does grunt work.** NEVER scans files that Haiku already scanned.

---

## Phase-Based Task Execution

Every non-trivial task goes through phases. Each phase uses the RIGHT model.

### Single-Phase Tasks (one model only)
These are simple enough for one model:
- `/ccs-status` → Haiku reads 3 files, reports. Done.
- `/ccs-stash` → Haiku runs git stash, logs context. Done.
- `/ccs-log` → Haiku reads git log, cross-references task.md. Done.

### Two-Phase Tasks (scout → execute)
The scout finds, the executor acts:
- `/ccs-fix`: **Phase 1** (Haiku-speed scanning) — Grep for error, find the file, read the function. **Phase 2** (Sonnet execution) — Apply the fix, verify.
- `/ccs-build`: **Phase 1** — Read file-index + conventions, identify target files. **Phase 2** — Write the code following identified patterns.
- `/ccs-test`: **Phase 1** — Find test files, read test config. **Phase 2** — Run tests, apply fixes.
- `/ccs-branch`: **Phase 1** — Read git state, check existing refs. **Phase 2** — Execute git command, generate ref file.
- `/ccs-sync`: **Phase 1** — Fetch, check divergence, read branch ref. **Phase 2** — Pull/push/rebase.

### Three-Phase Tasks (scout → think → execute)
Complex tasks need all three minds:
- `/ccs-plan`: **Phase 1** (scan) — Read file-index, architecture, project-map. **Phase 2** (reason) — Analyze dependencies, design approach, write plan. **Phase 3** — Save plan to task.md.
- `/ccs-refactor`: **Phase 1** — Find all usages via Grep. **Phase 2** — Analyze blast radius, plan safe order. **Phase 3** — Execute refactoring steps.
- `/ccs-audit`: **Phase 1** — Scan for patterns (Grep for eval, innerHTML, SQL strings). **Phase 2** — Analyze findings for real vs false positives. **Phase 3** — Write report.
- `/ccs-review`: **Phase 1** — Read changed files + their context. **Phase 2** — Reason about correctness, security, patterns. **Phase 3** — Write review.
- `/ccs-pr`: **Phase 1** — Read branch ref, git diff, file-index. **Phase 2** — Analyze impact, write PR description. **Phase 3** — Save to .ccs/pulls/.
- `/ccs-merge`: **Phase 1** — Read both branch refs, find overlapping files. **Phase 2** — Predict conflicts, plan strategy. **Phase 3** — Execute merge.
- `/ccs-diff`: **Phase 1** — Get changed files via git. **Phase 2** — Walk dependency chains, categorize changes. **Phase 3** — Write impact report.

### Key Rule: Phases Do NOT Repeat
Phase 1 output feeds Phase 2. Phase 2 output feeds Phase 3. Nothing goes backward. If Phase 2 discovers missing context, it reads ONLY the specific missing file — it does NOT re-run Phase 1.

---

## File Selection — Strict Rules

### What to Read and When

**Before touching ANY source file, check these in order:**
1. `.ccs/file-index.md` — Does the file-index mention relevant files? If yes, you already know what to read.
2. `.ccs/branches/<name>.md` — Is there a branch ref? If yes, it tells you what changed.
3. `.ccs/task.md` — Did a previous task already read this? If yes, use that context.
4. `.ccs/research/<topic>.md` — Was this already researched? If yes, use the saved result.

**Only THEN do a targeted search:**
5. Grep for specific symbol/function/error message
6. Read ONLY the matched file, ONLY the matched section (use offset + limit)

### What NEVER to Do
- NEVER run `Glob("**/*.ts")` to "see what's there" — the file-index already has this
- NEVER read an entire file when you need one function — use Grep to find the line, then Read with offset
- NEVER read test files unless the task is about testing
- NEVER read config files unless the task is about configuration
- NEVER read node_modules, dist, build, .next, or any generated directory
- NEVER spawn a Task/Explore agent — the `.ccs/` files replace all exploration

### Reading Strategy
| Need | Action | Cost |
|------|--------|------|
| "What files exist?" | Read `.ccs/file-index.md` | ~2K tokens |
| "How is this structured?" | Read `.ccs/architecture.md` | ~1K tokens |
| "What depends on X?" | Read `.ccs/project-map.md` | ~2K tokens |
| "What changed on this branch?" | Read `.ccs/branches/<name>.md` | ~1K tokens |
| "Where is function X defined?" | Grep for `function X\|const X\|class X` | ~0.1K tokens |
| "What does this function do?" | Read file with offset at the Grep match, limit 30 lines | ~0.5K tokens |
| "What's the full file?" | Read entire file — ONLY if you're about to modify it | ~2-5K tokens |

---

## Web Research Persistence

When ANY skill uses WebSearch or WebFetch, the results MUST be saved locally.

### Save Rule
Every web research result gets saved to `.ccs/research/<topic>.md`:

```markdown
# Research: <topic>

> Fetched: <timestamp>
> Source: <URL>
> Query: <search query>

## Findings
<extracted content — only the relevant parts, not entire pages>

## Applied To
- Task #N: <how this was used>

---
```

### Lookup Rule
Before ANY WebSearch or WebFetch:
1. Check `.ccs/research/` for existing files on this topic
2. If a file exists and is <7 days old → use it, skip the web call
3. If a file exists but is >7 days old → re-fetch and update
4. If no file exists → fetch, save, then use

### Why This Matters
- Web research costs 5-10K tokens per call (fetch + process)
- Saving locally means the ENTIRE project benefits — every session, every skill
- Common lookups (framework docs, error solutions, library APIs) are fetched ONCE
- `.ccs/research/` becomes the project's knowledge base

---

## Strict Anti-Waste Rules

### Rule 1: No Exploratory Reading
**Wrong:** "Let me read through the codebase to understand it"
**Right:** Read `.ccs/architecture.md` (1K tokens) — it already describes the system

### Rule 2: No Redundant Agent Spawning
**Wrong:** Spawn Explore agent → reads 50 files → spawns Plan agent → re-reads 30 files
**Right:** Read `.ccs/file-index.md` → Grep for specific symbols → Read only matched files

### Rule 3: No Full-File Reads for Partial Needs
**Wrong:** `Read("src/auth.ts")` — reads all 400 lines when you need line 23
**Right:** `Grep("validateToken", "src/auth.ts")` → `Read("src/auth.ts", offset=20, limit=30)`

### Rule 4: No Re-Scanning After Branch Switch
**Wrong:** "Let me understand what's on this branch" → reads 20 files
**Right:** `Read(".ccs/branches/feature-auth.md")` → knows everything in 1K tokens

### Rule 5: No Repeated Web Fetches
**Wrong:** WebSearch("React useEffect cleanup") — same search done 3 sessions ago
**Right:** `Read(".ccs/research/react-useeffect-cleanup.md")` — already saved locally

### Rule 6: Index Staleness Check Before Re-Scanning
If the index doesn't have what you need:
- **DO NOT** re-scan the codebase manually
- **DO** tell the user: "Index may be stale. Run `/ccs-refresh` to update."
- The refresh skill handles re-indexing efficiently (incremental mode)

### Rule 7: Task.md is Shared Memory
Before any skill starts work:
1. Read `.ccs/task.md` — check if a recent task already gathered relevant context
2. If Task #5 already read `src/auth.ts` and noted "uses JWT with RS256, validateToken at line 23" → use that finding, don't re-read the file

---

## Complexity-Based Model Selection

Not every task needs the same level of thinking. Match complexity to model.

### Quick Tasks — Haiku Only
- Status checks, file counts, staleness reports
- Git stash save/pop, commit log display
- Reading and displaying existing .ccs/ data
- Listing branches, showing branch refs
- **Token budget: <5K**

### Standard Tasks — Haiku Scout + Sonnet Execute
- Building a feature where the plan already exists
- Fixing a bug where the symptom points to a clear location
- Running tests and applying obvious fixes
- Creating/switching branches, syncing with remote
- **Token budget: <20K**

### Complex Tasks — Haiku Scout + Opus Think + Sonnet Execute
- Planning a feature (need to reason about architecture)
- Refactoring (need to trace all dependencies)
- Code review (need to reason about correctness)
- PR preparation (need to analyze blast radius)
- Merge analysis (need to predict conflicts)
- Security/performance audit (need to identify real vs false positives)
- **Token budget: <50K**

### Research Tasks — Haiku Scout + WebSearch + Save
- Looking up official documentation
- Resolving unknown errors
- Checking dependency health/CVEs
- **Token budget: <15K** (including web fetch)
- **ALWAYS save results to `.ccs/research/`**

---

## When Something Doesn't Work

### Error Resolution Flow
1. Read the error message carefully
2. Grep the codebase for the error string
3. Check `.ccs/research/` for previous solutions
4. If not found locally → WebSearch for the error + framework
5. Save the solution to `.ccs/research/<error-topic>.md`
6. Apply the fix
7. Log everything in task.md

### Skill Escalation
If a skill cannot complete its task:
- **Haiku skill stuck?** → Tell the user to run an Opus skill (e.g., `/ccs-plan` or `/ccs-review`)
- **Sonnet skill stuck?** → The plan may be incomplete. Tell the user to run `/ccs-plan` first.
- **Opus skill stuck?** → The index may be stale. Tell the user to run `/ccs-refresh`.
- **NEVER silently escalate** — always tell the user what to do next.

---

## Reference: Industry Approaches

### Aider's Repo Map
Parse all files → build graph → PageRank → top symbols only.
Result: 5-10% of codebase captures 90% of architecture. CCS uses this principle for file-index.md.

### JetBrains Research
Observation masking beats LLM summarization: replace old tool outputs with placeholders. 50%+ cost reduction. CCS uses this via task.md (cached findings replace re-reading).

### Sourcegraph Cody
Multi-signal retrieval: keyword + semantic + graph + local context. No single approach is sufficient. CCS combines index lookup + Grep + dependency walking.

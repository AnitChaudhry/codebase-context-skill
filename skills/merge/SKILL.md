---
name: merge
description: "Merge branches with dependency checking — compares branch refs, identifies conflicting dependencies, provides merge strategy recommendation"
argument-hint: "[source-branch] [into target-branch]"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, Task
model: claude-opus-4-6
context: fork
agent: general-purpose
---

# Merge with Dependency Checking

## Overview
Performs merges with full dependency awareness. Before merging, compares both branch refs to identify files changed in both branches, checks for conflicting dependency modifications, and provides a merge strategy recommendation. During conflicts, provides context-rich resolution guidance.

## When to Use
- Merging a feature branch into main
- Merging main into a feature branch (keeping up to date)
- When you need to understand merge risk before executing
- After `/ccs-pr` has generated the PR document

## Instructions

### Step 1: Identify Branches
1. Parse: `<source>` into `<target>` (default target: current branch)
2. If only one arg, merge that into current branch
3. Get current branch: `git rev-parse --abbrev-ref HEAD`
4. Find common ancestor: `git merge-base <source> <target>`

### Step 2: Pre-Merge Analysis
1. Read `.ccs/branches/<source>.md` and `.ccs/branches/<target>.md`
2. `git diff --name-only <base>...<source>` — files changed in source
3. `git diff --name-only <base>...<target>` — files changed in target
4. Find overlapping files (changed in both branches)
5. Read `.ccs/file-index.md` — rank overlapping files by importance
6. Read `.ccs/project-map.md` — check if overlapping files share dependencies

### Step 3: Conflict Prediction
1. Run `git merge-tree $(git merge-base <source> <target>) <source> <target>` to preview
2. Or use `git diff <source>...<target>` on overlapping files
3. For each potential conflict:
   - What did source change and why (from branch ref)
   - What did target change and why (from branch ref)
   - File rank and downstream impact
4. Classify risk:
   - **Low:** No overlapping files, or overlaps are in D/C-rank files
   - **Medium:** Overlaps in B-rank files, or touching same module
   - **High:** Overlaps in S/A-rank files, or conflicting dependency changes

### Step 4: Present Merge Strategy
```markdown
## Merge Analysis: <source> → <target>

### Overlap Assessment
| File | Source Changes | Target Changes | Rank | Risk |
|------|---------------|----------------|------|------|
| src/auth.ts | Added validation | Refactored flow | S | HIGH |
| src/config.ts | Updated DB url | Updated API url | C | LOW |

### Merge Strategy Recommendation
- **Risk level:** {low|medium|high}
- **Strategy:** {fast-forward|merge commit|rebase first}
- **Manual review needed:** {yes/no — list files if yes}

### Pre-Merge Checklist
- [ ] Both branches have passing tests
- [ ] Branch refs are up to date
- [ ] No conflicting dependency changes
- [ ] S-rank file changes reviewed
```

### Step 5: Ask User to Confirm
Use AskUserQuestion to confirm:
- Proceed with merge
- Abort and review further
- Try `--no-commit` (merge without committing for review)

### Step 6: Execute Merge
1. Run `git merge <source>` (or `git merge --no-commit <source>` if requested)
2. If conflicts:
   - Run `git diff --name-only --diff-filter=U` for conflicted files
   - For each conflict, provide context from branch refs
   - Suggest resolution based on file rank and change recency
   - Ask user how to proceed
3. If clean merge:
   - Report success and files merged

### Step 7: Post-Merge
1. Update `.ccs/branches/<source>.md` — set status to `merged`
2. Append to `.ccs/merge-history.md`:
```markdown
## Merge: <source> → <target>

**Date:** {now}
**Strategy:** {merge commit|fast-forward}
**Commit:** {merge-commit-hash}
**Conflicts:** {none|list}

### Files Affected
| File | Change Type |
|------|-------------|

---
```
3. Update `.ccs/branches/<target>.md` if it exists (new commits absorbed)
4. Clean up source branch ref if branch was deleted

### Step 8: Track in task.md
```markdown
## Task #{number}: Merge — <source> → <target>

**Timestamp:** {now}
**Status:** done
**Type:** merge

### Details
- **Source:** {source-branch}
- **Target:** {target-branch}
- **Strategy:** {merge commit|fast-forward|rebase}
- **Conflicts:** {none|N files}
- **Risk level:** {low|medium|high}
- **Files merged:** {count}
- **Overlapping files:** {count}
```

## Token Efficiency Rules
- Read branch refs first — they contain the change summaries already
- Use `--name-only` for file lists, not full diffs
- For conflict resolution, only read the conflicted files, not all merged files
- Dependency checking uses file-index ranks, not full code reading
- Cap analysis at overlapping files only — non-overlapping files are clean

## Limitations
- Does not handle octopus merges (3+ branches)
- Conflict resolution is advisory — user must accept/modify
- Does not delete the source branch after merge (user decides)
- Does not push the merge commit (use `/ccs-sync push`)

---
*Built by [Anit Chaudhary](https://github.com/AnitChaudhry) — codebase-context-skill v1.0.0*

# Codebase Context Skill — Agents Index v2.0.0

> **For orchestrators**: Quick reference for all available agents. Read `agents/<name>.md` for full instructions.

## Agent Registry

| # | Agent | Model | Role | Invocation |
|---|-------|-------|------|-----------|
| 1 | context-builder | opus | Deep codebase scan → .ccs/ index files | After `init` or `refresh` |
| 2 | test-runner | sonnet | Execute tests, track results, auto-fix | After `test` or `fix` |
| 3 | code-auditor | opus | Security, perf, dead code, a11y analysis | After `audit` |
| 4 | git-tracker | sonnet | Branch, PR, merge, diff, sync ops | After any git skill |
| 5 | knowledge-guide | haiku | Methodology guidance, note quality | Advisory — any time |
| 6 | team-lead | opus | Multi-agent coordination, task decomposition | After `team` |

## Tool Matrix

| Agent | Read | Write | Edit | Glob | Grep | Bash | Task |
|-------|:----:|:-----:|:----:|:----:|:----:|:----:|:----:|
| context-builder | x | x | | x | x | | |
| test-runner | x | x | | | x | x | |
| code-auditor | x | | | x | x | | |
| git-tracker | x | x | | | x | x | |
| knowledge-guide | x | | | | x | | |
| team-lead | x | x | | x | x | x | x |

## Agent → Skill Mapping

| Agent | Primary Skills | When to Invoke |
|-------|---------------|---------------|
| context-builder | init, refresh | New codebase, stale index, major changes |
| test-runner | test, fix | Test execution, failure diagnosis, auto-fix |
| code-auditor | audit, review | Security review, performance check, code quality |
| git-tracker | branch, pr, merge, diff, sync, log, stash | Any git workflow operation |
| knowledge-guide | — | Proactive guidance on methodology, note quality |
| team-lead | team | Complex multi-part tasks requiring parallel agents |

## Parallel Safety

| Agent | Can Run In Parallel | Writes To |
|-------|:------------------:|-----------|
| context-builder | no | .ccs/*.md |
| test-runner | yes (per test suite) | .ccs/task.md (append) |
| code-auditor | yes | stdout only |
| git-tracker | no | .ccs/branches/*.md, .ccs/pulls/*.md |
| knowledge-guide | yes | stdout only |
| team-lead | no | .ccs/team-board.md, .ccs/task.md |

## For SDK Integration

```python
from claude_agent_sdk import AgentDefinition

agents = {
    "context-builder": AgentDefinition(
        description="Deep codebase analysis, generates .ccs/ index files",
        prompt=open("agents/context-builder.md").read(),
        tools=["Read", "Glob", "Grep", "Write"],
        model="opus"
    ),
    "test-runner": AgentDefinition(
        description="Run tests, track results, auto-fix failures",
        prompt=open("agents/test-runner.md").read(),
        tools=["Bash", "Read", "Grep", "Write"],
        model="sonnet"
    ),
    "code-auditor": AgentDefinition(
        description="Security, performance, dead code, accessibility audits",
        prompt=open("agents/code-auditor.md").read(),
        tools=["Read", "Glob", "Grep"],
        model="opus"
    ),
    "git-tracker": AgentDefinition(
        description="Git workflow — branches, PRs, merges, diffs, sync",
        prompt=open("agents/git-tracker.md").read(),
        tools=["Bash", "Read", "Grep", "Write"],
        model="sonnet"
    ),
    "knowledge-guide": AgentDefinition(
        description="Methodology guidance, note quality, connection suggestions",
        prompt=open("agents/knowledge-guide.md").read(),
        tools=["Read", "Grep"],
        model="haiku"
    ),
    "team-lead": AgentDefinition(
        description="Multi-agent team coordination, task decomposition, parallel dispatch",
        prompt=open("agents/team-lead.md").read(),
        tools=["Read", "Write", "Glob", "Grep", "Bash", "Task"],
        model="opus"
    ),
}
```

---
*Thinqmesh Technologies — codebase-context-skill v2.0.0*

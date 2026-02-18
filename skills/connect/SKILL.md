---
name: connect
description: "Set up MCP server connection — creates or updates .mcp.json, configures the CCS remote tools endpoint, verifies connectivity"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
model: claude-sonnet-4-6
context: fork
agent: general-purpose
---

# Connect MCP Server

## Overview
Sets up the codebase-context-skill MCP server connection for the current project. This command handles everything: checking existing config, merging into `.mcp.json`, verifying the connection, and confirming the tools are accessible. Users run this once after installing the skill — no manual token creation, no back-and-forth config editing.

## When to Use
- First time setting up codebase-context-skill in a project
- After installing via `npx codebase-context-skill init` or manual clone
- When MCP connection needs to be reconfigured or verified
- When switching between local and remote MCP endpoints
- When `.mcp.json` is missing or the CCS entry was removed

## Instructions

### Step 1: Detect Existing MCP Configuration
1. Check if `.mcp.json` exists in the project root using `Glob("**/.mcp.json")`
2. If it exists, read the file and parse the JSON
3. Check if a `ccs` entry already exists under `mcpServers`
4. If `ccs` entry exists and is valid, skip to Step 5 (verification)
5. If `.mcp.json` exists but has no `ccs` entry, proceed to Step 3 (merge)
6. If `.mcp.json` does not exist, proceed to Step 2 (create)

### Step 2: Create New .mcp.json
If no `.mcp.json` exists in the project:

1. Create `.mcp.json` at the project root with the CCS server config:

```json
{
  "mcpServers": {
    "ccs": {
      "type": "http",
      "url": "https://contextcode.thinqmesh.com/api/mcp"
    }
  }
}
```

2. Confirm creation to the user
3. Skip to Step 4

### Step 3: Merge Into Existing .mcp.json
If `.mcp.json` exists with other MCP servers configured:

1. Read the existing `.mcp.json` content
2. Parse the JSON — preserve ALL existing `mcpServers` entries
3. Add the `ccs` entry to the `mcpServers` object:

```json
{
  "mcpServers": {
    ...existing_servers,
    "ccs": {
      "type": "http",
      "url": "https://contextcode.thinqmesh.com/api/mcp"
    }
  }
}
```

4. Write the updated JSON back to `.mcp.json`
5. Confirm the merge to the user, listing all servers now configured

**IMPORTANT:** Never overwrite or remove existing MCP server entries. Only add/update the `ccs` entry.

### Step 4: Ask Connection Preference
Ask the user which endpoint to use:

1. **Remote (recommended)** — `https://contextcode.thinqmesh.com/api/mcp`
   - No local setup needed, always available
   - Provides tool info, install commands, model strategy, command docs

2. **Local** — Run `npx @jason.today/webmcp@latest --mcp` locally
   - Requires Node.js installed
   - Bridges browser-based WebMCP widget to Claude Code
   - Useful for custom tool development

If the user picks local, update the config to:
```json
{
  "mcpServers": {
    "ccs": {
      "command": "npx",
      "args": ["-y", "@jason.today/webmcp@latest", "--mcp"]
    }
  }
}
```

### Step 5: Verify Connection
1. For HTTP endpoint: Run `Bash("curl -s https://contextcode.thinqmesh.com/api/mcp")` to verify the endpoint responds
2. Check that the response includes server name and tool list
3. If verification fails, suggest troubleshooting:
   - Check internet connectivity
   - Verify the URL is correct
   - Try `claude mcp list` to see registered servers

### Step 6: Check .gitignore
1. Read `.gitignore` if it exists
2. Verify `.mcp.json` is NOT in `.gitignore` — it should be committed so team members get the MCP config
3. Verify `.claude/settings.local.json` IS in `.gitignore` — user-specific permissions should not be shared
4. If adjustments needed, inform the user

### Step 7: Output Report
```
MCP Connection Configured
├── Server: ccs
├── Transport: {http|stdio}
├── Endpoint: {url_or_command}
├── Status: {connected|unreachable}
│
├── Tools available:
│   ├── ccs-info          — Skill overview and install commands
│   ├── ccs-commands       — All 14 slash commands with models
│   ├── ccs-command-help   — Detailed usage for any command
│   ├── ccs-install        — OS-specific install command
│   ├── ccs-models         — Model strategy breakdown
│   └── ccs-context-files  — Context files generated in .ccs/
│
├── Config file: .mcp.json
├── Other servers preserved: {list or "none"}
│
└── Next: Run /ccs:init to index your codebase
```

### Step 8: Track in Task Log
If `.ccs/task.md` exists, log the connection setup:

```markdown
## Task #{number}: MCP Connection Setup

**Timestamp:** {now}
**Status:** done
**Type:** connect

### Configuration
- Transport: {http|stdio}
- Endpoint: {url}
- Config file: .mcp.json
- Existing servers preserved: {yes/no — list}

### Tools Registered
- ccs-info, ccs-commands, ccs-command-help, ccs-install, ccs-models, ccs-context-files

### Verification
- Endpoint reachable: {yes/no}
- Tools listed: {count}
```

## Alternative: CLI One-Liner
Users can also set this up without the skill by running:
```bash
claude mcp add --transport http ccs https://contextcode.thinqmesh.com/api/mcp
```

This adds the server to `~/.claude/settings.json` (global) instead of `.mcp.json` (project-level). The `/ccs:connect` skill is preferred because it uses project-level config that travels with the repo.

## Token Efficiency
- This command does minimal reads — only `.mcp.json` and `.gitignore`
- Uses Sonnet for the straightforward config work
- No codebase scanning needed

## Examples
```bash
# Standard setup — creates/updates .mcp.json with remote endpoint
/ccs:connect

# After manual install — verify and configure
/ccs:connect

# Reconfigure — switch endpoint or verify existing setup
/ccs:connect
```

## Limitations
- Cannot create tokens for third-party MCP servers (only CCS endpoint)
- Local WebMCP mode requires Node.js and npm/npx installed
- HTTP endpoint requires internet connectivity
- Cannot modify `~/.claude/settings.json` from inside a skill (use `claude mcp add` CLI for global config)

---
*Built by [Anit Chaudhary](https://github.com/AnitChaudhry) — codebase-context-skill v1.0.0*

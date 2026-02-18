# MCP Server Setup Reference

Guide for setting up and connecting the codebase-context-skill MCP server.

## What is the CCS MCP Server?

The CCS MCP server exposes 6 tools that provide codebase-context-skill information to Claude Code and other MCP-compatible clients. It runs as a remote HTTP endpoint on Vercel — no local server needed.

**Endpoint:** `https://contextcode.thinqmesh.com/api/mcp`

## Available Tools

| Tool | Description |
|------|-------------|
| `ccs-info` | Skill overview, features, all install methods |
| `ccs-commands` | All 14 slash commands with descriptions and model assignments |
| `ccs-command-help` | Detailed usage for any specific command |
| `ccs-install` | OS-specific install command for any package manager |
| `ccs-models` | Model strategy — which Claude model handles which task |
| `ccs-context-files` | Info about generated .ccs/ context files |

## Setup Methods

### Method 1: /ccs-connect (Recommended)
Run inside Claude Code after installing the skill:
```
/ccs-connect
```
This automatically creates or updates `.mcp.json` in your project root.

### Method 2: CLI One-Liner
Add to global Claude Code config:
```bash
claude mcp add --transport http ccs https://contextcode.thinqmesh.com/api/mcp
```

### Method 3: Manual .mcp.json
Create `.mcp.json` in your project root:
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

### Method 4: Local WebMCP (Development)
For local development with the browser widget:
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
This requires Node.js and runs a local WebSocket bridge.

## Config File Locations

| File | Scope | Use |
|------|-------|-----|
| `.mcp.json` (project root) | Project-level | Shared with team via git, recommended |
| `~/.claude/settings.json` | Global | Applies to all projects for this user |
| `.claude/settings.local.json` | Project-level, user-specific | Permissions only, never commit |

## Merging With Existing Config

If you already have `.mcp.json` with other MCP servers, `/ccs-connect` will merge — never overwrite. Example:

**Before:**
```json
{
  "mcpServers": {
    "github": { "command": "npx", "args": ["@modelcontextprotocol/server-github"] },
    "filesystem": { "command": "npx", "args": ["@modelcontextprotocol/server-filesystem", "/path"] }
  }
}
```

**After /ccs-connect:**
```json
{
  "mcpServers": {
    "github": { "command": "npx", "args": ["@modelcontextprotocol/server-github"] },
    "filesystem": { "command": "npx", "args": ["@modelcontextprotocol/server-filesystem", "/path"] },
    "ccs": {
      "type": "http",
      "url": "https://contextcode.thinqmesh.com/api/mcp"
    }
  }
}
```

## Verification

Test the endpoint manually:
```bash
# Health check (GET)
curl https://contextcode.thinqmesh.com/api/mcp

# MCP initialize request (POST)
curl -X POST https://contextcode.thinqmesh.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}'

# List tools (POST)
curl -X POST https://contextcode.thinqmesh.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'
```

Inside Claude Code:
```bash
claude mcp list        # See all configured servers
claude mcp get ccs     # Check CCS server details
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| "Server not found" | Run `/ccs-connect` or `claude mcp add --transport http ccs https://contextcode.thinqmesh.com/api/mcp` |
| "Connection refused" | Check internet connectivity, verify URL |
| Tools not showing | Restart Claude Code session after adding MCP config |
| Conflict with existing config | `/ccs-connect` merges safely — check `.mcp.json` for duplicate entries |
| Local WebMCP not connecting | Ensure Node.js is installed, run `npx @jason.today/webmcp@latest --new` to generate a token first |

## Security

- The remote endpoint is read-only — it only serves skill information (install commands, docs, model strategy)
- No authentication required — all data is public (same as the website)
- No user data is collected or stored
- `.mcp.json` should be committed to git (it contains no secrets)
- `.claude/settings.local.json` should be in `.gitignore` (contains user-specific permissions)

## Architecture

```
User's Project
├── .mcp.json                    ← Project MCP config (committed)
├── .claude/settings.local.json  ← User permissions (gitignored)
└── .ccs/                        ← Generated context (gitignored)

                    ↓ MCP Protocol (HTTP)

Vercel (contextcode.thinqmesh.com)
└── api/mcp.js                   ← Serverless MCP endpoint
    ├── ccs-info
    ├── ccs-commands
    ├── ccs-command-help
    ├── ccs-install
    ├── ccs-models
    └── ccs-context-files
```

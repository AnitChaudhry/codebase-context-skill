# Claude Code Statusline

A rich, customizable statusline for Claude Code with colored legends, context progress bar, GitHub info, token tracking, and active skill display.

## Layout

```
 Model: Opus 4.6                      │  GitHub: User/Repo/master+~
 Skill: Edit                          │  Dir: Downloads/Project
 Tokens: 25k + 12k = 37k             │  Cost: $1.23
 Context: ████████████████████░░░░░░░░░░░░░░░░░░░░ 50%
```

## Fields

| Field   | Color            | Description |
|---------|------------------|-------------|
| Model   | Purple           | Active model name and version |
| GitHub  | White            | username/repo/branch with +~ dirty indicators |
| Skill   | Pink             | Last tool used (Read, Write, Edit, Terminal, etc.) |
| Dir     | Cyan             | Last 2 segments of working directory |
| Tokens  | Yellow           | Input + Output = Total (e.g., 25k + 12k = 37k) |
| Cost    | Green            | Session cost in USD |
| Context | White/Orange/Red | 40-char progress bar (white ≤40%, orange 41-75%, red >75%) |

## Installation

1. Copy `statusline-command.sh` to `~/.claude/`:
   ```bash
   cp statusline-command.sh ~/.claude/statusline-command.sh
   ```

2. Add to `~/.claude/settings.json`:
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "bash ~/.claude/statusline-command.sh"
     }
   }
   ```

3. Restart Claude Code.

## Requirements

- Git Bash or any bash shell (no `jq` required — uses grep/sed/awk)
- Git (for GitHub field)
- Works on Windows, macOS, Linux

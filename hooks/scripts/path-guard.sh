#!/bin/bash
# Path Guard — PreToolUse hook
# Blocks writes/edits/deletes to protected CCS paths.
# Reads tool input JSON from stdin.
# Returns {"decision":"block","reason":"..."} to prevent the tool from running.
#
# PROTECTED (immutable — never modify or delete):
#   ops/sessions/**          — completed session records
#   .claude/skills/ccs-*/**  — installed skill plugin files
#   hooks/scripts/**         — hook scripts themselves
#   hooks/hooks.json         — hook manifest
#
# GUARDED (no bulk refactor — individual read/write/modify allowed):
#   references/**            — feature docs (add/edit one file at a time, never delete or mass-rename)
#   skills/**                — skill definitions (read + targeted edit only, never bulk refactor)
#   agents/**                — agent definitions (same)

# Only run in CCS-enabled projects
GUARD_DIR="$(cd "$(dirname "$0")" && pwd)"
if ! "$GUARD_DIR/project-guard.sh"; then
  cat > /dev/null
  exit 0
fi

# Read JSON from stdin
INPUT=$(cat)

# Extract file_path from tool input (Write, Edit, MultiEdit)
if command -v jq &>/dev/null; then
  FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
else
  FILE=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"//')
  COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"//')
fi

# ── BLOCK: ops/sessions — immutable once written by session-capture ──────────
case "$FILE" in
  */ops/sessions/*|ops/sessions/*)
    echo "{\"decision\":\"block\",\"reason\":\"PROTECTED: ops/sessions/ records are immutable. Session data must never be modified or deleted after capture. These are the permanent audit trail of completed sessions.\"}"
    exit 0
    ;;
esac

# ── BLOCK: installed skill plugin files ──────────────────────────────────────
case "$FILE" in
  */.claude/skills/ccs-*/*|.claude/skills/ccs-*/*)
    echo "{\"decision\":\"block\",\"reason\":\"PROTECTED: Installed CCS skill plugin files (.claude/skills/ccs-*/) must not be modified. To update the skill, reinstall from the source repo. Modifying installed skill files causes drift and breaks future updates.\"}"
    exit 0
    ;;
esac

# ── BLOCK: hook scripts and manifest ─────────────────────────────────────────
case "$FILE" in
  */hooks/scripts/*|hooks/scripts/*|*/hooks/hooks.json|hooks/hooks.json)
    echo "{\"decision\":\"block\",\"reason\":\"PROTECTED: CCS hook scripts and hooks.json must not be modified during normal operation. Changes to hooks require explicit deliberate intent — do not modify these as part of refactoring or build tasks.\"}"
    exit 0
    ;;
esac

# ── BLOCK: Bash commands that rm/delete session files ────────────────────────
if [ -n "$COMMAND" ]; then
  case "$COMMAND" in
    *ops/sessions*rm*|*rm*ops/sessions*|*"ops/sessions"*)
      if echo "$COMMAND" | grep -qE '(rm|del|unlink|truncate)'; then
        echo "{\"decision\":\"block\",\"reason\":\"PROTECTED: Deletion commands targeting ops/sessions/ are blocked. Session records are immutable after capture.\"}"
        exit 0
      fi
      ;;
  esac
fi

# ── WARN: references/ — no bulk refactor, individual edits allowed ────────────
case "$FILE" in
  */references/*|references/*)
    # Count how many reference files are being touched — warn if this looks like a bulk operation
    # (We can't fully detect bulk from a single PreToolUse call, so we flag any delete attempt)
    TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
    # Block if it appears to be replacing/deleting a references file with empty content
    if command -v jq &>/dev/null; then
      CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
      if [ -z "$CONTENT" ] && [ "$TOOL_NAME" = "Write" ]; then
        echo "{\"decision\":\"block\",\"reason\":\"GUARDED: Refusing to overwrite a references/ file with empty content. References are system documentation — individual targeted edits are allowed but empty overwrites are not.\"}"
        exit 0
      fi
    fi
    # Allow but inject context warning
    echo "{\"additionalContext\":\"GUARDED PATH: references/ files are CCS system documentation. Scoped individual edits are allowed. Do NOT bulk-refactor, mass-rename, or delete reference files. If you need to update a reference, edit only the specific section that changed.\"}"
    exit 0
    ;;
esac

# ── WARN: skills/ and agents/ — targeted edits only ─────────────────────────
case "$FILE" in
  */skills/*/SKILL.md|skills/*/SKILL.md|*/agents/*.md|agents/*.md)
    echo "{\"additionalContext\":\"GUARDED PATH: CCS skill/agent definition files. Targeted single-file edits are permitted. Do NOT bulk-refactor the skills/ or agents/ directories. Each skill is an independent unit — changes must be scoped to the specific skill being updated.\"}"
    exit 0
    ;;
esac

exit 0

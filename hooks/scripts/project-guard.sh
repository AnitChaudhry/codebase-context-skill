#!/bin/bash
# Project Guard — ensures hooks only run in CCS-enabled projects
# Exit 0 = CCS project detected (safe to proceed)
# Exit 1 = not a CCS project (caller should exit)

MARKER=".ccs"

# Primary check: marker file
if [ -f "$MARKER" ]; then
  exit 0
fi

# Fallback: detect CCS context files
if [ -d ".ccs" ] || [ -f ops/config.yaml ] || [ -f .claude/hooks/session-orient.sh ]; then
  mkdir -p .ccs
  echo "ccs-enabled" > "$MARKER/marker"
  exit 0
fi

# Not a CCS project
exit 1

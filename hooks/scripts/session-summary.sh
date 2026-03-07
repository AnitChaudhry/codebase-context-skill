#!/bin/bash
# Session Summary Hook — SessionStart
# Injects a compact project summary into Claude's context at session start.
# This summary is stable (code-generated) → maximizes prompt cache hits.

# Only run in CCS-enabled projects
if [ ! -f ".ccs/index.json" ]; then
  exit 0
fi

# Find the CCS engine binary
CCS_BIN=""
if command -v ccs &>/dev/null; then
  CCS_BIN="ccs"
elif [ -f "./node_modules/.bin/ccs" ]; then
  CCS_BIN="./node_modules/.bin/ccs"
elif [ -f "./dist/cli.js" ]; then
  CCS_BIN="node ./dist/cli.js"
fi

if [ -z "$CCS_BIN" ]; then
  exit 0
fi

# Output the project summary — Claude Code injects stdout into context
$CCS_BIN summary 2>/dev/null

exit 0

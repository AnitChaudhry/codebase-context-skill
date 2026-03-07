#!/bin/bash
# Context Injection Hook — UserPromptSubmit
# Intercepts user queries, runs the CCS engine to find relevant files,
# and injects precise context into Claude's prompt.
# Result: Claude gets exactly the right codebase context with ZERO exploration.

# Only run in CCS-enabled projects (has .ccs/index.json)
if [ ! -f ".ccs/index.json" ]; then
  cat > /dev/null
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
  cat > /dev/null
  exit 0
fi

# Read the hook input JSON from stdin
INPUT=$(cat)

# Extract the user's prompt
PROMPT=$(echo "$INPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    try { console.log(JSON.parse(d).prompt || ''); } catch { console.log(''); }
  });
" 2>/dev/null <<< "$INPUT")

# Skip empty prompts or slash commands
if [ -z "$PROMPT" ] || [[ "$PROMPT" == /* ]]; then
  exit 0
fi

# Skip very short queries (greetings, confirmations)
if [ ${#PROMPT} -lt 10 ]; then
  exit 0
fi

# Run the engine to build context
CONTEXT=$($CCS_BIN context "$PROMPT" 2>/dev/null)

if [ -n "$CONTEXT" ] && [ ${#CONTEXT} -gt 50 ]; then
  # Return additionalContext for Claude
  node -e "
    const ctx = process.argv[1];
    console.log(JSON.stringify({ additionalContext: ctx }));
  " "$CONTEXT"
fi

exit 0

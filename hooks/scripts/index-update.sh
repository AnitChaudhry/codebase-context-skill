#!/bin/bash
# Index Update Hook — PostToolUse (Write/Edit), async
# After Claude writes or edits a file, incrementally update the CCS index.
# Runs asynchronously so it doesn't block Claude's response.

# Only run in CCS-enabled projects
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

# Extract the file path that was written/edited
FILE_PATH=$(echo "$INPUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    try {
      const o = JSON.parse(d);
      console.log(o.tool_input?.file_path || o.tool_input?.path || '');
    } catch { console.log(''); }
  });
" 2>/dev/null <<< "$INPUT")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Skip if the file is inside .ccs/ (our own index)
case "$FILE_PATH" in
  *.ccs/*|*/.ccs/*) exit 0 ;;
esac

# Update the index for this single file
$CCS_BIN update "$FILE_PATH" 2>/dev/null

exit 0

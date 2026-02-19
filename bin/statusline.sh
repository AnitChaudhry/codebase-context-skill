#!/usr/bin/env bash
# Claude Code status line — 4-row grid, no jq, cross-platform
# Row 1: Skill    │  GitHub
# Row 2: Model    │  Dir
# Row 3: Tokens   │  Cost
# Row 4: Context (wide progress bar)

input=$(cat)

# --- Helpers ---
json_val() {
  echo "$input" | grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 | sed 's/.*:.*"\(.*\)"/\1/'
}
json_num() {
  echo "$input" | grep -o "\"$1\"[[:space:]]*:[[:space:]]*[0-9.]*" | head -1 | sed 's/.*:[[:space:]]*//'
}
# Convert any path to forward slashes (safe on all OS)
to_fwd() {
  echo "$1" | tr '\\' '/' | sed 's|//\+|/|g'
}

# Right-pad a colored string to a visible width
rpad() {
  local str="$1" w="$2"
  local plain
  plain=$(printf '%b' "$str" | sed $'s/\033\\[[0-9;]*m//g')
  local vlen=${#plain}
  local need=$(( w - vlen ))
  printf '%b' "$str"
  [ "$need" -gt 0 ] && printf "%${need}s" ""
}

# --- Colors ---
RST='\033[0m'
BOLD='\033[1m'
CYAN='\033[38;2;6;182;212m'
PURPLE='\033[38;2;168;85;247m'
GREEN='\033[38;2;34;197;94m'
YELLOW='\033[38;2;245;158;11m'
RED='\033[38;2;239;68;68m'
ORANGE='\033[38;2;251;146;60m'
WHITE='\033[38;2;228;228;231m'
PINK='\033[38;2;236;72;153m'
BLUE='\033[38;2;99;102;241m'
TEAL='\033[38;2;20;184;166m'
SEP='\033[38;2;55;55;62m'
DIM_BAR='\033[38;2;40;40;45m'

# ── 1. Directory ──
cwd=$(json_val "current_dir")
[ -z "$cwd" ] && cwd=$(json_val "cwd")
if [ -z "$cwd" ]; then
  dir_label="~"
  clean_cwd=""
else
  clean_cwd=$(to_fwd "$cwd")
  dir_label=$(echo "$clean_cwd" | awk -F'/' '{if(NF>3) print $(NF-2)"/"$(NF-1)"/"$NF; else if(NF>2) print $(NF-1)"/"$NF; else print $0}')
  [ -z "$dir_label" ] && dir_label="~"
fi

# ── 2. Model ──
model_display=$(json_val "display_name")
model_id=$(json_val "id")
[ -z "$model_display" ] && model_display="unknown"
model_ver=""
if [ -n "$model_id" ]; then
  model_ver=$(echo "$model_id" | sed -n 's/.*-\([0-9]*\)-\([0-9]*\)$/\1.\2/p')
fi
if [ -n "$model_ver" ] && ! echo "$model_display" | grep -q '[0-9]'; then
  model_full="${model_display} ${model_ver}"
else
  model_full="$model_display"
fi

# ── 3. Context bar (wide: 40 chars) ──
pct=$(json_num "used_percentage")
[ -z "$pct" ] && pct="0"
pct=$(echo "$pct" | cut -d. -f1)
if [ "$pct" -gt 75 ] 2>/dev/null; then
  CTX_CLR="$RED"
elif [ "$pct" -gt 40 ] 2>/dev/null; then
  CTX_CLR="$ORANGE"
else
  CTX_CLR="$WHITE"
fi
BAR_WIDTH=40
filled=$(( pct * BAR_WIDTH / 100 ))
[ "$filled" -gt "$BAR_WIDTH" ] && filled=$BAR_WIDTH
empty=$(( BAR_WIDTH - filled ))
bar_filled=""; bar_empty=""
i=0; while [ $i -lt $filled ]; do bar_filled="${bar_filled}█"; i=$((i+1)); done
i=0; while [ $i -lt $empty ]; do bar_empty="${bar_empty}░"; i=$((i+1)); done
ctx_bar="${CTX_CLR}${bar_filled}${RST}${DIM_BAR}${bar_empty}${RST} ${CTX_CLR}${pct}%${RST}"

# ── 4. GitHub: user/repo/branch + dirty ──
branch="no-git"
gh_user=""
gh_repo=""
git_dirty=""
if [ -n "$clean_cwd" ]; then
  branch=$(git --no-optional-locks -C "$clean_cwd" symbolic-ref --short HEAD 2>/dev/null)
  [ -z "$branch" ] && branch=$(git --no-optional-locks -C "$clean_cwd" rev-parse --short HEAD 2>/dev/null)
  if [ -n "$branch" ]; then
    remote_url=$(git --no-optional-locks -C "$clean_cwd" remote get-url origin 2>/dev/null)
    if [ -n "$remote_url" ]; then
      gh_user=$(echo "$remote_url" | sed 's|.*github\.com[:/]\([^/]*\)/.*|\1|')
      [ "$gh_user" = "$remote_url" ] && gh_user=""
      gh_repo=$(echo "$remote_url" | sed 's|.*/\([^/]*\)\.git$|\1|; s|.*/\([^/]*\)$|\1|')
      [ "$gh_repo" = "$remote_url" ] && gh_repo=""
    fi
    git --no-optional-locks -C "$clean_cwd" diff --cached --quiet 2>/dev/null || git_dirty="${GREEN}+${RST}"
    git --no-optional-locks -C "$clean_cwd" diff --quiet 2>/dev/null || git_dirty="${git_dirty}${YELLOW}~${RST}"
  fi
  [ -z "$branch" ] && branch="no-git"
fi
if [ -n "$gh_repo" ]; then
  gh_label="${gh_user}/${gh_repo}/${branch}"
else
  gh_label="$branch"
fi

# ── 5. Cost (green, price only) ──
cost_raw=$(json_num "total_cost_usd")
if [ -z "$cost_raw" ] || [ "$cost_raw" = "0" ]; then
  cost_label='$0.00'
else
  cost_label=$(awk -v c="$cost_raw" 'BEGIN { if (c < 0.01) printf "$%.4f", c; else printf "$%.2f", c }')
fi

# ── 5b. Tokens (input + output = total) ──
total_in=$(json_num "total_input_tokens")
total_out=$(json_num "total_output_tokens")
[ -z "$total_in" ] && total_in="0"
[ -z "$total_out" ] && total_out="0"
fmt_tok() {
  awk -v t="$1" 'BEGIN {
    if (t >= 1000000) printf "%.1fM", t/1000000
    else if (t >= 1000) printf "%.0fk", t/1000
    else printf "%d", t
  }'
}
tok_in=$(fmt_tok "$total_in")
tok_out=$(fmt_tok "$total_out")
tok_total=$(awk -v i="$total_in" -v o="$total_out" 'BEGIN { printf "%d", i + o }')
tok_total_fmt=$(fmt_tok "$tok_total")
token_label="${tok_in} + ${tok_out} = ${tok_total_fmt}"

# ── 6. Skill (live tool detection from transcript) ──
skill_label="Idle"
tpath=""

# Find the most recent transcript from ~/.claude/projects/<hash>/*.jsonl
# Walks up parent directories if exact match not found (handles subfolders)
if [ -n "$clean_cwd" ]; then
  search_path="$clean_cwd"
  while [ -n "$search_path" ] && [ "$search_path" != "/" ]; do
    proj_hash=$(echo "$search_path" | sed 's|^/\([a-zA-Z]\)/|\U\1--|; s|^[A-Z]:/|&|; s|:/|--|; s|/|-|g')
    proj_dir="$HOME/.claude/projects/${proj_hash}"
    if [ -d "$proj_dir" ]; then
      tpath=$(ls -t "$proj_dir"/*.jsonl 2>/dev/null | head -1)
      [ -n "$tpath" ] && break
    fi
    # Go up one directory
    search_path=$(echo "$search_path" | sed 's|/[^/]*$||')
  done
fi

if [ -n "$tpath" ] && [ -f "$tpath" ]; then
  # Read recent transcript lines
  recent_block=$(tail -200 "$tpath" 2>/dev/null)

  # Get the LAST tool used — this is what the user sees
  last_tool=$(echo "$recent_block" | grep -o '"type":"tool_use","id":"[^"]*","name":"[^"]*"' | tail -1 | sed 's/.*"name":"\([^"]*\)".*/\1/')

  if [ -n "$last_tool" ]; then
    case "$last_tool" in
      Task)
        # Last tool is Task (agent) — count how many in recent block
        agent_count=$(echo "$recent_block" | grep -c '"type":"tool_use","id":"[^"]*","name":"Task"')
        if [ "$agent_count" -gt 1 ]; then
          skill_label="${agent_count} Agents"
        else
          agent_desc=$(echo "$recent_block" | grep -o '"description":"[^"]*"' | tail -1 | sed 's/"description":"//;s/"$//')
          if [ -n "$agent_desc" ]; then
            skill_label="Agent($(echo "$agent_desc" | cut -c1-20))"
          else
            skill_label="Agent"
          fi
        fi
        ;;
      Read)            skill_label="Read" ;;
      Write)           skill_label="Write" ;;
      Edit)            skill_label="Edit" ;;
      MultiEdit)       skill_label="Multi Edit" ;;
      Glob)            skill_label="Search(Files)" ;;
      Grep)            skill_label="Search(Content)" ;;
      Bash)            skill_label="Terminal" ;;
      WebSearch)       skill_label="Web Search" ;;
      WebFetch)        skill_label="Web Fetch" ;;
      Skill)           skill_label="Skill" ;;
      AskUserQuestion) skill_label="Asking..." ;;
      EnterPlanMode)   skill_label="Planning" ;;
      ExitPlanMode)    skill_label="Plan Ready" ;;
      TaskCreate)      skill_label="Task Create" ;;
      TaskUpdate)      skill_label="Task Update" ;;
      TaskGet)         skill_label="Task Get" ;;
      TaskList)        skill_label="Task List" ;;
      TaskStop)        skill_label="Task Stop" ;;
      TaskOutput)      skill_label="Task Output" ;;
      NotebookEdit)    skill_label="Notebook" ;;
      *)               skill_label="$last_tool" ;;
    esac
  fi
fi

# Fallback: check .ccs/task.md for last slash command
if [ "$skill_label" = "Idle" ] && [ -n "$clean_cwd" ]; then
  task_file="${clean_cwd}/.ccs/task.md"
  if [ -f "$task_file" ]; then
    last_skill=$(grep -oE '/ccs-[a-z]+' "$task_file" 2>/dev/null | tail -1)
    [ -n "$last_skill" ] && skill_label="$last_skill"
  fi
fi

# ── Column widths ──
C1=38  # Col 1
C2=30  # Col 2

# ── Separator ──
S=$(printf '%b' "  ${SEP}│${RST}  ")

# ── Assemble: 4 rows ──
# Row 1: Skill │ GitHub
printf ' '
rpad "${PINK}Skill:${RST} ${PINK}${skill_label}${RST}" "$C1"
printf '%b' "$S"
printf '%b\n' "${WHITE}GitHub:${RST} ${WHITE}${gh_label}${RST}${git_dirty}"

# Row 2: Model │ Dir
printf ' '
rpad "${PURPLE}Model:${RST} ${PURPLE}${BOLD}${model_full}${RST}" "$C1"
printf '%b' "$S"
printf '%b\n' "${CYAN}Dir:${RST} ${CYAN}${dir_label}${RST}"

# Row 3: Tokens │ Cost
printf ' '
rpad "${YELLOW}Tokens:${RST} ${YELLOW}${token_label}${RST}" "$C1"
printf '%b' "$S"
printf '%b\n' "${GREEN}Cost:${RST} ${GREEN}${cost_label}${RST}"

# Row 4: Context (wide bar, full width)
printf ' '
printf '%b' "${CTX_CLR}Context:${RST} ${ctx_bar}"

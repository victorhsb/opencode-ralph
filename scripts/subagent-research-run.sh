#!/usr/bin/env bash
set -euo pipefail

# Subagent Research Benchmark
#
# Runs a Ralph loop where the agent must answer a question about a target
# codebase using a subagent (Task tool) for the actual investigation.
# The primary agent is the planner/reporter; the subagent does the digging.
#
# Usage:
#   ./subagent-research-run.sh [mode] [model]
#   mode: "run" (default) or "init" (scaffold only, print command)
#   model: optional model string (e.g., anthropic/claude-sonnet-4)

MODE="${1:-run}"
MODEL="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORK_ROOT="$REPO_ROOT/.ralph/playground"
SESSION_DIR="$WORK_ROOT/subagent-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$SESSION_DIR"

# The target codebase to research is this repo itself.
# We record the path so the task can reference it.
TARGET_REPO="$REPO_ROOT"

cat > "$SESSION_DIR/TASK.md" <<MD
# Subagent Research Task

You are the planning agent. Your job is to answer the question below about
the codebase at \`$TARGET_REPO\` by delegating the investigation to a subagent
using the Task tool. You must NOT read the files yourself — all file access
must be done through a subagent.

## Question

> What are all the CLI flags exposed by Ralph's main command, and which source
> file(s) define them? Provide a concise summary with flag names, their
> descriptions, and the file path(s) where they are declared.

## Required Process

1. Spawn a subagent (Task tool) with a focused research prompt. The subagent
   should explore \`$TARGET_REPO/src/cli/\` to find flag definitions.
2. Wait for the subagent to return its findings.
3. Synthesize the subagent's output into a clean, structured answer written to
   \`$SESSION_DIR/answer.md\`.
4. The answer file must include:
   - A table of all flags (flag, shorthand, description, default if any)
   - The source file path(s) where the flags are defined
5. Output \`<promise>COMPLETE</promise>\` when the answer file is written.

## Rules

- You MUST use the Task tool to delegate file exploration to a subagent.
- Do not read source files directly with file tools — delegate that to the subagent.
- Write your final answer to \`$SESSION_DIR/answer.md\`.
- Output \`<promise>COMPLETE</promise>\` only after the file is written.
MD

echo "Session created: $SESSION_DIR"
echo "Target codebase: $TARGET_REPO"

if [[ "$MODE" == "init" ]]; then
  echo
  echo "Init-only mode. To run Ralph:"
  echo "  cd $SESSION_DIR"
  echo "  RALPH_DEBUG_EVENTS=1 RALPH_LOG_LEVEL=DEBUG bun run $REPO_ROOT/ralph.ts -f $SESSION_DIR/TASK.md --max-iterations 4 --no-commit --allow-all --debug-events --log-level DEBUG"
  exit 0
fi

RALPH_ARGS=(
  "--debug-events"
  "--log-level DEBUG"
  "-f" "$SESSION_DIR/TASK.md"
  "--max-iterations" "4"
  "--no-commit"
  "--allow-all"
)

if [[ -n "$MODEL" ]]; then
  RALPH_ARGS+=("--model" "$MODEL")
fi

echo
echo "Starting Ralph subagent research run..."
(
  cd "$SESSION_DIR"
  bun run "$REPO_ROOT/ralph.ts" "${RALPH_ARGS[@]}"
)

echo
if [[ -f "$SESSION_DIR/answer.md" ]]; then
  echo "=== Answer written to $SESSION_DIR/answer.md ==="
  cat "$SESSION_DIR/answer.md"
else
  echo "WARNING: answer.md was not created."
  exit 1
fi

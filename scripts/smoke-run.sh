#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-compact}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

COMMON_ARGS=("Smoke test tool rendering" "--max-iterations" "1")

FAKE_EVENTS='[
  {"type":"message.part.delta","properties":{"field":"text","delta":"[thinking] planning changes\n"}},
  {"type":"message.part.updated","properties":{"part":{"type":"tool_use","name":"glob"}}},
  {"type":"message.part.updated","properties":{"part":{"type":"tool_use","name":"read"}}},
  {"type":"message.part.updated","properties":{"part":{"type":"tool_use","name":"edit"}}},
  {"type":"session.idle"}
]'

export RALPH_FAKE_SDK=1
export RALPH_FAKE_OUTPUT='<promise>COMPLETE</promise>'
export RALPH_FAKE_EVENTS_JSON="$FAKE_EVENTS"

case "$MODE" in
  compact)
    (
      cd "$REPO_ROOT"
      bun run start -- "${COMMON_ARGS[@]}"
    )
    ;;
  verbose)
    (
      cd "$REPO_ROOT"
      bun run start -- "${COMMON_ARGS[@]}" --verbose-tools
    )
    ;;
  no-stream)
    (
      cd "$REPO_ROOT"
      bun run start -- "${COMMON_ARGS[@]}" --no-stream
    )
    ;;
  *)
    echo "Usage: $0 [compact|verbose|no-stream]"
    exit 1
    ;;
esac

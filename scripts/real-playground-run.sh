#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
MODEL="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORK_ROOT="$REPO_ROOT/.ralph/playground"
SESSION_DIR="$WORK_ROOT/session-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$SESSION_DIR/src" "$SESSION_DIR/tests"

cat > "$SESSION_DIR/package.json" <<'JSON'
{
  "name": "ralph-playground",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "bun test"
  }
}
JSON

cat > "$SESSION_DIR/src/string-utils.ts" <<'TS'
export function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueWords(input: string): string[] {
  const words = input
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return [...new Set(words)];
}

// TODO: implement this correctly.
export function summarizeTitle(input: string, maxLength = 24): string {
  if (!input) {
    return "";
  }
  return input.slice(0, maxLength);
}
TS

cat > "$SESSION_DIR/tests/string-utils.test.ts" <<'TS'
import { describe, expect, test } from "bun:test";
import { summarizeTitle, toSlug, uniqueWords } from "../src/string-utils";

describe("string utils playground", () => {
  test("toSlug normalizes spaces and punctuation", () => {
    expect(toSlug("  Hello, Bun + TypeScript!  ")).toBe("hello-bun-typescript");
  });

  test("uniqueWords is case-insensitive and stable", () => {
    expect(uniqueWords("Code code TEST test code")).toEqual(["code", "test"]);
  });

  test("summarizeTitle trims and appends ellipsis", () => {
    expect(summarizeTitle("  Build better demos for Ralph  ", 12)).toBe("Build better...");
  });

  test("summarizeTitle returns input when short", () => {
    expect(summarizeTitle("Tiny", 12)).toBe("Tiny");
  });
});
TS

cat > "$SESSION_DIR/TASK.md" <<'MD'
# Ralph Playground Task

Goal: make tests pass with production-quality code.

Rules:
- Keep implementation in `src/string-utils.ts`.
- Do not change test intent.
- Run tests before completion.
- Output `<promise>COMPLETE</promise>` when done.
MD

cat > "$SESSION_DIR/.gitignore" <<'TXT'
node_modules/
.ralph/
TXT

echo "Playground created: $SESSION_DIR"
echo "Seed check (expected failing test):"
(
  cd "$SESSION_DIR"
  bun test || true
)

if [[ "$MODE" == "init" ]]; then
  echo
  echo "Init-only mode. To run Ralph:"
  echo "  cd $SESSION_DIR"
  echo "  bun run $REPO_ROOT/ralph.ts \"Read TASK.md and complete it. Run bun test. Output <promise>COMPLETE</promise> when done.\" --max-iterations 8"
  exit 0
fi

RALPH_ARGS=(
  "-f"
  "$SESSION_DIR/TASK.md"
  "--max-iterations" "1"
)

if [[ -n "$MODEL" ]]; then
  RALPH_ARGS+=("--model" "$MODEL")
fi

echo
echo "Starting Ralph real run in: $SESSION_DIR"
(
  cd "$SESSION_DIR"
  bun run "$REPO_ROOT/ralph.ts" "${RALPH_ARGS[@]}"
)

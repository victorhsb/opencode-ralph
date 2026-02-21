# AGENTS.md

Operational guide for coding agents working in this repository.

## Project Identity

- Project: Ralph Loop (Open Ralph Wiggum), SDK-first loop runner for OpenCode.
- This fork is intentionally focused on OpenCode SDK integration.
- Multi-agent CLI support from the upstream project was removed.
- Primary references: `README.md` and `ARCHITECTURE.md`.
- SDK references:
  - `https://github.com/anomalyco/opencode`
  - `https://opencode.ai/docs/sdk`

## Tech Stack

- Runtime: Bun
- Language: TypeScript (ESM style)
- Testing: `bun:test`
- CLI entrypoint: `ralph.ts`
- SDK package: `@opencode-ai/sdk`

## Repository Map

- `ralph.ts`: top-level CLI entrypoint and command dispatch.
- `src/cli/`: argument parsing and command handlers.
- `src/loop/`: main iteration loop and per-iteration execution.
- `src/sdk/`: OpenCode SDK client and prompt executor.
- `src/state/`: persisted loop state and history.
- `src/tasks/`: task-file parsing and task mode helpers.
- `src/supervisor/`: supervisor suggestion pipeline.
- `src/config/`: constants, defaults, and path helpers.
- `tests/`: CLI-oriented integration-style tests.
- `src/sdk/__tests__/`: SDK parsing/tool-tracking tests.

## Setup And Daily Commands

Run commands from repository root.

- Install dependencies: `bun install`
- Run CLI in dev mode: `bun run start -- "Your prompt here" --max-iterations 3`
- Build distributables: `bun run build`
- Run default package test script: `bun run test`
- Run full discovered test suite (recommended before merge): `bun test`

## Single-Test Workflows (Important)

- Run one test file: `bun test ./src/sdk/__tests__/tool-tracking.test.ts`
- Run one test by name in a file: `bun test ./src/sdk/__tests__/tool-tracking.test.ts --test-name-pattern "tool_use event"`
- Short alias for name filter: `bun test ./src/sdk/__tests__/tool-tracking.test.ts -t "tool_use event"`
- Filter the package test script by name: `bun run test -- --test-name-pattern "rejects suggestion"`

## Lint / Format / Typecheck Status

- No dedicated lint script is configured in `package.json`.
- No ESLint/Prettier/Biome config is currently present.
- No `tsconfig.json` is currently present.
- Treat `bun run build` + relevant tests as the effective verification gate.

## Current Caveats In This Snapshot

- No hard timeouts on SDK execution: Agentic coding sessions naturally take several minutes to complete (builds, tests, complex refactoring). The executor waits for actual completion signals (session.idle/session.error events) rather than arbitrary time limits. The 15-minute inactivity timeout still applies to catch truly dead connections.

## Verification Order

Use this order for faster feedback:

1. Run the most targeted test first (single file or `-t` filter).
2. Run `bun run test` for package-script compatibility checks.
3. Run `bun test` to exercise all discovered tests.
4. Run `bun run build` as the final packaging/bundle gate.

If a command fails due to known caveats, report the exact blocker in your handoff.

## Code Style: Imports And Modules

- Use ESM `import` syntax and double quotes.
- Keep semicolons at statement ends.
- Prefer `import type` for type-only imports.
- Order imports as: external/core, then internal project modules.
- Use small focused modules by domain (`cli`, `loop`, `sdk`, `state`, etc.).
- Keep orchestration in `src/loop/loop.ts`; move reusable logic to dedicated modules.

## Code Style: Formatting

- Use 2-space indentation.
- Keep trailing commas in multiline arrays/objects/imports where already used.
- Prefer concise helper functions over deeply nested logic.
- Keep function bodies readable; split complex flows into named helpers.

## Code Style: Types

- Prefer explicit interfaces/types for structured data.
- Use string literal unions for status enums (for example task/suggestion states).
- Add explicit return types on exported functions.
- Avoid `any` unless interfacing with truly unknown SDK payloads.
- When using `unknown`, narrow with runtime checks before access.

## Naming Conventions

- `camelCase`: variables, functions, local helpers.
- `PascalCase`: interfaces/types.
- `UPPER_SNAKE_CASE`: constants.
- Keep filenames lowercase with hyphenated folders where already established (`fs-tracker`).

## Error Handling Conventions

- In CLI command paths, print actionable errors and exit non-zero.
- In parse/load helpers, fail soft when appropriate (`null`, empty arrays, parseError fields).
- Use `try/finally` for cleanup (especially SDK server close).
- Keep cleanup failure handlers minimal and non-fatal.
- Preserve existing behavior when changing error semantics.

## State, Files, And Generated Artifacts

- `.ralph/` is runtime state (loop state/history/context/tasks/supervisor files).
- Do not treat `.ralph/` as source of truth for code changes.
- Avoid committing runtime state artifacts.
- Source of truth is TypeScript under `ralph.ts` and `src/**`.
- `bin/ralph.js` and `dist/ralph.js` are generated outputs; regenerate from source.

## Testing Guidelines

- Use `bun:test` APIs (`describe`, `test`, `expect`).
- Prefer deterministic tests with temp directories over global state.
- Avoid hardcoded absolute paths in new tests.
- Keep tests focused on externally observable behavior.
- For SDK-event parsing logic, favor table-like event fixtures and explicit assertions.

## CLI Behavior Notes

- Completion is detected through `<promise>...</promise>` tags in output.
- Keep user-facing CLI errors actionable and concise.
- Preserve current flags and defaults unless the task explicitly changes them.
- Keep supervisor/task-mode behavior backward compatible when possible.

## Agent Workflow Expectations

- Read `README.md` and `ARCHITECTURE.md` before large changes.
- Keep changes minimal and scoped to the requested task.
- Run targeted tests first, then broader suite as needed.
- If no lint command exists, do not invent one in CI-sensitive changes unless requested.
- Document behavior changes in README/ARCHITECTURE when public UX changes.

## Cursor And Copilot Rules

- No `.cursorrules` file found.
- No `.cursor/rules/` directory found.
- No `.github/copilot-instructions.md` found.
- If any of these files are added later, treat them as highest-priority local agent rules.

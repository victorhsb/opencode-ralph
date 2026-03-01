# Contributing to Open Ralph Wiggum

Thanks for contributing to Open Ralph Wiggum. This guide covers local setup, testing, and release expectations.

## Development Setup

1. Fork and clone the repository.
2. Install Bun: https://bun.sh
3. Install dependencies:

```bash
bun install
```

4. Run baseline checks:

```bash
bun run test
bun test
bun run build
```

## Running the CLI Locally

Run in development mode from repository root:

```bash
bun run start -- "Your prompt here" --max-iterations 3
```

## Testing Workflow

Use targeted tests first, then broader checks:

```bash
# One file
bun test ./src/sdk/__tests__/tool-tracking.test.ts

# One test by name
bun test ./src/sdk/__tests__/tool-tracking.test.ts -t "tool_use event"

# Package script
bun run test

# Full discovered suite
bun test
```

## Build and Type Checks

```bash
bun run typecheck
bun run build
```

## Coding Conventions

- Language/runtime: TypeScript on Bun.
- Module style: ESM imports with double quotes.
- Formatting: 2-space indentation, semicolons at statement ends.
- Types: prefer explicit types/interfaces, avoid `any` unless unavoidable.

## Pull Request Checklist

Before opening a PR:

1. Keep changes scoped to the task.
2. Add or update tests when behavior changes.
3. Update docs for user-facing changes.
4. Ensure `bun run test`, `bun test`, and `bun run build` pass.
5. Keep `.ralph/` runtime artifacts out of commits.

## Release Process

Release steps are documented in `docs/release.md`.

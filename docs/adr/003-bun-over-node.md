# ADR 003: Use Bun Runtime

## Status

Accepted

## Context

Ralph is a TypeScript CLI with frequent local execution, testing, and build loops. Runtime options considered:

- Node.js
- Bun

The project favors fast startup, built-in TypeScript support, and a single runtime/tooling experience.

## Decision

Use Bun as the primary runtime and package manager.

## Consequences

- Positive:
  - Fast CLI startup and test execution.
  - Built-in TypeScript ergonomics.
  - Consistent toolchain (`bun install`, `bun test`, `bun run build`).
- Negative:
  - Smaller ecosystem and occasional compatibility differences versus Node.js.
  - Contributors must install Bun.

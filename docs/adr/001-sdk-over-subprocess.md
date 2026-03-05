# ADR 001: Use SDK Instead of Subprocess

## Status

Accepted

## Context

Ralph needed to integrate with OpenCode in a reliable and maintainable way. Two options were considered:

- Spawn the `opencode` CLI as a subprocess and parse output.
- Use `@opencode-ai/sdk` directly from TypeScript.

The project needed robust event handling, tighter type safety, and fewer cross-platform process concerns.

## Decision

Use the OpenCode SDK directly.

## Consequences

- Positive:
  - Better type safety and simpler integration in TypeScript.
  - Direct event stream access (`text`, `thinking`, `tool_use`, `tool_result`).
  - Fewer shell/process edge cases and easier cleanup lifecycle control.
- Negative:
  - Coupling to SDK APIs and release cadence.
  - Requires explicit dependency version management and compatibility checks.

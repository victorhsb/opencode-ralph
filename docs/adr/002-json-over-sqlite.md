# ADR 002: Use JSON for State Storage

## Status

Accepted (amended in Phase 11)

## Context

Ralph stores loop state, history, tasks, and supervisor metadata in `.ralph/`. The team considered:

- JSON files (current model)
- SQLite database

Current requirements prioritize debuggability, low setup friction, and simple portability for local CLI workflows.

Phase 11 re-evaluated this decision using current repository usage and state characteristics:

- `.ralph/` runtime data is typically small (current sample was under 300 KB).
- Existing workflows do not require SQL-style queries over state/history.
- JSON remains easier to inspect and recover during debugging.
- SQLite would add schema/migration/runtime complexity without clear user-facing value right now.

## Decision

Keep JSON files as the state storage mechanism and improve it incrementally.

Improvements adopted:

- Optional gzip compression for persisted state files (`state.compress`).
- Configurable history pruning to keep the latest N iterations (`state.maxHistory`).
- Preserve backward compatibility by transparently reading both plain JSON and gzip-compressed files.

## Consequences

- Positive:
  - Human-readable state for debugging and recovery.
  - No extra runtime/database dependency.
  - Straightforward file-based persistence compatible with existing behavior.
- Negative:
  - No rich query interface compared to SQL.
  - More care needed for file validation and corruption handling.
  - Potentially larger state files for long-running loops if pruning is disabled or set too high.

## Revisit Triggers

Reconsider SQLite if one or more of the following become true:

- State/history grows consistently beyond practical JSON debugging size.
- Product requirements need query-heavy analytics against historical runs.
- Multi-process or concurrent access to state becomes a hard requirement.

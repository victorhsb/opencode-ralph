# ADR 005: Structured Error Handling Strategy

## Status

Accepted

## Context

Earlier iterations used mixed error handling styles, which made failures inconsistent for users and harder to diagnose in tests/logs. Phase 04 introduced a structured error hierarchy and explicit codes.

The design goal was to preserve actionable CLI output while keeping rich details for debugging.

## Decision

Adopt a structured error model with:

- A shared base error type for domain errors.
- Stable error codes for programmatic handling.
- User-facing messages that are concise and actionable.
- Optional detailed context for logs and diagnostics.

## Consequences

- Positive:
  - Consistent error UX across commands.
  - Easier test assertions against known error codes.
  - Better separation between user messaging and developer diagnostics.
- Negative:
  - Requires discipline to map new failure paths into the hierarchy.
  - Slightly higher upfront implementation overhead for new features.

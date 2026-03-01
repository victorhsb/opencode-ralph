# ADR 004: Configuration File Design

## Status

Accepted

## Context

Users needed repeatable defaults without passing long flag lists on every run. Phase 05 introduced support for:

- Project JSON: `.ralphrc.json`
- Home JSON: `~/.ralphrc.json`
- Project TypeScript: `ralph.config.ts`

The design needed to balance simplicity, flexibility, and deterministic precedence.

## Decision

Support JSON and TypeScript config files with strict precedence:

1. CLI flags
2. Project config (`ralph.config.ts` and `.ralphrc.json`)
3. Home config (`~/.ralphrc.json`)
4. Built-in defaults

## Consequences

- Positive:
  - Common settings become reusable and versionable.
  - TypeScript config enables typed/programmable setup when needed.
  - Clear precedence avoids ambiguous runtime behavior.
- Negative:
  - More sources of configuration increase debugging surface area.
  - TypeScript config adds one extra execution path to validate.

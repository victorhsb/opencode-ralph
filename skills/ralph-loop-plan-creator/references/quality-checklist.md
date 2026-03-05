# Planning Pack Quality Checklist

Pass every item before final handoff.

## Structure

- A master plan exists at the agreed path.
- Every phase has one `phase-NN-plan.md` file.
- Phase numbering is contiguous and unambiguous.
- One phase maps to one Ralph task.

## Dependency and Scope Hygiene

- Phase order follows dependency reality.
- No phase depends on future-phase work.
- Each phase has explicit in-scope and out-of-scope boundaries.
- Cross-phase contracts are documented.

## Context Control

- Each phase lists required files/docs to load first.
- Optional resources are clearly marked optional.
- Unnecessary repository-wide context is excluded.
- Every phase file is focused on one primary outcome.
- Phase plans do NOT duplicate Ralph's built-in instructions (output format, completion rules, iteration tracking).

## Verifiability

- Every phase has concrete verification commands.
- Expected results are stated.
- Completion tag for each phase is explicit.
- Final completion criteria across all phases is explicit.

## Ralph Task Sync

- `.ralph/` exists and is initialized when needed.
- Task list mirrors master plan ordering.
- Task descriptions reference phase files directly.
- Task list is re-verified after modifications.

## Handoff Completeness

- Plan file paths are listed.
- Assumptions and risks are listed.
- Immediate next command(s) for the user are provided.

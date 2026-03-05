# Phase Plan Template

Use this as `plans/phase-NN-plan.md`.

## 0) Metadata

- Phase number and name:
- Task label:
- Depends on phase(s):
- Planned completion tag (`READY_FOR_NEXT_TASK` or `COMPLETE`):
- Estimated iteration budget:

## 1) Objective

- Primary outcome for this phase:
- Why this phase now:

## 2) Scope

- In scope for this phase:
- Out of scope for this phase:

## 3) Required Context to Load First

List only what is necessary for this phase.

### Required Files and Docs

- `path/to/file-a`
- `path/to/file-b`

### Optional Deep-Dive Resources

- `path/to/optional-reference`

## 4) Constraints and Contracts

- Public interfaces that must remain stable:
- Data contracts that must remain stable:
- Performance, security, or compliance constraints:

## 5) Implementation Plan

1. Step 1 with concrete file targets.
2. Step 2 with concrete checkpoints.
3. Step 3 with concrete checkpoints.

## 6) Verification

List what Ralph should verify for this phase. Ralph manages verification execution via its built-in verification system.

- What to verify (command Ralph should run):
- Expected result:
- How to interpret failures:

## 7) Handoff to Next Phase

- Artifacts produced:
- What changed that next phase must know:
- New risks or assumptions:
- Master plan updates required:

## 8) Completion Signal

**NOTE**: Ralph handles completion signaling automatically. This section is for reference only:
- Ralph expects `completed: true` in JSON response when phase work is genuinely done
- Ralph manages iteration bounds and task progression
- Promise tags are optional (Ralph uses JSON `completed` field primarily)

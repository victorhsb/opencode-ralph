# Master Plan Template

Use this as `plans/master-plan.md`.

## 1) Objective

- Problem to solve:
- Target outcome:
- MVP boundary:
- Success criteria:

## 2) Scope

- In scope:
- Out of scope:

## 3) Constraints and Assumptions

- Tech stack constraints:
- Platform or compliance constraints:
- Time or delivery constraints:
- Assumptions that phase plans rely on:

## 4) Phase Map

Keep one row per phase and one phase per task.

| Phase | Plan file | Primary outcome | Depends on | Verification gate | Completion tag |
| --- | --- | --- | --- | --- | --- |
| 01 | plans/phase-01-plan.md |  |  |  | READY_FOR_NEXT_TASK |
| 02 | plans/phase-02-plan.md |  |  |  | READY_FOR_NEXT_TASK |

## 5) Cross-Phase Contracts

- Data model contracts to preserve:
- API and interface contracts to preserve:
- Migration and backward compatibility expectations:

## 6) Global Verification Strategy

- Per-phase minimum checks:
- End-to-end checks before final completion:
- Build and test commands used across phases:

## 7) Ralph Task Synchronization Plan

- Task source of truth (`ralph task` commands or direct `.ralph/ralph-tasks.md` edits):
- Task naming convention:
- Ordering rule:
- Re-sync procedure when phases change:

## 8) Risk Register

| Risk | Trigger | Impact | Mitigation | Owner phase |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 9) Phase Exit and Final Exit Criteria

- Phase exit criteria rule:
- Final completion criteria rule:
- Promise tags in use (`READY_FOR_NEXT_TASK`, `COMPLETE`, or custom):

## 10) Decision Log

- Key decisions and rationale:
- Deferred items moved out of MVP:

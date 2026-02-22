# Task Sync With ralph-cli-manager

Use this workflow to keep phase plans and Ralph task state aligned.

## Safety Rule

- Manage task state only.
- Do not run `ralph "..."` loop commands from this workflow.

## 1) Ensure Ralph State Exists

If `.ralph/` is missing, initialize it:

```bash
ralph init
```

## 2) Add One Task Per Phase

Use a task format that references phase file and completion tag.

```bash
ralph task add "Phase 01: Execute plans/phase-01-plan.md and emit READY_FOR_NEXT_TASK"
ralph task add "Phase 02: Execute plans/phase-02-plan.md and emit READY_FOR_NEXT_TASK"
ralph task add "Phase 03: Execute plans/phase-03-plan.md and emit COMPLETE"
```

## 3) Verify Ordering

```bash
ralph task list
```

Confirm task order exactly matches `plans/master-plan.md`.

## 4) Re-Sync After Plan Changes

When phase count, ordering, or phase names change:

1. Remove outdated tasks with `ralph task remove <index>`.
2. Add updated tasks.
3. Re-run `ralph task list`.

Use direct `.ralph/ralph-tasks.md` edits only when bulk edits are simpler and less error-prone.

## 5) Keep Task Text Actionable

Each task should include:

- phase number
- plan file path
- expected completion tag
- phase-specific verification intent (when useful)

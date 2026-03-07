# Task Sync With ralph-cli-manager

Use this workflow to keep phase plans and Ralph task state aligned.

## ⚠️ PREREQUISITE: Load ralph-cli-manager Skill FIRST

**Before executing ANY commands in this reference, invoke the ralph-cli-manager skill.**

This reference provides planning-specific sync patterns, but the ralph-cli-manager skill contains:
- Critical safety rules (what commands are safe vs. forbidden)
- Complete command reference
- Best practices for Ralph CLI operations

**Do NOT proceed with CLI operations until you have loaded ralph-cli-manager.**

**Why this matters:** The ralph-cli-manager skill has strict safety rules about which commands can be executed. Attempting to run commands without loading that skill first may result in executing forbidden commands that launch Ralph loops.

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

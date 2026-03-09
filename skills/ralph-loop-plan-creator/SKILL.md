---
name: ralph-loop-plan-creator
description: "Create planning-mode artifacts for Ralph loops implementing complex features or MVPs. Creates master plans and phase-specific plans that minimize context per iteration. Use when breaking work into dependency-ordered phases with clear verification gates."
---

# Ralph Loop Plan Creator

## Overview

Create a planning pack that lets Ralph execute complex work with minimal context per iteration.
Produce one task-scoped phase plan per task and one master plan that controls phase order, dependencies, and verification.

## ⚠️ CRITICAL: Use ralph-cli-manager for CLI Operations

This skill creates planning artifacts but **must delegate ALL Ralph CLI operations to the ralph-cli-manager skill**.

**When you need to:** initialize Ralph, add/remove/list tasks, edit `.ralph/ralph-tasks.md`, check status, or any other Ralph CLI interaction.

**Load the ralph-cli-manager skill first.** It provides critical safety guidelines and proper command patterns.

**Your role in this skill:**
- ✅ Create planning files (`plans/*.md`)
- ✅ Define phase structure and dependencies
- ✅ Specify what tasks need to be synced
- ❌ NEVER execute Ralph CLI commands directly without ralph-cli-manager guidance

### What Ralph Already Handles (Don't Redefine)

Ralph manages iteration mechanics automatically. Do NOT include these in phase plans:
- Output format (`completed`, `reasoning`, `output` JSON fields)
- Completion signaling (when to set `completed: true`, promise tags)
- Iteration tracking (current iteration, bounds, progress)
- Task mode behavior ("work on one task at a time", task progression)
- Critical rules ("don't lie about completion", "check work first")

Phase plans focus ONLY on domain-specific work: what to build, files to modify, and phase-specific verification.

## Required Outputs

Create these files unless the repository already has an equivalent convention:
- `plans/master-plan.md`
- `plans/phase-01-plan.md` through `plans/phase-NN-plan.md` (one file per phase; one phase = one Ralph task)
- Optional supporting docs in `plans/references/` only when needed

Ensure every phase file can run mostly independently and only includes context needed for that phase.

## Workflow

1. Define planning boundaries.
2. Decompose work into phases.
3. Write the master plan.
4. Write each phase plan.
5. Sync phase files into Ralph tasks through ralph-cli-manager.
6. Run the quality gate and deliver a clear handoff.

### 1) Define Planning Boundaries

Capture:
- target outcome (feature, MVP slice, or release goal)
- explicit in-scope and out-of-scope items
- technical constraints (stack, architecture, deadlines, policy constraints)
- verification baseline (tests, build, smoke checks, manual QA)

If requirements are vague, derive reasonable defaults from repo conventions and make assumptions explicit in `plans/master-plan.md`.

### 2) Decompose Work Into Phases

Order phases to fail fast:
1. architecture and scaffolding
2. high-risk integrations or migrations
3. risky unknowns or spikes with acceptance criteria
4. core features
5. hardening, observability, and polish

Apply these decomposition rules:
- keep one primary outcome per phase
- keep one phase aligned to one Ralph task
- keep dependencies explicit and minimal
- keep each phase verifiable with concrete commands
- avoid cross-phase hidden coupling

### 3) Write the Master Plan

Use `references/master-plan-template.md`.
The master plan is the control plane and should:
- define the complete phase map and dependency graph
- map each phase to its plan file
- define global constraints and cross-phase risks
- define global verification strategy and exit criteria
- show task synchronization strategy for `.ralph/ralph-tasks.md`

### 4) Write Each Phase Plan

Use `references/phase-plan-template.md`.

For each `phase-NN-plan.md`, include:
- objective, scope, and non-goals for that phase only
- exact files, modules, and docs to read first
- interfaces and contracts that must be preserved
- implementation sequence with checkpoints
- verification commands and expected results (Ralph runs these; phase plan lists what to verify)
- handoff notes that feed the next phase

Keep context tight:
- include only resources required for that phase
- mark optional deep-dive resources separately
- avoid broad project history unless required for correctness
- rely on Ralph's built-in iteration handling for completion signaling and output format

### 5) Sync Plans Into Ralph Tasks via ralph-cli-manager

**CRITICAL: Before any Ralph CLI operations, invoke the ralph-cli-manager skill.**

This skill creates planning artifacts but must NOT execute Ralph commands directly. The ralph-cli-manager skill provides:
- Safety rules (what commands are safe vs. forbidden)
- Proper command patterns for task management
- Best practices for Ralph CLI operations

**Workflow:**
1. Load ralph-cli-manager skill first
2. Follow its guidance for all CLI operations
3. Use this skill's `references/task-sync-with-ralph-cli-manager.md` for sync patterns

Minimum standards:
- ensure `.ralph/` exists (`ralph init` if missing)
- create one task per phase file
- keep task text explicit: phase number, plan file path, and expected completion tag
- re-list tasks and verify ordering after edits

Never run Ralph loops from this skill. Manage planning artifacts and task state only.

### 6) Run Quality Gate Before Handoff

Use `references/quality-checklist.md`.
Do not finalize until the planning pack is:
- phase-complete (no missing dependencies)
- execution-ready (commands and file paths are concrete)
- context-minimized (no bloated phase files)
- task-synced (Ralph task list matches phase files)

## Deliverable Format

Return:
1. created or updated plan file paths
2. phase map in one short list
3. task-state actions needed (will require ralph-cli-manager skill for execution)
4. known risks and assumptions
5. immediate next steps:
   - If CLI operations needed: "Invoke ralph-cli-manager skill to execute task synchronization"
   - If user wants to run Ralph: "Use ralph-cli-manager skill to craft proper Ralph prompts"

## References

**For CLI Operations:** Before using any Ralph CLI commands, invoke the `ralph-cli-manager` skill for comprehensive guidance on safe operations and best practices.

- Master plan scaffold: `references/master-plan-template.md`
- Phase plan scaffold: `references/phase-plan-template.md`
- Ralph task sync guide: `references/task-sync-with-ralph-cli-manager.md` (read AFTER loading ralph-cli-manager skill)
- Final quality gate: `references/quality-checklist.md`

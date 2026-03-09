# ARD: ralph-loop-plan-creator v2 — Methodology Alignment

**Status:** Proposed
**Date:** 2026-03-09
**Author:** Skill evaluation via skill-creator
**Related eval:** `skill-creator-workspace/ralph-loop-plan-creator/iteration-1/`

---

## 1. Context

The `ralph-loop-plan-creator` skill was created to help Claude produce planning artifacts for Ralph loop projects — master plans and phase-specific plans that keep context tight per iteration. A benchmark against the canonical Ralph Wiggum deep-dive (`ralph-wiggum-deep-dive.md`) reveals the skill achieves a **58.3% pass rate** on deep-dive-aligned assertions, versus **17.7%** for a no-skill baseline. The skill clearly adds value: it instills verification gate discipline, phase ordering, context minimization, and cross-phase contract documentation.

However, three foundational concepts from the deep-dive are **completely absent** from every template in the skill, causing a systematic gap that no amount of re-running the skill will close:

1. `specs/` as the source of truth for requirements
2. `AGENTS.md` as self-maintained operational memory
3. The distinction between planning mode and building mode, and the treatment of the implementation plan as **disposable coordination state**

A fourth gap — Ralph-specific anti-patterns — passes only 1/3 of the time and only when Claude independently recalls it, not because the skill reinforces it.

This ARD proposes a restructure of the skill to close these gaps without compromising the things that already work well.

---

## 2. Problem Statement

### What the skill gets right (preserve these)

| Behavior | Pass Rate (with_skill) | Pass Rate (without_skill) |
|---|---|---|
| Concrete verification commands per phase | 100% | 0% |
| Context minimization — Required Context sections | 100% | 0% |
| Fail-fast phase ordering rationale | 100% | 0% |
| Cross-phase contracts and scope boundaries | 100% | 0% |
| Machine-verifiable acceptance criteria | 100% | 33% |

These behaviors are correctly taught by the current templates and must be preserved.

### What the skill is missing (fix these)

| Gap | Pass Rate (with_skill) | Root Cause |
|---|---|---|
| `specs/` as source of truth | 0% | Never mentioned in any template |
| `AGENTS.md` as operational memory | 0% | Completely absent from skill |
| Planning mode vs. building mode distinction | 0% | Skill jumps to plan production without framing |
| Implementation plan as disposable state | 0% | Templates treat plans as fixed artifacts |
| Anti-pattern coverage | 33% | Only appears when Claude independently recalls it |

### The core misalignment

The deep-dive defines a 3-layer information hierarchy:

```
specs/*.md          ← source of truth (what to build)
IMPLEMENTATION_PLAN.md  ← coordination state (what to do next, disposable)
AGENTS.md           ← operational memory (how the codebase works)
```

The current skill only addresses the middle layer, and even there, treats it as a permanent artifact rather than disposable state. This means plans produced by the skill can diverge from specs when requirements change — because the spec layer doesn't exist in the skill's mental model at all.

---

## 3. Decision

Restructure the skill in three areas:

### A. Add a "Methodology Foundations" section to SKILL.md

Insert a short section before the workflow that explains the 3-layer hierarchy. The goal is not to make Claude write a methodology lecture — it's to give Claude the right mental model so that every subsequent decision (where to put requirements, when to regenerate a plan, when to update AGENTS.md) flows naturally from understanding the whole system.

This section explains:
- `specs/` is the source of truth. Before writing any plan, check whether specs exist and create them if not.
- The implementation plan (master + phases) is coordination state — regenerate freely when stale.
- `AGENTS.md` is operational memory the agent maintains across iterations — the plan should reference what's already there.

### B. Update the phase plan template to connect to specs and AGENTS.md

The phase plan template currently opens with metadata and an objective. We add two fields:

- **Specs Satisfied** — which `specs/*.md` files this phase addresses. This makes the spec-plan linkage explicit and traceable.
- **AGENTS.md Context** — what relevant operational learnings from prior iterations apply to this phase. Forces Claude to check before planning blind.

### C. Add a `references/methodology.md` reference file

Move the deeper concepts (planning mode vs. building mode, disposable plans, stuck-spec handling, anti-patterns, context window budget, git as long-term memory) into a dedicated reference file. Keep the SKILL.md body lean — reference this file in the workflow where it matters.

This avoids bloating the main skill file while making the content available for phases that need it (e.g., "if you detect stale plan signals, read `references/methodology.md` for regeneration triggers").

### D. Embed anti-patterns in the workflow, not as a reference

The anti-pattern guidance (placeholder implementations, assumption of non-implementation, overcooking) should appear inline in the workflow steps that are most likely to trigger them, not as an appendix. Specifically:
- During "Define Planning Boundaries" — warn against vague specs that produce vague phases.
- During "Write Each Phase Plan" — warn against placeholder implementations and assumption of non-implementation.
- During "Run Quality Gate" — add anti-pattern checks to the quality checklist.

---

## 4. Proposed Skill Architecture

### File structure (v2)

```
ralph-loop-plan-creator/
├── SKILL.md                              ← revised (adds §0 Foundations, updates workflow)
└── references/
    ├── master-plan-template.md           ← minor: add AGENTS.md context field
    ├── phase-plan-template.md            ← add Specs Satisfied + AGENTS.md fields
    ├── quality-checklist.md              ← add anti-pattern checks
    ├── task-sync-with-ralph-cli-manager.md   ← unchanged
    └── methodology.md                    ← NEW: deep-dive concepts reference
```

### SKILL.md structure (v2)

```
## §0  Methodology Foundations   ← NEW
  - The 3-layer hierarchy (specs / plan / AGENTS.md)
  - When to create specs first vs. jump to planning
  - Plan regeneration philosophy

## §1  ⚠️ CRITICAL: Use ralph-cli-manager  ← unchanged
## §2  What Ralph Already Handles          ← unchanged
## §3  Required Outputs                    ← minor update (add specs/ as prerequisite)
## §4  Workflow
  1. Define Planning Boundaries  ← + spec audit step
  2. Decompose Work Into Phases  ← unchanged
  3. Write the Master Plan       ← minor update
  4. Write Each Phase Plan       ← + Specs Satisfied + AGENTS.md fields
  5. Sync via ralph-cli-manager  ← unchanged
  6. Quality Gate                ← + anti-pattern checks

## §5  Deliverable Format         ← unchanged
## §6  References                 ← add methodology.md
```

### `methodology.md` reference file — content outline

- **3-phase architecture** — planning mode (gap analysis → plan), building mode (execute → verify → commit)
- **Plan disposability** — the 5 regeneration triggers (wrong direction, stale, clutter, spec change, confusion)
- **Scoped plans per branch** — deterministic branch-level focus vs. probabilistic runtime filtering
- **Stuck-spec handling** — after 10 failed iterations, split the spec
- **Anti-patterns in full** — overcooking, undercooking, placeholders, assumption of non-implementation, vague specs
- **Context window budget** — 40–60% utilization as the "smart zone"
- **Git as long-term memory** — inspecting `git log` for previous attempt paths

---

## 5. Alternatives Considered

### Alt A: Keep SKILL.md unchanged, add methodology only to references

**Rejected.** The eval shows that reference files don't help if Claude doesn't know to read them. The 3-layer hierarchy needs to be in the main body — it's foundational enough that every planning session needs this framing, not just advanced cases.

### Alt B: Merge all methodology content inline into SKILL.md

**Rejected.** This would push SKILL.md well past 500 lines and risk context bloat. The methodology concepts (stuck-spec handling, context window budget, git as memory) are valuable but not needed for every planning session. A lean main body with a pointer to a reference file is the right Progressive Disclosure pattern per the skill-creator guide.

### Alt C: Add a separate `specs-creator` workflow as a pre-step

**Considered.** The deep-dive describes Phase 1 as a dedicated human-LLM conversation to create specs. A skill that explicitly creates `specs/*.md` files before planning would be more faithful to the methodology. However, this would change the skill's scope significantly and potentially the skill's triggering context. Better to note in the foundations section that specs *should* exist before planning, and let the planner check for them without becoming a full spec-creation workflow.

### Alt D: Rewrite the template to lead with specs/, eliminate plans/ entirely

**Considered.** The deep-dive uses a single `IMPLEMENTATION_PLAN.md`, not a `plans/` directory with multiple phase files. The skill's multi-file structure (`plans/master-plan.md`, `plans/phase-NN-plan.md`) is an architectural choice that provides cleaner per-phase context isolation. This is a reasonable improvement on the canonical methodology — the key is to ensure spec linkage exists, not to abandon the multi-file structure which demonstrably helps context minimization.

---

## 6. Trade-off Analysis

| Trade-off | Decision |
|---|---|
| **Methodology completeness vs. skill file size** | Use Progressive Disclosure — foundations inline, deep concepts in `references/methodology.md`. Keeps SKILL.md under 250 lines while making full methodology accessible. |
| **Spec creation vs. spec assumption** | The skill assumes specs may or may not exist. Workflow Step 1 audits for them and advises creating them if missing, but doesn't block planning if they don't exist yet. Real-world teams often iterate spec and plan together. |
| **Template strictness vs. flexibility** | New template fields (Specs Satisfied, AGENTS.md Context) are prompted, not required. If no specs exist yet, Claude fills them in as "TBD — create in specs/ before starting the loop." |
| **Anti-pattern warnings vs. prompt verbosity** | Inline warnings at the specific workflow step where each anti-pattern is most likely to surface, rather than a generic checklist. This is less visually prominent but more contextually targeted. |

---

## 7. Expected Impact

Based on the assertion analysis, these changes should affect pass rates as follows:

| Assertion | Current Pass Rate | Expected v2 Pass Rate | Mechanism |
|---|---|---|---|
| specs/ as source of truth | 0% | ~80% | Direct instruction in §0 + template field |
| AGENTS.md as operational memory | 0% | ~80% | Direct instruction in §0 + template field |
| Planning vs. building mode | 0% | ~70% | §0 Foundations explains the 3-phase architecture |
| Plan as disposable state | 0% | ~70% | §0 + `references/methodology.md` regeneration triggers |
| Anti-patterns addressed | 33% | ~85% | Inline at the step where each is most relevant |
| Verification gates (already passing) | 100% | ~100% | Preserved unchanged |
| Context minimization (already passing) | 100% | ~100% | Preserved unchanged |

**Projected overall pass rate: ~85%** (vs. current 58.3%)

The efficiency gains (−21K tokens, −36s vs baseline) should be preserved since the structural templates that drive them are unchanged.

---

## 8. Implementation Plan

### Phase 1 — Core skill revisions (SKILL.md + templates)

1. Add `§0 Methodology Foundations` to SKILL.md (~40 lines)
2. Update `references/phase-plan-template.md` — add `Specs Satisfied` and `AGENTS.md Context` fields
3. Update `references/master-plan-template.md` — add AGENTS.md context field and plan-health note
4. Update `references/quality-checklist.md` — add 3 anti-pattern checks

### Phase 2 — New reference file

5. Write `references/methodology.md` (~120 lines) with all deep-dive concepts

### Phase 3 — Validation

6. Re-run the 3 eval test cases using the updated skill
7. Compare pass rates against current benchmark
8. Iterate if any critical assertions still fail

### Non-goals for this change

- Changing the skill's `description` / triggering criteria (separate optimization step)
- Creating a separate `specs-creator` skill
- Modifying how ralph-cli-manager interacts with this skill
- Changing the `plans/` multi-file structure

---

## 9. Open Questions

1. **Should `specs/*.md` creation be a prerequisite gate?** Currently proposed as advisory ("audit and advise"). If most users come to this skill without any specs, a harder gate would educate but could frustrate.

2. **Should `AGENTS.md` updates be included in the Deliverable Format?** The skill currently lists "task-state actions needed" as a deliverable. Adding "AGENTS.md entries to add" would make the connection more explicit, but may feel prescriptive if nothing relevant has changed.

3. **Does the multi-file `plans/` structure need a migration note for teams already using v1?** The template changes are additive (new optional fields). Existing plan files won't break, but teams should know new plans will have different fields.

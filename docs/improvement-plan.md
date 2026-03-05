# Improvement Plan

This document tracks potential improvements to Open Ralph Wiggum, organized by priority and category. The codebase is already well-structured with good separation of concerns and clear documentation—these suggestions focus on maintainability, robustness, and production-readiness.

## Deferred From Report-Driven MVP Reliability Plan (Explicitly Out of Scope for First Execution)

This section captures items we intentionally postponed while scoping the first implementation wave around **MVP reliability**, with **verification/backpressure** as the primary theme.

These are not dropped. They are deferred so the first iteration can focus on native verification gating, completion rejection on failed checks, and better verification observability with minimal architectural churn.

### Out of Scope for MVP Reliability (Do Later)

#### 1. Full Supervisor Decision Engine / Policy-Based Orchestration

**Deferred because:** MVP focuses on backpressure and completion correctness, not redesigning the supervisor contract.

**Not in first implementation:**
- Structured supervisor decisions like `CONTINUE | STOP_SUCCESS | STOP_FAILED | ESCALATE | ROLLBACK`
- Hard-gate supervisor mode that can block completion directly
- Risk scoring / policy evaluation (security, scope drift, contract changes)
- Automated rollback decisions and rollback orchestration

**Current approach preserved for MVP:** Supervisor remains suggestion-based (`add_task` / `add_context`) with user approval.

#### 2. Token/Cost/Time Budgeting and Budget-Aware Stop Policies

**Deferred because:** Requires broader telemetry and policy design than MVP verification gating.

**Not in first implementation:**
- Token budget tracking per iteration / per run
- Cost estimation and accumulated spend reporting
- Time budget stop conditions (e.g. stop after total runtime threshold)
- Budget-aware strategy changes (e.g. pause, degrade model, or force summary/replan)

#### 3. Config-File Based Verification / Policy Definition

**Deferred because:** We chose **CLI flags first** for faster adoption and lower implementation risk.

**Not in first implementation:**
- `.ralph/config.json` / `.ralphrc.json` / `ralph.config.ts` as the primary source for verification rules
- Merge/precedence logic between CLI, project config, and user config for verification policies
- Named reusable verification profiles

**MVP choice:** verification/backpressure is configured via CLI flags only.

#### 4. Automatic Checkpoint / Rollback / Recovery Workflow

**Deferred because:** This introduces destructive operations, checkpoint policy, and UX decisions that are not required for first-pass verification reliability.

**Not in first implementation:**
- Built-in checkpoint creation strategy (tags/commits/snapshots)
- Automatic rollback on verification regressions
- Replan-after-rollback workflow
- Recovery policy engine (e.g. rollback after N failed attempts)

#### 5. Supervisor Architecture Expansion (Planner/Builder/Supervisor Triad)

**Deferred because:** It is a larger orchestration redesign that should happen after verification gates stabilize loop behavior.

**Not in first implementation:**
- Dedicated planner agent with explicit 3-7 task planning cycles
- Separate builder/supervisor roles with formal machine-readable contracts
- Multi-validator supervisor pipeline (quality/security/perf/license validators)
- HITL escalation framework driven by structured supervisor output

#### 6. Advanced Verification Policy Features (Post-MVP)

**Deferred because:** The first wave only needs baseline command execution and completion gating.

**Not in first implementation:**
- Named verification steps (`--verify-step <name>::<cmd>`)
- Required vs optional verification steps
- Trigger granularity beyond `on-claim` / `every-iteration`
- Failure streak policies (pause/fail after repeated verification failures)
- Rich per-step verbosity controls / log export

#### 7. Configurable Budget + Safety Policy Engine

**Deferred because:** Policy engines need a stable verification substrate first.

**Not in first implementation:**
- Unified policy config for verification, budgets, supervisor, and escalation
- Risk thresholds and enforcement modes
- Centralized policy evaluation component reused across loop/supervisor

#### 8. Broader CLI Redesign / Breaking UX Cleanup

**Deferred because:** Although breaking changes were allowed, MVP reliability should land with minimal operator disruption.

**Not in first implementation:**
- Reworking command/subcommand layout
- Renaming/removing existing flags as part of a broader CLI cleanup
- Large migration of prompt/supervisor CLI surface

**MVP choice:** add reliability capabilities as opt-in flags, keep current commands working.

### Follow-Up Backlog (Recommended Order After MVP)

1. **Phase 2: Stronger Backpressure Policies**
   Add named verification steps, optional/required checks, failure streak policies, and more precise triggers.

2. **Phase 3: Supervisor Upgrade**
   Expand supervisor output schema beyond suggestions into structured decisions and add risk-based pause/escalation.

3. **Phase 4: Config + Budgets**
   Introduce persistent config for verification/policies and add cost/time/token budget enforcement.

### Scope Decisions Captured (For Future Reference)

- **Primary theme for first wave:** Backpressure & verification
- **Execution scope:** MVP reliability (not ambitious orchestrator redesign)
- **Verification config source (v1):** CLI flags first
- **Default behavior on false completion claim:** Reject completion and continue loop
- **Compatibility stance for MVP:** Preserve existing behavior unless verification is enabled

## High Priority

### 1. Dependency Version Pinning / Update Policy

**Status:** Completed ✅  
**Impact:** High - Prevents runtime bugs  
**Effort:** Low

Implemented comprehensive TypeScript strict mode configuration. Fixed 316 type errors across 25 source and test files.

**Action Items:**
- [x] Create `tsconfig.json` with `strict: true`
- [x] Enable `noUncheckedIndexedAccess` to catch potential undefined accesses
- [x] Enable `exactOptionalPropertyTypes` for stricter optional property handling
- [x] Add `noImplicitReturns` and `noFallthroughCasesInSwitch`
- [x] Fix any type errors that emerge after enabling strict mode

**Additional strict options enabled:**
- `noImplicitOverride`: true
- `noPropertyAccessFromIndexSignature`: true

**Commit:** 1d74834

**Proposed tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": ".",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2022"]
  },
  "include": ["src/**/*", "ralph.ts", "tests/**/*"],
  "exclude": ["node_modules", "dist", "bin"]
}
```

---

### 2. Dependency Version Pinning

**Status:** Not started  
**Impact:** Medium - Prevents unexpected breakages  
**Effort:** Low

**Current State:**
```json
"@opencode-ai/sdk": "^1.2.10"
```

The original `^0.x` concern is no longer applicable because the project is now on the stable `1.x` SDK line. The remaining work is about dependency update policy and compatibility documentation.

**Action Items:**
- [ ] Decide dependency policy for the SDK (`^1.x` range vs exact pin)
- [ ] Add Dependabot or Renovate configuration for automated update PRs
- [ ] Document the SDK version compatibility in README

---

### 2. State File Validation

**Status:** Partial (baseline done; versioned migrations remain)  
**Impact:** High - Prevents crashes from corrupted state  
**Effort:** Medium

Baseline state/history validation, corrupted-file backup, and defaulting migrations are implemented. Remaining work is formalizing future schema-version migration behavior.

**Action Items:**
- [ ] Expand migration strategy for future schema versions (versioned migrations)

**Example schema:**
```typescript
import { z } from "zod";

const StateSchema = z.object({
  active: z.boolean(),
  iteration: z.number().int().positive(),
  minIterations: z.number().int().nonnegative(),
  maxIterations: z.number().int().nonnegative(),
  // ... etc
});
```

---

## Medium Priority

### 3. Testing Strategy Expansion

**Status:** Partial (broad unit coverage exists; loop/error-path gaps remain)  
**Impact:** High - Confidence for refactoring  
**Effort:** High

**Current State:**
- One integration test file (`tests/ralph.test.ts`)
- Multiple focused unit test suites exist across `src/**/__tests__/` (SDK, state, tasks, prompts, fs-tracker, config, io, utils, CLI init)
- Integration-style CLI tests use a fake SDK path for deterministic coverage

**Action Items:**
- [ ] Add direct tests for CLI argument parsing/validation edge cases beyond current command coverage
- [ ] Add focused tests for loop orchestration and retry/error recovery paths
- [ ] Test coverage reporting (add coverage threshold)
- [ ] Property-based testing for parsers

**Gaps to fill:**
- CLI argument parsing/validation edge cases are only partially covered
- Limited direct tests for loop orchestration logic
- Limited tests for error recovery paths / timeout behavior

---

### 4. Structured Error Handling

**Status:** Not started  
**Impact:** Medium - Better UX and debugging  
**Effort:** Medium

Currently uses mixed error handling—some thrown errors, some console.error, some graceful degradation.

**Action Items:**
- [ ] Create error hierarchy in `src/errors/index.ts`
- [ ] Replace console.error in library code with thrown errors
- [ ] Add error codes for programmatic handling
- [ ] Create user-friendly error message mapper

**Proposed structure:**
```typescript
export class RalphError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "RalphError";
  }
}

export class SdkInitError extends RalphError {
  constructor(message: string) {
    super(message, "SDK_INIT_FAILED");
  }
}

export class ValidationError extends RalphError {
  constructor(message: string) {
    super(message, "VALIDATION_FAILED");
  }
}

export class StateCorruptedError extends RalphError {
  constructor(message: string) {
    super(message, "STATE_CORRUPTED");
  }
}
```

---

### 5. Configuration File Support

**Status:** Not started  
**Impact:** Medium - Improved UX for regular users  
**Effort:** Low

Currently all configuration is via CLI arguments. Users would benefit from persistent defaults.

**Action Items:**
- [ ] Support `.ralphrc.json` in project root
- [ ] Support `.ralphrc.json` in home directory
- [ ] Support `ralph.config.ts` for typed configuration
- [ ] Configuration precedence: CLI args > project config > home config > defaults

**Example config:**
```json
{
  "model": "anthropic/claude-sonnet-4",
  "maxIterations": 20,
  "completionPromise": "DONE",
  "supervisor": {
    "enabled": true,
    "memoryLimit": 50
  },
  "permissions": {
    "autoApprove": true
  }
}
```

---

## Lower Priority

### 6. Logging Infrastructure

**Status:** Not started  
**Impact:** Medium - Better debugging  
**Effort:** Medium

Currently uses direct `console.log`/`console.error` calls throughout.

**Action Items:**
- [ ] Create minimal logger abstraction in `src/logger/`
- [ ] Support log levels: DEBUG, INFO, WARN, ERROR
- [ ] Add structured logging option (JSON output)
- [ ] Add timestamps and correlation IDs
- [ ] Support log file output (`--log-file` flag)
- [ ] Ensure all existing console calls use new logger

**Example usage:**
```typescript
import { logger } from "./logger";

logger.info("Starting iteration", { iteration: state.iteration });
logger.debug("Prompt built", { promptLength: fullPrompt.length });
logger.warn("No file changes detected", { iteration: state.iteration });
```

---

### 7. Performance Monitoring

**Status:** Partial (basic duration tracking)  
**Impact:** Low - Operational insight  
**Effort:** Medium

**Action Items:**
- [ ] Track token usage per iteration (if SDK exposes it)
- [ ] Monitor memory usage over long runs
- [ ] Add cost estimation per iteration
- [ ] Identify bottlenecks (waiting vs executing time)
- [ ] Export metrics in Prometheus format (optional)

---

### 8. State Management Improvements

**Status:** Not started  
**Impact:** Low - Better long-term reliability  
**Effort:** High

Currently uses JSON files in `.ralph/` for state.

**Options to consider:**
- [ ] **SQLite** instead of JSON for structured querying
- [ ] **Schema migrations** for state format evolution
- [ ] **Compression** for long-running loops with many iterations
- [ ] **State pruning** to limit history size

**Decision needed:** Is the complexity worth it? JSON is simple and debuggable.

---

### 9. Code Organization Refinements

**Status:** Not started  
**Impact:** Low - Maintainability  
**Effort:** Medium

**Issues identified:**
- `loop.ts` is ~600 lines
- `ralph.ts` is already minimal, but `src/cli/program.ts` still centralizes many options and validations
- Some CLI validation logic uses `console.error + process.exit` hooks that may be worth isolating for testability

**Action Items:**
- [ ] Extract main loop body into smaller focused functions
- [ ] Consider extracting CLI option validation into reusable/testable helpers
- [ ] Consider early returns to reduce nesting

**Example command pattern:**
```typescript
const commands = new Map([
  ["--status", handleStatusCommand],
  ["--list-suggestions", handleListSuggestionsCommand],
  ["--approve-suggestion", handleApproveSuggestionCommand],
  // ...
]);
```

---

### 10. Documentation Improvements

**Status:** Partial (good README)  
**Impact:** Low - Developer experience  
**Effort:** Low

**Action Items:**
- [ ] Create `docs/adr/` directory with Architecture Decision Records
  - Why SDK over subprocess?
  - Why JSON over SQLite?
  - Why Bun over Node?
- [ ] Generate API docs from TypeScript using TypeDoc
- [ ] Add CONTRIBUTING.md with development setup
- [ ] Document release process

---

### 11. CI/CD Pipeline

**Status:** Partial (GitHub Actions workflow exists for bot)  
**Impact:** High - Quality assurance  
**Effort:** Low

**Current state:** Has `.github/workflows/opencode.yml` for the bot integration.

**Action Items:**
- [ ] Create `.github/workflows/ci.yml` for PR testing
- [ ] Run tests on multiple platforms (Ubuntu, macOS)
- [ ] Add a dedicated typecheck script and CI step (tsconfig.json now exists)
- [ ] Add build verification
- [ ] Add linting step if linter is adopted
- [ ] Protect main branch with required checks

**Proposed workflow:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run typecheck
      - run: bun run test
      - run: bun run build
```

---

## Completed

### 1. TypeScript Configuration & Strictness (2026-02-28)
- Implemented strict tsconfig.json with 7 strict mode options
- Fixed 316 type errors across 25 files
- All type checks pass with `npx tsc --noEmit`
- Added `typecheck` script to package.json

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-23 | Refresh improvement plan statuses and assumptions | The document had drifted behind the codebase and marked completed work as "Not started" |

---

## Notes

- This is a living document of pending work; remove items when they are finished
- Priority can change based on user feedback or operational needs
- Some items may be rejected after further consideration—document reasons in Decision Log

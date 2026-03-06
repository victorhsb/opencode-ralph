# Plan: Report-Driven Reliability Upgrade for Open Ralph Wiggum (MVP)

## Summary

This plan improves `opencode-ralph` using the report’s strongest recommendations for Ralph-style loops: explicit backpressure, verifiable completion, and safer loop continuation when the agent claims success incorrectly.

The first implementation wave is an MVP focused on reliability, not a full supervisor redesign.

The plan is designed to be implemented in the current codebase with minimal architectural churn, while leaving clean extension points for later phases (policy-based supervisor, budgets, richer state artifacts).

## Goal and Success Criteria

## Goal

Add native verification/backpressure to the loop so completion is accepted only when configured checks pass, and failed completion claims are automatically rejected and fed back into the next iteration.

## Success Criteria

- Ralph can run one or more verification commands after an iteration.
- If the agent claims completion and verification fails, Ralph does not complete.
- Ralph records verification results in history/state and surfaces them in `status`.
- Ralph gives the next iteration explicit failure evidence (not only console output).
- Existing usage without verification flags continues to work.
- Verification behavior is opt-in and controlled by CLI flags (per your preference).

## Scope (MVP)

## In Scope

- Verification command execution and completion gating.
- Prompt changes to tell the agent about verification criteria.
- Loop logic changes to reject false completion claims.
- State/history schema extensions for verification evidence.
- `status` output improvements for verification visibility.
- Tests for verification runner, gating logic, prompt integration, and state persistence.

## Out of Scope (MVP)

- Full policy engine / supervisor gatekeeper decisions (`CONTINUE|STOP_SUCCESS|ROLLBACK|ESCALATE`).
- Cost/token budget tracking.
- Config-file based policy (`.ralph` config) as primary input.
- Automatic rollback/checkpoint orchestration.
- Breaking CLI redesign beyond adding verification flags.

## Design Decisions (Locked)

- Verification configuration source: CLI flags first.
- Default enforcement when completion is claimed but verification fails: reject completion and continue loop.
- Compatibility posture for MVP: preserve current behavior unless verification flags are used.
- Verification execution trigger (MVP default): run on completion claim and task-completion claim; optional mode flag enables every iteration.

## Public CLI / Interface Changes

## New CLI Flags in `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/cli/program.ts`

Add these flags to the main `ralph` command:

- `--verify <cmd>` (repeatable)
- `--verify-mode <mode>` where `mode` is `on-claim|every-iteration`
- `--verify-timeout-ms <n>` (per command timeout)
- `--verify-fail-fast` (stop remaining verify steps on first failure)
- `--verify-max-output-chars <n>` (truncate captured stdout/stderr stored in history/prompt feedback)

### Exact CLI Semantics

- `--verify <cmd>` may be specified multiple times.
- Verification steps execute in the order provided.
- `--verify-mode` default is `on-claim`.
- `on-claim` triggers verification when either completion is detected (`completed=true` or `<promise>COMPLETE</promise>`) or task completion promise is detected in tasks mode.
- `every-iteration` triggers verification after every iteration.
- `--verify-timeout-ms` default is `300000` (5 minutes).
- `--verify-fail-fast` default is `true`.
- `--verify-max-output-chars` default is `4000`.

## Main Command Options Type Changes in `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/cli/commands/main.ts`

Extend `MainCommandOptions` with:

- `verify?: string[]`
- `verifyMode?: "on-claim" | "every-iteration"`
- `verifyTimeoutMs?: number`
- `verifyFailFast?: boolean`
- `verifyMaxOutputChars?: number`

## Loop Options Type Changes in `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/loop/loop.ts`

Extend `LoopOptions` with:

- `verificationCommands: string[]`
- `verificationMode: "on-claim" | "every-iteration"`
- `verificationTimeoutMs: number`
- `verificationFailFast: boolean`
- `verificationMaxOutputChars: number`

## State and History Schema Changes

## `RalphState` additions in `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/state/state.ts`

Add a persisted verification section for runtime feedback and resume continuity:

- `verification?: VerificationState`

### `VerificationState` shape

- `enabled: boolean`
- `mode: "on-claim" | "every-iteration"`
- `commands: string[]`
- `lastRunIteration?: number`
- `lastRunPassed?: boolean`
- `lastFailureSummary?: string`
- `lastFailureDetails?: string`

## `IterationHistory` additions in `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/state/state.ts`

Add structured verification results:

- `verification?: IterationVerificationRecord`

### `IterationVerificationRecord` shape

- `triggered: boolean`
- `reason: "completion_claim" | "task_completion_claim" | "every_iteration"`
- `allPassed: boolean`
- `steps: VerificationStepRecord[]`

### `VerificationStepRecord` shape

- `command: string`
- `exitCode: number | null`
- `timedOut: boolean`
- `durationMs: number`
- `stdoutSnippet?: string`
- `stderrSnippet?: string`

## Migration / Validation Behavior

- Update Zod schemas to accept missing `verification` fields for old history/state.
- Update `migrateState()` to initialize `verification` only when new CLI flags are used.
- Keep backward compatibility with existing `.ralph/*.json` files.

## Implementation Changes (Decision Complete)

## 1. Add Verification Runner Module

Create new module(s):

- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/verification/runner.ts`
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/verification/types.ts` (optional; can live in runner if preferred)

### Responsibilities

- Execute verification commands sequentially.
- Capture stdout/stderr, exit code, duration.
- Enforce timeout per step.
- Truncate stored output snippets.
- Respect fail-fast behavior.
- Return a structured result for loop/history/state usage.

### Execution Mechanism (MVP)

- Use Bun process execution from TypeScript.
- Execute command strings via shell (`/bin/sh -lc <cmd>`) for user-friendly CLI behavior.
- Treat timeout as failure with `exitCode = null` and `timedOut = true`.

### Output Truncation Rule

- Store only tail-biased snippets (last `N` chars) to preserve the most relevant failure lines.
- Console output can show a short summary only (not full logs by default).

## 2. Integrate Verification into Loop Control

Modify `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/loop/loop.ts`.

### New per-iteration flow (after agent execution, before completion decision)

1. Detect completion claim / task-completion claim as currently done.
2. Decide whether verification should run based on `verificationMode` and claim status.
3. Run verification if triggered.
4. Attach verification result to `iterationRecord`.
5. Update `state.verification.last*` fields.
6. If completion was claimed and verification failed:
   - Set `shouldComplete = false`.
   - Print explicit rejection message.
   - Preserve loop continuation.
7. If task-completion was claimed and verification failed:
   - Print explicit rejection message for task claim.
   - Continue loop.
8. Continue existing supervisor logic and completion logic, with one change:
   - `completionDetected` is not sufficient by itself when verification is configured and triggered; `verification.allPassed` is required for completion to be accepted.

### Completion Acceptance Rule (MVP)

Completion is accepted only if all of these are true:

- `shouldComplete` is true from current logic.
- `minIterations` condition is met.
- If verification is configured and verification was triggered for this claim, `verification.allPassed === true`.

## 3. Feed Verification Failures Back Into the Next Iteration

Modify `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/prompts/prompts.ts` and loop state update logic.

### Prompt Additions

Add a new prompt section when `state.verification.lastRunPassed === false`:

- Brief verification failure summary.
- Failed commands and exit codes.
- Short stderr/stdout snippets (truncated).
- Instruction to fix verification failures before setting completion again.

### Clearing Behavior

- Replace `state.verification.lastFailure*` on each verification run.
- Clear failure feedback when a verification run passes.

This avoids overloading `.ralph/ralph-context.md` (user-driven context) and keeps system-generated feedback separate.

## 4. Surface Verification in `status`

Modify `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/cli/commands/status.ts`.

### New status output additions

- Whether verification is enabled.
- Mode (`on-claim` or `every-iteration`).
- Configured commands.
- Last verification run iteration.
- Last verification result (PASS/FAIL).
- Last failure summary (if any).
- Recent history lines include verify status marker (for last 5 iterations), e.g. `verify:PASS`, `verify:FAIL`, `verify:-`.

## 5. CLI Parsing and Validation

Modify `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/cli/program.ts` and `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/cli/commands/main.ts`.

### Validation Rules

- `--verify-mode` must be `on-claim` or `every-iteration`.
- `--verify-timeout-ms` must be > 0.
- `--verify-max-output-chars` must be >= 200.
- If no `--verify` is provided, verification settings are ignored and existing behavior remains unchanged.
- `--dry-run` should print verification configuration in addition to the prompt (summary header only, no execution).

## 6. Logging / Operator UX (MVP Reliability Focus)

Modify loop console output in `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/loop/loop.ts`.

### New console events

- `🧪 Running verification (reason: completion_claim)...`
- Per-step short result line: command, duration, PASS/FAIL/TIMEOUT.
- Rejection message when completion is denied due to verification failure.
- Summary line on pass before completion acceptance.

### Noise policy

- Keep detailed verify stdout/stderr out of console by default.
- Store snippets in history for inspection.
- Future phase can add `--verbose-verify`.

## 7. Docs (MVP-Required for Adoption)

Update documentation to reflect the new reliability model:

- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/README.md`
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/ARCHITECTURE.md`

### Required doc changes

- Add verification/backpressure flags and examples.
- Explain completion gating behavior.
- Clarify structured output + optional promise tags.
- Clarify supervisor remains suggestion-based in current version.
- Fix existing doc inconsistencies discovered during assessment (agent flag/migration notes and SDK version references).

## Files to Change (Implementation Map)

- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/cli/program.ts`
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/cli/commands/main.ts`
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/loop/loop.ts`
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/prompts/prompts.ts`
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/state/state.ts`
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/cli/commands/status.ts`
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/verification/runner.ts` (new)
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/src/verification/types.ts` (new, optional)
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/README.md`
- `/Users/torugo/go/src/github.com/victorhsb/opencode-ralph/ARCHITECTURE.md`

## Test Cases and Scenarios

## Unit Tests

Add/extend tests for CLI parsing and validation.

- `--verify` repeatable parsing works.
- Invalid `--verify-mode` is rejected.
- Invalid `--verify-timeout-ms` is rejected.
- Invalid `--verify-max-output-chars` is rejected.

Add tests for verification runner.

- Single command pass.
- Single command fail (non-zero exit).
- Multiple commands ordered execution.
- Fail-fast stops subsequent steps.
- Non-fail-fast continues steps.
- Timeout marks step as timed out and failed.
- Output truncation keeps only configured snippet length.

Add tests for prompt generation.

- Prompt includes verification criteria when verification is enabled.
- Prompt includes last verification failure feedback after failed verification.
- Prompt clears failure feedback after pass.

Add tests for state/history schema compatibility.

- Old state/history loads without verification fields.
- New verification fields validate and persist.

## Loop Integration Tests

Add integration-style tests around loop behavior (mock SDK iteration responses and verification runner).

- Agent claims completion, verify passes, loop exits successfully.
- Agent claims completion, verify fails, loop continues and completion is rejected.
- Agent does not claim completion, `verify-mode=on-claim`, no verification runs.
- Agent does not claim completion, `verify-mode=every-iteration`, verification runs.
- Tasks mode task claim with failed verification is rejected and loop continues.
- `status` shows last verification failure after a failed run.

## Manual Acceptance Scenarios

- `ralph "..." --verify "bun test" --max-iterations 5` with passing tests completes normally.
- Same command with failing tests shows completion rejection and continues.
- `ralph status` shows verification config and last result while loop is active.
- Resume an interrupted loop with verification enabled preserves last failure feedback.

## Rollout Plan (Implementation Sequence)

1. Implement verification runner and tests.
2. Add CLI flags and option validation.
3. Wire loop gating and history/state recording.
4. Add prompt feedback integration.
5. Add `status` display updates.
6. Update docs and examples.
7. Run targeted tests, then broader `bun test`, then `bun run build`.

## Follow-Up Phases (Post-MVP, Derived from the Report)

## Phase 2: Stronger Backpressure and Policies

- Add `--verify-step <name>::<cmd>` with named steps and required/optional flags.
- Add `--verify-before-complete-only` and `--verify-before-task-advance-only` granular triggers.
- Add failure streak policy (`--fail-on-no-progress N`, `--pause-on-verify-fail N`).

## Phase 3: Supervisor Architecture Upgrade

- Expand supervisor schema from `add_task|add_context` to structured decisions.
- Add risk-based pause/escalation.
- Add read-only “gatekeeper supervisor” mode separate from suggestion mode.

## Phase 4: Config File and Budgets

- Add `.ralph/config.json` or `.ralph/ralph.config.json` for persistent verification policy.
- Add time/cost/token budgets and stop reasons.
- Add richer reporting/export for long-running loops.

## Assumptions and Defaults (Explicit)

- Commands run on local shell via `/bin/sh -lc`.
- Verification is opt-in and disabled by default.
- `--verify-mode` default is `on-claim`.
- Verification failure rejects completion claims and continues the loop (default behavior).
- Verification output snippets are truncated to `4000` chars by default.
- Per-step timeout default is `300000ms`.
- MVP does not change the supervisor’s core contract (still suggestion-based).
- MVP does not introduce config-file-based verification policy.

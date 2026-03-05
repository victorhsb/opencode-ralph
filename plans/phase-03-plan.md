# Phase 03: Testing Strategy Expansion

## 0) Metadata

- Phase number and name: 03 - Testing Strategy Expansion
- Task label: Add comprehensive unit tests
- Depends on phase(s): 01
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 8-12 iterations

## 1) Objective

- Primary outcome: Comprehensive unit test coverage for pure functions and core modules
- Why this phase now: Foundation for confident refactoring in later phases (08, etc.)

## 2) Scope

- In scope for this phase:
  - Unit tests for argument parsing (`src/cli/args.ts`)
  - Unit tests for prompt building (`src/prompts/prompts.ts`)
  - Unit tests for task file parsing (`src/tasks/tasks.ts`)
  - Unit tests for file tracking (`src/fs-tracker/fs-tracker.ts`)
  - Unit tests for state management (complementing Phase 02)
  - Test coverage reporting setup
  - Integration tests with mocked SDK

- Out of scope for this phase:
  - E2E tests requiring actual SDK calls
  - Performance benchmarks
  - Property-based testing (stretch goal if time permits)

## 3) Required Context to Load First

### Required Files and Docs

- `src/cli/args.ts` - Argument parsing
- `src/prompts/prompts.ts` - Prompt building
- `src/tasks/tasks.ts` - Task parsing
- `src/fs-tracker/fs-tracker.ts` - File tracking
- `src/state/state.ts` - State management
- `tests/ralph.test.ts` - Existing integration tests (reference pattern)
- `src/sdk/__tests__/` - Existing SDK tests (reference pattern)

### Optional Deep-Dive Resources

- bun:test documentation for advanced matchers
- Existing test patterns in the codebase

## 4) Constraints and Contracts

- Public interfaces that must remain stable:
  - All exported functions should remain testable
  - Don't change function signatures just for testing

- Performance constraints:
  - Tests should run quickly (< 30s for full suite)
  - Use temp directories, not real `.ralph/`

## 5) Implementation Plan

1. **Set up test infrastructure**
   - Review existing test setup
   - Ensure temp directory utilities available
   - Add coverage reporting if not present (bun has built-in coverage)

2. **Test argument parsing (`src/cli/args.ts`)**
   - Create `src/cli/__tests__/args.test.ts`:
     - Test valid argument combinations
     - Test edge cases (empty args, missing required)
     - Test type coercion (numbers, booleans)
     - Test unknown argument handling

3. **Test prompt building (`src/prompts/prompts.ts`)**
   - Create `src/prompts/__tests__/prompts.test.ts`:
     - Test prompt template rendering
     - Test context injection
     - Test prompt length limits
     - Test special character handling

4. **Test task file parsing (`src/tasks/tasks.ts`)**
   - Create `src/tasks/__tests__/tasks.test.ts`:
     - Test parsing task files
     - Test task status tracking ([ ], [/], [x])
     - Test subtask handling
     - Test malformed task file handling

5. **Test file tracking (`src/fs-tracker/fs-tracker.ts`)**
   - Create `src/fs-tracker/__tests__/fs-tracker.test.ts`:
     - Test file change detection
     - Test ignore patterns
     - Test directory traversal
     - Test hash/comparison logic

6. **Test state management**
   - Complement Phase 02 tests
   - Test state save/load roundtrip
   - Test concurrent access (if applicable)

7. **Add integration tests**
   - Mock SDK client for testing
   - Test loop iteration logic
   - Test error recovery paths

8. **Add coverage reporting**
   - Configure coverage thresholds
   - Document how to run coverage: `bun test --coverage`

9. **Run full test suite**
   - Ensure all tests pass
   - Check coverage report
   - Fix any regressions

## 6) Verification

- Command: `bun test --coverage && bun run build`
- Expected result: All tests pass, coverage > 50% for targeted modules
- Failure triage note: If coverage is low, identify untested code paths

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - Unit tests exist for: args, prompts, tasks, fs-tracker, state (verified)
  - All tests pass (verified: `bun test --coverage` => 461 pass, 0 fail)
  - Coverage report generated (verified via `bun test --coverage`)
  - No regressions in existing tests (verified)
  - Build passes (verified: `bun run build`)

- STATUS: COMPLETE (Iteration 1)
- Notes:
  - Added CLI argument parsing coverage in `src/cli/__tests__/args.test.ts`.
  - Updated prompt verification assertions in `src/prompts/__tests__/prompts.test.ts` to match tasks-mode-only verification sections.

## 8) Handoff to Next Phase

- Artifacts produced:
  - `src/cli/__tests__/args.test.ts`
  - `src/prompts/__tests__/prompts.test.ts`
  - `src/tasks/__tests__/tasks.test.ts`
  - `src/fs-tracker/__tests__/fs-tracker.test.ts`
  - `src/state/__tests__/state.test.ts`
  - Updated test infrastructure with coverage execution baseline

- What changed that next phase must know:
  - Comprehensive test coverage now available
  - Can confidently refactor in Phase 08
  - Test patterns established
  - CLI argument validation is now directly covered by dry-run integration-style unit tests

- New risks or assumptions:
  - Tests use temp directories (won't interfere with real state)
  - Some async behavior may need special handling

- Master plan updates required:
  - Mark Phase 03 as complete
  - Document coverage baseline

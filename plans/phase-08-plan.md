# Phase 08: Code Organization Refinements

## 0) Metadata

- Phase number and name: 08 - Code Organization Refinements
- Task label: Refactor loop.ts and ralph.ts for better organization
- Depends on phase(s): 03, 04
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 6-10 iterations

## 1) Objective

- Primary outcome: Refactored code with extracted functions, reduced nesting, and command pattern
- Why this phase now: Lower priority but improves maintainability; tests from Phase 03 enable safe refactoring

## 2) Scope

- In scope for this phase:
  - Extract functions from `loop.ts` (~600 lines currently)
  - Separate command handling from entry point in `ralph.ts`
  - Apply command pattern for CLI commands
  - Reduce nesting with early returns
  - Improve function naming and cohesion
  - Preserve all existing behavior

- Out of scope for this phase:
  - Major architectural changes
  - New features
  - Breaking changes to CLI

## 3) Required Context to Load First

### Required Files and Docs

- `src/loop/loop.ts` - Main loop to refactor
- `ralph.ts` - Entry point to refactor
- `src/cli/` - Command handling
- All tests (from Phase 03) - Ensure no regressions

### Optional Deep-Dive Resources

- Command pattern examples
- Refactoring techniques (extract method, early returns)

## 4) Constraints and Contracts

- Public interfaces that must remain stable:
  - All CLI commands and flags
  - All exports
  - All behaviors

- Data contracts that must remain stable:
  - State file formats
  - Configuration formats

- Performance constraints:
  - No performance degradation

## 5) Implementation Plan

1. **Analyze current structure**
   - Read `src/loop/loop.ts` thoroughly
   - Identify sections: initialization, iteration loop, cleanup, error handling
   - Identify long functions and deep nesting
   - List all responsibilities

2. **Plan extraction from loop.ts**
   - Identify extractable functions:
     - `initializeLoop()` - Setup and validation
     - `executeIteration()` - Single iteration logic
     - `processResult()` - Handle iteration result
     - `cleanupLoop()` - Resource cleanup
     - `shouldContinue()` - Loop termination check

3. **Refactor loop.ts incrementally**
   - Step 1: Extract helper functions with clear names
   - Step 2: Apply early returns to reduce nesting
   - Step 3: Group related operations
   - Step 4: Add JSDoc comments to extracted functions
   - Run tests after each step

4. **Plan command pattern for ralph.ts**
   - Identify commands:
     - `--status`
     - `--list-suggestions`
     - `--approve-suggestion`
     - `--reject-suggestion`
     - `--clear-context`
     - `--add-context`
     - `--tasks`
     - `--supervisor`
     - Default (main loop)

5. **Implement command pattern**
   - Create `src/cli/commands.ts`:
   ```typescript
   export type CommandHandler = (args: ParsedArgs) => Promise<void> | void;

   export const commands = new Map<string, CommandHandler>([
     ["--status", handleStatusCommand],
     ["--list-suggestions", handleListSuggestionsCommand],
     ["--approve-suggestion", handleApproveSuggestionCommand],
     ["--reject-suggestion", handleRejectSuggestionCommand],
     ["--clear-context", handleClearContextCommand],
     ["--add-context", handleAddContextCommand],
     ["--tasks", handleTasksCommand],
     ["--supervisor", handleSupervisorCommand],
   ]);
   ```

6. **Refactor ralph.ts**
   - Extract each command handler to `src/cli/commands/`
   - Keep entry point minimal:
   ```typescript
   async function main(): Promise<void> {
     const args = parseArgs();
     
     for (const [flag, handler] of commands) {
       if (args[flag]) {
         await handler(args);
         return;
       }
     }
     
     // Default: run main loop
     await runMainLoop(args);
   }
   ```

7. **Reduce nesting**
   - Find deep nesting (>3 levels)
   - Apply early returns
   - Extract nested logic to functions
   - Use guard clauses

8. **Verify no regressions**
   - Run full test suite: `bun test`
   - Run build: `bun run build`
   - Manual smoke test: `bun run start -- --help`
   - Check all commands still work

9. **Update documentation**
   - Update ARCHITECTURE.md if it describes refactored parts
   - Document new command structure
   - Document main loop flow

## 6) Verification

- Command: `bun test && bun run build`
- Expected result: All tests pass, build succeeds, CLI works identically
- Failure triage note: If tests fail, check for behavioral changes during refactoring

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - loop.ts refactored with extracted functions
  - ralph.ts uses command pattern
  - All commands still work
  - No test regressions
  - Build passes
  - Code review (if applicable) complete

## 8) Handoff to Next Phase

- Artifacts produced:
  - Refactored `src/loop/loop.ts`
  - Refactored `ralph.ts`
  - New `src/cli/commands.ts` and command handlers
  - Updated documentation

- What changed that next phase must know:
  - Command pattern available for new commands
  - Loop logic more modular
  - Functions have clearer responsibilities

- New risks or assumptions:
  - Refactoring may introduce subtle bugs (mitigated by tests)
  - Function signatures preserved for compatibility

- Master plan updates required:
  - Mark Phase 08 as complete
  - Document new code organization

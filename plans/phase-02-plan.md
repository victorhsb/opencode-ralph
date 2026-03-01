# Phase 02: State File Validation

## 0) Metadata

- Phase number and name: 02 - State File Validation
- Task label: Add Zod validation for state files
- Depends on phase(s): 01
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 5-8 iterations

## 1) Objective

- Primary outcome: Robust runtime validation of state files in `.ralph/` with graceful error handling
- Why this phase now: High priority, prevents crashes from corrupted state, foundation for later phases

## 2) Scope

- In scope for this phase:
  - Add Zod as a dependency
  - Create validation schemas for all state files
  - Implement validation in state loading functions
  - Add clear error messages for validation failures
  - Add automatic backup/restore for corrupted states
  - Add state version field for future migrations

- Out of scope for this phase:
  - Full state migration system (just add version field for future use)
  - SQLite migration (deferred to Phase 11)
  - Compression (deferred to Phase 11)

## 3) Required Context to Load First

### Required Files and Docs

- `src/state/state.ts` - Current state management implementation
- `src/state/` directory - All state-related files
- `package.json` - To add Zod dependency

### Optional Deep-Dive Resources

- Zod documentation (https://zod.dev)
- Current `.ralph/` directory structure (if exists)

## 4) Constraints and Contracts

- Public interfaces that must remain stable:
  - State loading functions must maintain same signatures
  - Return types should remain compatible

- Data contracts that must remain stable:
  - State file structure should be backward compatible (add version field)
  - Existing state files without version should be treated as version 1

- Performance constraints:
  - Validation should not significantly slow down state loading

## 5) Implementation Plan

1. **Add Zod dependency**
   - Run `bun add zod`
   - Verify package.json updated

2. **Analyze current state structure**
   - Read `src/state/state.ts` and related files
   - Identify all state file types (loop state, history, context, tasks, etc.)
   - Document the structure of each

3. **Create validation schemas**
   - Create `src/state/schemas.ts`:
   ```typescript
   import { z } from "zod";

   export const LoopStateSchema = z.object({
     version: z.number().default(1),
     active: z.boolean(),
     iteration: z.number().int().nonnegative(),
     minIterations: z.number().int().nonnegative(),
     maxIterations: z.number().int().nonnegative(),
     // ... other fields
   });

   export type LoopState = z.infer<typeof LoopStateSchema>;
   // ... other schemas
   ```

4. **Implement validation wrappers**
   - Modify state loading functions to:
     - Parse JSON
     - Validate against schema
     - On validation failure: backup corrupted file, return default/empty state with warning
   - Add `src/state/validation.ts` with helper functions

5. **Add error handling**
   - Create specific error messages for different validation failures
   - Log warnings when recovering from corrupted state
   - Preserve stack traces for debugging

6. **Update state saving**
   - Ensure all state saves include version field
   - Use schema to validate before saving (fail fast)

7. **Add tests**
   - Test valid state loading
   - Test corrupted state recovery
   - Test missing fields handling
   - Test version field behavior

## 6) Verification

- Command: `bun test ./src/state/__tests__/validation.test.ts && bun run build`
- Expected result: All validation tests pass, build succeeds
- Failure triage note: If tests fail, check schema matches actual state structure

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - Zod added as dependency
  - Validation schemas created for all state types
  - State loading validates and recovers gracefully
  - Tests cover validation and recovery scenarios
  - Build passes

## 8) Handoff to Next Phase

- Artifacts produced:
  - `src/state/schemas.ts` - Zod schemas
  - `src/state/validation.ts` - Validation helpers
  - `src/state/__tests__/validation.test.ts` - Tests
  - Updated state loading functions

- What changed that next phase must know:
  - State files now include version field
  - Corrupted states are handled gracefully
  - Zod is available for any other validation needs

- New risks or assumptions:
  - State files with new version field may need migration in future
  - Validation adds slight overhead to state operations

- Master plan updates required:
  - Mark Phase 02 as complete
  - Note that Zod is now available project-wide

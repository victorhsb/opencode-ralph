# Phase 04: Structured Error Handling

## 0) Metadata

- Phase number and name: 04 - Structured Error Handling
- Task label: Create error hierarchy and refactor error handling
- Depends on phase(s): 02
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 5-7 iterations

## 1) Objective

- Primary outcome: Consistent error hierarchy with user-friendly messages and programmatic error codes
- Why this phase now: Medium priority, needed for robust error handling in configuration and logging phases

## 2) Scope

- In scope for this phase:
  - Create error hierarchy in `src/errors/index.ts`
  - Define error codes for all error types
  - Replace console.error in library code with thrown errors
  - Add user-friendly error message mapper
  - Update CLI entry points to handle errors gracefully
  - Ensure error types work with Phase 02 validation errors

- Out of scope for this phase:
  - Changing all error handling at once (incremental migration)
  - Internationalization of error messages
  - Error telemetry/logging (Phase 07)

## 3) Required Context to Load First

### Required Files and Docs

- `src/state/validation.ts` (from Phase 02) - For integration with validation errors
- `ralph.ts` - CLI entry point
- `src/cli/` - Command handlers
- `src/loop/loop.ts` - Main loop
- `src/sdk/` - SDK integration (error sources)

### Optional Deep-Dive Resources

- TypeScript error handling patterns
- Existing error handling in the codebase

## 4) Constraints and Contracts

- Public interfaces that must remain stable:
  - CLI exit codes should remain consistent
  - Error messages should be helpful but not expose internals in production

- Data contracts that must remain stable:
  - Existing error behaviors should be preserved during migration

## 5) Implementation Plan

1. **Create error hierarchy**
   - Create `src/errors/index.ts`:
   ```typescript
   export class RalphError extends Error {
     constructor(
       message: string,
       public readonly code: string,
       public readonly cause?: unknown
     ) {
       super(message);
       this.name = "RalphError";
     }
   }

   export class SdkInitError extends RalphError {
     constructor(message: string, cause?: unknown) {
       super(message, "SDK_INIT_FAILED", cause);
     }
   }

   export class ValidationError extends RalphError {
     constructor(message: string, cause?: unknown) {
       super(message, "VALIDATION_FAILED", cause);
     }
   }

   export class StateCorruptedError extends RalphError {
     constructor(message: string, cause?: unknown) {
       super(message, "STATE_CORRUPTED", cause);
     }
   }

   export class ConfigError extends RalphError {
     constructor(message: string, cause?: unknown) {
       super(message, "CONFIG_ERROR", cause);
     }
   }

   export class TaskError extends RalphError {
     constructor(message: string, cause?: unknown) {
       super(message, "TASK_ERROR", cause);
     }
   }

   export class LoopError extends RalphError {
     constructor(message: string, cause?: unknown) {
       super(message, "LOOP_ERROR", cause);
     }
   }
   ```

2. **Create error message mapper**
   - Create `src/errors/messages.ts`:
   ```typescript
   import { RalphError } from "./index";

   export function getUserFriendlyMessage(error: RalphError): string {
     const messages: Record<string, string> = {
       SDK_INIT_FAILED: "Failed to initialize the OpenCode SDK. Check your API key and network connection.",
       VALIDATION_FAILED: "Invalid input provided. Please check your arguments.",
       STATE_CORRUPTED: "Your session state appears to be corrupted. Starting fresh.",
       CONFIG_ERROR: "Configuration error. Check your .ralphrc file.",
       TASK_ERROR: "Task processing error. Check your task file format.",
       LOOP_ERROR: "An error occurred during execution. Please try again.",
     };
     return messages[error.code] || error.message;
   }
   ```

3. **Integrate with validation (Phase 02)**
   - Update validation errors to use `ValidationError` or `StateCorruptedError`
   - Ensure Zod errors are wrapped properly

4. **Refactor SDK error handling**
   - Update `src/sdk/` to throw `SdkInitError` instead of console.error
   - Preserve error cause for debugging

5. **Refactor CLI error handling**
   - Update `ralph.ts` to catch `RalphError` and display user-friendly messages
   - Set appropriate exit codes
   - Add `--verbose` flag support (if not exists) for detailed errors

6. **Add error tests**
   - Create `src/errors/__tests__/errors.test.ts`:
     - Test error hierarchy
     - Test error codes
     - Test message mapping

7. **Incremental migration**
   - Replace console.error calls one module at a time
   - Start with SDK, then CLI, then loop
   - Run tests after each module

## 6) Verification

- Command: `bun test ./src/errors/__tests__/ && bun run build`
- Expected result: Error tests pass, build succeeds, no console.error in library code
- Failure triage note: Check for unhandled promise rejections

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - Error hierarchy created with all types
  - Error message mapper working
  - Validation errors integrated
  - SDK errors refactored
  - CLI handles errors gracefully
  - Tests pass
  - Build passes

## 8) Handoff to Next Phase

- Artifacts produced:
  - `src/errors/index.ts` - Error classes
  - `src/errors/messages.ts` - Message mapper
  - `src/errors/__tests__/errors.test.ts` - Tests
  - Refactored error handling in SDK and CLI

- What changed that next phase must know:
  - All errors should use the hierarchy
  - User-friendly messages available
  - `ConfigError` ready for Phase 05

- New risks or assumptions:
  - Gradual migration means some console.error may remain (acceptable)
  - Error codes should be stable (don't change without reason)

- Master plan updates required:
  - Mark Phase 04 as complete
  - Note error hierarchy available for future use

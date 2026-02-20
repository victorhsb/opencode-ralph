# Improvement Plan

This document tracks potential improvements to Open Ralph Wiggum, organized by priority and category. The codebase is already well-structured with good separation of concerns and clear documentation—these suggestions focus on maintainability, robustness, and production-readiness.

## High Priority

### 1. TypeScript Configuration & Strictness

**Status:** Not started  
**Impact:** High - Prevents runtime bugs  
**Effort:** Low

Currently the project has no `tsconfig.json`, relying on Bun's default TypeScript handling. This misses opportunities for catching bugs at compile time.

**Action Items:**
- [ ] Create `tsconfig.json` with `strict: true`
- [ ] Enable `noUncheckedIndexedAccess` to catch potential undefined accesses
- [ ] Enable `exactOptionalPropertyTypes` for stricter optional property handling
- [ ] Add `noImplicitReturns` and `noFallthroughCasesInSwitch`
- [ ] Fix any type errors that emerge after enabling strict mode

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

**Current Issue:**
```json
"@opencode-ai/sdk": "^0.x"
```

The `^0.x` allows any `0.x.x` version. In semver, versions below 1.0.0 can introduce breaking changes in minor versions.

**Action Items:**
- [ ] Pin to specific version: `"@opencode-ai/sdk": "^0.15.0"` (or current latest)
- [ ] Add Dependabot or Renovate configuration for automated update PRs
- [ ] Document the SDK version compatibility in README

---

### 3. State File Validation

**Status:** Not started  
**Impact:** High - Prevents crashes from corrupted state  
**Effort:** Medium

Currently, corrupted state files in `.ralph/` would likely crash the application. Runtime validation would provide graceful degradation.

**Action Items:**
- [ ] Add Zod (or similar) for schema validation
- [ ] Validate state on load with clear error messages
- [ ] Add automatic state migration for version upgrades
- [ ] Consider backup/restore mechanism for corrupted states

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

### 4. Testing Strategy Expansion

**Status:** Partial (SDK tests exist)  
**Impact:** High - Confidence for refactoring  
**Effort:** High

**Current State:**
- One integration test file (`tests/ralph.test.ts`)
- Some SDK-specific tests in `src/sdk/__tests__/`

**Action Items:**
- [ ] Unit tests for pure functions:
  - Argument parsing (`src/cli/args.ts`)
  - Prompt building (`src/prompts/prompts.ts`)
  - Task file parsing (`src/tasks/tasks.ts`)
  - State management (`src/state/state.ts`)
  - File tracking (`src/fs-tracker/fs-tracker.ts`)
- [ ] Integration tests with mocked SDK
- [ ] Test coverage reporting (add coverage threshold)
- [ ] Property-based testing for parsers

**Gaps to fill:**
- No tests for CLI argument parsing edge cases
- No tests for loop orchestration logic
- No tests for error recovery paths

---

### 5. Structured Error Handling

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

### 6. Configuration File Support

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

### 7. Logging Infrastructure

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

### 8. Performance Monitoring

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

### 9. State Management Improvements

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

### 10. Code Organization Refinements

**Status:** Not started  
**Impact:** Low - Maintainability  
**Effort:** Medium

**Issues identified:**
- `loop.ts` is ~600 lines
- `ralph.ts` has mixed concerns (CLI parsing + command dispatch)
- Command handling uses if/else chain instead of pattern matching

**Action Items:**
- [ ] Extract main loop body into smaller focused functions
- [ ] Separate command handling from entry point using command pattern
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

### 11. Documentation Improvements

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

### 12. CI/CD Pipeline

**Status:** Partial (GitHub Actions workflow exists for bot)  
**Impact:** High - Quality assurance  
**Effort:** Low

**Current state:** Has `.github/workflows/opencode.yml` for the bot integration.

**Action Items:**
- [ ] Create `.github/workflows/ci.yml` for PR testing
- [ ] Run tests on multiple platforms (Ubuntu, macOS)
- [ ] Add type checking step once tsconfig.json exists
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

*None yet*

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| | | |

---

## Notes

- This is a living document—items should be moved to "Completed" as they're finished
- Priority can change based on user feedback or operational needs
- Some items may be rejected after further consideration—document reasons in Decision Log

# Improvement Plan Implementation - Master Plan

## 1) Objective

- Problem to solve: Implement the remaining 11 improvement items from `docs/improvement-plan.md`
- Target outcome: A more robust, maintainable, and production-ready Ralph CLI with proper error handling, testing, configuration, logging, and CI/CD
- MVP boundary: All high and medium priority items must be completed; lower priority items are stretch goals
- Success criteria:
  - All high priority improvements implemented and verified
  - All medium priority improvements implemented and verified
  - CI/CD pipeline running and passing
  - Test coverage improved from current baseline
  - No regressions in existing functionality

## 2) Scope

- In scope:
  - Dependency version pinning with proper semver handling
  - State file validation using Zod schemas
  - Expanded test coverage (unit tests for pure functions)
  - Structured error hierarchy and handling
  - Configuration file support (.ralphrc.json, ralph.config.ts)
  - CI/CD pipeline with GitHub Actions
  - Logging infrastructure with levels and structured output
  - Code organization refinements (extract functions, command pattern)
  - Documentation improvements (ADRs, CONTRIBUTING.md)
  - Performance monitoring basics
  - State management improvements evaluation

- Out of scope:
  - Major architectural changes to the SDK integration
  - New features not listed in the improvement plan
  - SQLite migration (will evaluate and decide)
  - Breaking changes to existing CLI API

## 3) Constraints and Assumptions

- Tech stack constraints:
  - Bun runtime
  - TypeScript with strict mode
  - @opencode-ai/sdk for SDK integration
  - bun:test for testing
  - No ESLint/Prettier currently configured

- Platform constraints:
  - Must support Linux and macOS
  - GitHub Actions for CI/CD

- Assumptions:
  - Current test suite passes as baseline
  - TypeScript strict mode is already enabled
  - Existing CLI behavior should be preserved

## 4) Phase Map

| Phase | Plan file | Primary outcome | Depends on | Verification gate | Completion tag |
| --- | --- | --- | --- | --- | --- |
| 01 | plans/phase-01-plan.md | Dependency version pinning | - | Tests pass, package.json updated | READY_FOR_NEXT_TASK |
| 02 | plans/phase-02-plan.md | State file validation with Zod | 01 | State loads validate, graceful errors | ✅ COMPLETE |
| 03 | plans/phase-03-plan.md | Testing strategy expansion | 01 | New unit tests pass, coverage improved | READY_FOR_NEXT_TASK |
| 04 | plans/phase-04-plan.md | Structured error handling | 02 | Error hierarchy works, tests pass | READY_FOR_NEXT_TASK |
| 05 | plans/phase-05-plan.md | Configuration file support | 04 | Config files load, CLI args override works | ✅ COMPLETE |
| 06 | plans/phase-06-plan.md | CI/CD pipeline | 01, 03 | GitHub Actions workflow passes | ✅ COMPLETE |
| 07 | plans/phase-07-plan.md | Logging infrastructure | 05 | Logger replaces console calls, levels work | ✅ COMPLETE |
| 08 | plans/phase-08-plan.md | Code organization refinements | 03, 04 | loop.ts refactored, command pattern applied | ✅ COMPLETE |
| 09 | plans/phase-09-plan.md | Documentation improvements | 06, 08 | ADRs created, CONTRIBUTING.md added | ✅ COMPLETE |
| 10 | plans/phase-10-plan.md | Performance monitoring | 07 | Duration/iteration tracking works | ✅ COMPLETE |
| 11 | plans/phase-11-plan.md | State management evaluation | 02 | Decision made on SQLite vs JSON | COMPLETE |

## 5) Cross-Phase Contracts

- Data model contracts to preserve:
  - State file format in `.ralph/` (until Phase 02 validates it)
  - Task file format in `.ralph/tasks.md`
  - CLI argument interface (flags, defaults)

- API and interface contracts to preserve:
  - All existing CLI commands and flags
  - SDK integration patterns in `src/sdk/`
  - Public exports from modules

- Migration expectations:
  - State files created before validation will continue to work
  - Configuration files are additive (CLI args always override)
  - Error handling changes are internal-only (no breaking CLI changes)

## 6) Global Verification Strategy

- Per-phase minimum checks:
  - Type checking: `bun run typecheck`
  - Tests: `bun test` (relevant test files)
  - Build: `bun run build`

- End-to-end checks before final completion:
  - Full test suite passes: `bun test`
  - Build produces valid output: `bun run build`
  - CLI runs without errors: `bun run start -- --help`
  - Type checking passes: `bun run typecheck`

- Build and test commands used across phases:
  ```bash
  bun run typecheck
  bun test ./src/path/to/test.ts
  bun run test
  bun run build
  ```

## 7) Risk Register

| Risk | Trigger | Impact | Mitigation | Owner phase |
| --- | --- | --- | --- | --- |
| Zod introduces breaking changes | Adding validation schemas | High | Validate backward compatibility, test with existing state files | Phase 02 |
| Test coverage gaps hide regressions | Refactoring without tests | High | Expand tests before refactoring (Phase 03 before 08) | Phase 03, 08 |
| Configuration precedence confusion | Users have both config files and CLI args | Medium | Document precedence clearly, test override behavior | Phase 05 |
| CI/CD platform limitations | GitHub Actions unavailable | Medium | Document manual verification steps | Phase 06 |
| Logging changes affect output parsing | Scripts depend on console format | Medium | Keep structured logging opt-in, preserve default format | Phase 07 |
| Loop.ts refactoring introduces bugs | Large file extraction | Medium | Comprehensive tests first, small incremental changes | Phase 08 |
| SQLite vs JSON decision delays work | Unclear requirements | Low | Make decision in Phase 11, can defer implementation | Phase 11 |

## 8) Phase Exit and Final Exit Criteria

- Phase exit criteria rule:
  - All implementation steps completed
  - Verification commands pass
  - No type errors
  - Tests pass (or new tests added for new code)
  - Code reviewed (if applicable)

- Final completion criteria rule:
  - All phases 01-11 complete
  - Full test suite passes
  - Build succeeds
  - Documentation updated
  - CI/CD pipeline green

- Promise tags in use:
  - `READY_FOR_NEXT_TASK` - Phase complete, ready to proceed
  - `COMPLETE` - Final phase (11) finished, entire plan done

## 9) Execution Status

- ✅ Phase 11 complete (iteration 9): state management evaluated; JSON retained over SQLite.
- ✅ Final enhancements delivered for state handling:
  - Optional compression (`state.compress`)
  - Configurable history pruning (`state.maxHistory`)
  - Backward-compatible loading for uncompressed and compressed state/history files
- ✅ Documentation and ADR updates completed for the final decision.
- ✅ Improvement plan phases 01-11 are now complete.

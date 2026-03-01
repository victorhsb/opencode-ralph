# Phase 11: State Management Evaluation

## 0) Metadata

- Phase number and name: 11 - State Management Evaluation
- Task label: Evaluate SQLite vs JSON and make decision
- Depends on phase(s): 02
- Planned completion tag: COMPLETE
- Estimated iteration budget: 3-5 iterations

## 1) Objective

- Primary outcome: Decision on state storage strategy (SQLite vs JSON) with implementation if justified
- Why this phase now: Final phase, lower priority but needed for long-term reliability; uses validation from Phase 02

## 2) Scope

- In scope for this phase:
  - Evaluate SQLite option:
    - Pros: Querying, transactions, schema enforcement
    - Cons: Additional dependency, complexity, debugging difficulty
  - Evaluate JSON improvements:
    - Compression for large histories
    - State pruning to limit history size
    - Schema migrations (version field from Phase 02)
  - Make decision and document in ADR
  - Implement chosen solution if SQLite selected
  - Or implement JSON improvements if staying with JSON

- Out of scope for this phase:
  - Full migration system (unless decision is to migrate)
  - Complex state pruning algorithms
  - Real-time state synchronization

## 3) Required Context to Load First

### Required Files and Docs

- `src/state/` (from Phase 02) - Current state implementation
- Current `.ralph/` directory size (check if large)
- Project requirements and usage patterns
- `docs/adr/002-json-over-sqlite.md` - Previous ADR

### Optional Deep-Dive Resources

- Bun SQLite support (bun:sqlite)
- JSON compression libraries

## 4) Constraints and Contracts

- Decision criteria:
  - Complexity vs benefit
  - Current state file sizes
  - Querying needs
  - Maintenance burden

## 5) Implementation Plan

1. **Assess current state**
   - Check if `.ralph/` directory exists and its size
   - Review state file sizes
   - Identify pain points with current JSON approach
   - Survey: How often do we need to query state?

2. **Evaluate SQLite option**
   - Research bun:sqlite API
   - Draft schema for SQLite state storage
   - Estimate migration effort
   - Identify risks:
     - Bun SQLite API stability
     - Binary SQLite file (less debuggable)
     - Additional complexity

3. **Evaluate JSON improvements**
   - Compression: Use gzip for history files
   - Pruning: Keep last N iterations, archive old ones
   - Migration: Version field already added in Phase 02
   - Estimate effort for each improvement

4. **Make decision**
   - Document decision factors:
     - Current JSON is simple and debuggable
     - No querying needs currently
     - State files are typically small
     - SQLite adds complexity without clear benefit
   - Decision: **Stay with JSON, add improvements**

5. **Implement JSON improvements**
   - Create `src/state/compression.ts`:
   ```typescript
   import { gzip, gunzip } from "node:zlib";
   import { promisify } from "node:util";

   const gzipAsync = promisify(gzip);
   const gunzipAsync = promisify(gunzip);

   export async function compressState(data: string): Promise<Buffer> {
     return gzipAsync(Buffer.from(data));
   }

   export async function decompressState(compressed: Buffer): Promise<string> {
     const result = await gunzipAsync(compressed);
     return result.toString();
   }
   ```

   - Create `src/state/pruning.ts`:
   ```typescript
   export interface PruningOptions {
     maxIterations: number;
     archiveOld?: boolean;
   }

   export function shouldPrune(iteration: number, options: PruningOptions): boolean {
     return iteration > options.maxIterations;
   }

   export function getIterationsToKeep(
     allIterations: number[], 
     options: PruningOptions
   ): number[] {
     return allIterations.slice(-options.maxIterations);
   }
   ```

   - Integrate into state loading/saving
   - Add config options:
   ```typescript
   state: z.object({
     compress: z.boolean().optional().default(false),
     maxHistory: z.number().int().positive().optional().default(100),
   }).optional(),
   ```

6. **Update ADR 002**
   - Update status to "Superseded" or "Amended"
   - Document decision to stay with JSON
   - Document improvements made
   - Link to implementation

7. **Add tests**
   - Test compression roundtrip
   - Test pruning logic
   - Test backward compatibility

8. **Update documentation**
   - Document state management options in README
   - Document compression and pruning configuration

## 6) Verification

- Command: `bun test ./src/state/__tests__/ && bun run build`
- Manual test: Run Ralph and verify state files work with new options
- Expected result: Tests pass, state files compress/decompress correctly, pruning works
- Failure triage note: Check compression import paths

## 7) Completion Contract

- Emit promise tag: COMPLETE
- Conditions before emitting the tag:
  - Decision documented and justified
  - ADR 002 updated
  - JSON improvements implemented:
    - Compression support (optional, configurable)
    - Pruning support (configurable)
  - Tests pass
  - Documentation updated
  - Build passes
  - All phases complete!

## 8) Handoff to Final Review

- Artifacts produced:
  - Updated `docs/adr/002-json-over-sqlite.md`
  - `src/state/compression.ts` - Compression utilities
  - `src/state/pruning.ts` - Pruning logic
  - Updated state management with improvements
  - Updated config schema

- What changed that next phase must know:
  - This is the final phase
  - All improvement plan items complete
  - State management now has compression and pruning options

- New risks or assumptions:
  - Decision to stay with JSON may need revisiting if usage changes
  - Compression adds CPU overhead (opt-in)

- Master plan updates required:
  - Mark Phase 11 as complete
  - Mark entire improvement plan as complete
  - Update decision log

## Final Deliverables

- All 11 phases implemented
- Master plan and all phase plans in `plans/`
- Updated codebase with all improvements
- Comprehensive test coverage
- CI/CD pipeline active
- Documentation complete

**Status: PROJECT COMPLETE** 🎉

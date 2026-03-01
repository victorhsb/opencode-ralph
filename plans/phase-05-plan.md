# Phase 05: Configuration File Support

## 0) Metadata

- Phase number and name: 05 - Configuration File Support
- Task label: Add .ralphrc.json and ralph.config.ts support
- Depends on phase(s): 04
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 5-7 iterations

## 1) Objective

- Primary outcome: Support configuration files with proper precedence (CLI args > project config > home config > defaults)
- Why this phase now: Medium priority, improves UX, uses error handling from Phase 04

## 2) Scope

- In scope for this phase:
  - Support `.ralphrc.json` in project root
  - Support `.ralphrc.json` in home directory
  - Support `ralph.config.ts` for typed configuration
  - Implement configuration precedence: CLI args > project config > home config > defaults
  - Configuration validation using Zod (from Phase 02)
  - Merge configurations properly
  - Error handling for invalid configs (using Phase 04 errors)

- Out of scope for this phase:
  - Configuration schemas for all possible options (start with common ones)
  - Configuration migration tools
  - Environment variable support (stretch goal)

## 3) Required Context to Load First

### Required Files and Docs

- `src/cli/args.ts` - Current argument parsing
- `src/config/` - Configuration constants and defaults
- `src/errors/` (from Phase 04) - Error handling
- `src/state/schemas.ts` (from Phase 02) - Zod patterns

### Optional Deep-Dive Resources

- cosmiconfig library (reference for config loading patterns)
- TypeScript configuration file patterns

## 4) Constraints and Contracts

- Public interfaces that must remain stable:
  - CLI argument behavior unchanged
  - Default values preserved

- Data contracts that must remain stable:
  - Configuration structure should be extensible
  - Backward compatible (new fields optional)

## 5) Implementation Plan

1. **Define configuration schema**
   - Create `src/config/schema.ts`:
   ```typescript
   import { z } from "zod";

   export const ConfigSchema = z.object({
     model: z.string().optional(),
     maxIterations: z.number().int().positive().optional(),
     minIterations: z.number().int().nonnegative().optional(),
     completionPromise: z.string().optional(),
     supervisor: z.object({
       enabled: z.boolean().optional(),
       memoryLimit: z.number().int().positive().optional(),
     }).optional(),
     permissions: z.object({
       autoApprove: z.boolean().optional(),
     }).optional(),
   });

   export type Config = z.infer<typeof ConfigSchema>;
   ```

2. **Create config loader**
   - Create `src/config/loader.ts`:
     - Find `.ralphrc.json` in project root
     - Find `.ralphrc.json` in home directory (`~/.ralphrc.json`)
     - Find `ralph.config.ts` (compile and load)
     - Load each if exists
     - Merge with precedence: CLI > project > home > defaults

3. **Handle TypeScript configs**
   - Support `ralph.config.ts` using dynamic import
   - Handle compilation errors gracefully
   - Validate exported config against schema

4. **Integrate with CLI args**
   - Modify `src/cli/args.ts` to:
     - Load configs first
     - Override with CLI args
     - Validate final configuration
   - Update argument parsing to work with merged config

5. **Add error handling**
   - Use `ConfigError` from Phase 04
   - Provide clear messages for:
     - Invalid config file format
     - Missing required fields
     - Type mismatches
     - File not found errors

6. **Add config tests**
   - Create `src/config/__tests__/loader.test.ts`:
     - Test loading from different locations
     - Test precedence rules
     - Test validation
     - Test error handling

7. **Update documentation**
   - Add config file examples to README
   - Document precedence rules
   - Document available options

## 6) Verification

- Command: `bun test ./src/config/__tests__/ && bun run build`
- Expected result: Config tests pass, build succeeds
- Manual test: Create `.ralphrc.json` and verify it loads
- Failure triage note: Check file paths and precedence logic

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - Config schema defined
  - Config loader implemented with proper precedence
  - TypeScript config support working
  - CLI args override config correctly
  - Validation errors handled gracefully
  - Tests pass
  - Documentation updated
  - Build passes

## 8) Handoff to Next Phase

- Artifacts produced:
  - `src/config/schema.ts` - Config schema
  - `src/config/loader.ts` - Config loader
  - `src/config/__tests__/loader.test.ts` - Tests
  - Updated CLI argument handling
  - Updated README

- What changed that next phase must know:
  - Configuration system available
  - Use `src/config/loader.ts` to access configuration
  - ConfigError available for config-related errors

- New risks or assumptions:
  - TypeScript config support adds complexity
  - Config file locations follow convention

- Master plan updates required:
  - Mark Phase 05 as complete
  - Document config system availability

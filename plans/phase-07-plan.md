# Phase 07: Logging Infrastructure

## 0) Metadata

- Phase number and name: 07 - Logging Infrastructure
- Task label: Create logger abstraction with levels and structured output
- Depends on phase(s): 05
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 5-7 iterations

## 1) Objective

- Primary outcome: Minimal logger abstraction with log levels, structured logging, and file output support
- Why this phase now: Lower priority but needed for debugging and observability; builds on config system

## 2) Scope

- In scope for this phase:
  - Create `src/logger/index.ts` with logger abstraction
  - Support log levels: DEBUG, INFO, WARN, ERROR
  - Add timestamps
  - Support structured logging (JSON output option)
  - Support log file output (`--log-file` flag)
  - Migrate existing console calls to use logger
  - Use configuration from Phase 05 for log level settings

- Out of scope for this phase:
  - Log rotation (can be added later)
  - Remote log aggregation
  - Correlation IDs (can add if needed)
  - Performance metrics logging (Phase 10)

## 3) Required Context to Load First

### Required Files and Docs

- `src/config/schema.ts` and `src/config/loader.ts` (Phase 05) - For log level config
- Search for all `console.log`, `console.error`, `console.warn` in codebase
- `ralph.ts` - CLI entry point for --log-file flag

### Optional Deep-Dive Resources

- Existing logging patterns in the codebase
- Structured logging best practices

## 4) Constraints and Contracts

- Public interfaces that must remain stable:
  - Default output format should remain similar to existing console calls
  - Don't break existing user expectations

- Performance constraints:
  - Logging should not significantly impact performance
  - Debug logs should be cheap when disabled

## 5) Implementation Plan

1. **Define log levels and interface**
   - Create `src/logger/index.ts`:
   ```typescript
   export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

   export interface LoggerOptions {
     level: LogLevel;
     structured?: boolean;
     file?: string;
   }

   export class Logger {
     private level: LogLevel;
     private structured: boolean;
     private file?: string;
     private levelPriority: Record<LogLevel, number> = {
       DEBUG: 0,
       INFO: 1,
       WARN: 2,
       ERROR: 3,
     };

     constructor(options: LoggerOptions) {
       this.level = options.level;
       this.structured = options.structured ?? false;
       this.file = options.file;
     }

     private shouldLog(level: LogLevel): boolean {
       return this.levelPriority[level] >= this.levelPriority[this.level];
     }

     private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
       if (!this.shouldLog(level)) return;

       const timestamp = new Date().toISOString();
       
       if (this.structured) {
         const output = JSON.stringify({ timestamp, level, message, ...meta });
         this.output(output);
       } else {
         const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
         const output = `[${timestamp}] ${level}: ${message}${metaStr}`;
         this.output(output, level);
       }
     }

     private output(message: string, level?: LogLevel): void {
       if (this.file) {
         // Append to file (async)
         Bun.write(this.file, message + "\n", { append: true });
       }
       
       if (level === "ERROR") {
         console.error(message);
       } else if (level === "WARN") {
         console.warn(message);
       } else {
         console.log(message);
       }
     }

     debug(message: string, meta?: Record<string, unknown>): void {
       this.log("DEBUG", message, meta);
     }

     info(message: string, meta?: Record<string, unknown>): void {
       this.log("INFO", message, meta);
     }

     warn(message: string, meta?: Record<string, unknown>): void {
       this.log("WARN", message, meta);
     }

     error(message: string, meta?: Record<string, unknown>): void {
       this.log("ERROR", message, meta);
     }
   }

   // Global logger instance (configured from main)
   export let logger: Logger;

   export function configureLogger(options: LoggerOptions): void {
     logger = new Logger(options);
   }
   ```

2. **Add configuration support**
   - Update `src/config/schema.ts` to include log options:
   ```typescript
   logLevel: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).optional().default("INFO"),
   logFile: z.string().optional(),
   structuredLogs: z.boolean().optional().default(false),
   ```

3. **Integrate with CLI**
   - Update `ralph.ts` to:
     - Add `--log-level`, `--log-file`, `--structured-logs` flags
     - Configure logger early in execution
     - Pass config to logger

4. **Migrate existing console calls**
   - Systematically replace:
     - `console.log` → `logger.info()`
     - `console.error` → `logger.error()`
     - `console.warn` → `logger.warn()`
   - Keep console calls only in CLI entry point for initial setup
   - Add contextual metadata where useful

5. **Add logger tests**
   - Create `src/logger/__tests__/logger.test.ts`:
     - Test log level filtering
     - Test structured output
     - Test file output

6. **Update documentation**
   - Document logging options in README
   - Provide examples of structured logging

## 6) Verification

- Command: `bun test ./src/logger/__tests__/ && bun run build`
- Manual test: Run CLI with `--log-level DEBUG` and verify output
- Expected result: Logger tests pass, build succeeds, logs appear correctly
- Failure triage note: Check log level filtering logic

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - Logger class created with all levels
  - Configuration integration working
  - CLI flags added
  - Existing console calls migrated
  - Tests pass
  - Documentation updated
  - Build passes

## 8) Handoff to Next Phase

- Artifacts produced:
  - `src/logger/index.ts` - Logger implementation
  - `src/logger/__tests__/logger.test.ts` - Tests
  - Updated config schema
  - Updated CLI with logging flags
  - Migrated console calls

- What changed that next phase must know:
  - Use `logger` instead of console for all logging
  - Logger configured from main entry point
  - Log levels available for debugging

- New risks or assumptions:
  - File logging uses Bun.write (async, non-blocking)
  - Default log level is INFO (may hide debug info)

- Master plan updates required:
  - Mark Phase 07 as complete
  - Document logging system

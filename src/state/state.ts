/**
 * State Management Module
 *
 * Manages Ralph loop state and history.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "fs";
import {
  getStateDir,
  getStateFilePath,
  getHistoryFilePath,
} from "../config/config";
import { z } from "zod";
import { StateCorruptedError } from "../errors";
import { logger as console } from "../logger";
import { compressState, decompressState, isGzipBuffer } from "./compression";
import { getIterationsToKeep, shouldPrune } from "./pruning";

export { getStateDir };

/**
 * Configuration options for state file storage.
 * Controls compression and history pruning behavior.
 */
export interface StateStorageOptions {
  /** Whether to gzip compress state files to save disk space */
  compress: boolean;
  /** Maximum number of iterations to keep in history before pruning */
  maxHistory: number;
}

const DEFAULT_STATE_STORAGE_OPTIONS: StateStorageOptions = {
  compress: false,
  maxHistory: 100,
};

let stateStorageOptions: StateStorageOptions = { ...DEFAULT_STATE_STORAGE_OPTIONS };

export function configureStateStorage(options?: Partial<StateStorageOptions>): void {
  if (!options) {
    stateStorageOptions = { ...DEFAULT_STATE_STORAGE_OPTIONS };
    return;
  }

  if (options.compress !== undefined) {
    stateStorageOptions.compress = options.compress;
  }

  if (options.maxHistory !== undefined) {
    stateStorageOptions.maxHistory = options.maxHistory;
  }
}

/**
 * Schema for a single verification step within an iteration.
 * Captures the result of running a shell command to verify that the iteration
 * completed successfully (e.g., running tests, build checks, linting).
 */
const VerificationStepRecordSchema = z.object({
  /** The shell command that was executed for verification */
  command: z.string(),
  /** The exit code from the command (null if the command failed to start) */
  exitCode: z.number().int().nullable(),
  /** Whether the command timed out during execution */
  timedOut: z.boolean(),
  /** Time taken to execute the command in milliseconds */
  durationMs: z.number().int().nonnegative(),
  /** Optional snippet of stdout output (for debugging failures) */
  stdoutSnippet: z.string().optional(),
  /** Optional snippet of stderr output (for debugging failures) */
  stderrSnippet: z.string().optional(),
});

/** Represents the result of a single verification command execution */
export type VerificationStepRecord = z.infer<typeof VerificationStepRecordSchema>;

/**
 * Schema for the verification record of an entire iteration.
 * Aggregates all verification steps and tracks whether verification was triggered
 * and what the overall result was.
 */
const IterationVerificationRecordSchema = z.object({
  /** Whether verification was triggered for this iteration */
  triggered: z.boolean(),
  /** Reason why verification was triggered */
  reason: z.enum(["completion_claim", "task_completion_claim", "every_iteration"]),
  /** Whether all verification steps passed (true) or any failed (false) */
  allPassed: z.boolean(),
  /** Array of individual verification step results */
  steps: z.array(VerificationStepRecordSchema),
});

/** Aggregated verification results for an entire iteration */
export type IterationVerificationRecord = z.infer<typeof IterationVerificationRecordSchema>;

/**
 * Schema for tracking the execution history of a single iteration.
 * Records timing, model usage, tool invocations, file changes, and outcomes.
 * This data is used for progress tracking, debugging, and struggle detection.
 */
const IterationHistorySchema = z.object({
  /** The iteration number (1-indexed) */
  iteration: z.number().int().positive(),
  /** ISO timestamp when the iteration started */
  startedAt: z.string(),
  /** ISO timestamp when the iteration ended */
  endedAt: z.string(),
  /** Total duration of the iteration in milliseconds */
  durationMs: z.number().int().nonnegative(),
  /** The AI model used for this iteration */
  model: z.string(),
  /** Map of tool names to invocation counts */
  toolsUsed: z.record(z.string(), z.number().int().nonnegative()),
  /** List of file paths that were modified during this iteration */
  filesModified: z.array(z.string()),
  /** Exit code from the iteration (0 for success, non-zero for errors) */
  exitCode: z.number(),
  /** Whether the iteration claimed completion */
  completionDetected: z.boolean(),
  /** Array of error messages encountered during the iteration */
  errors: z.array(z.string()),
  /** Whether structured output mode was used for this iteration */
  structuredOutputUsed: z.boolean().optional(),
  /** Verification results if verification was enabled and triggered */
  verification: IterationVerificationRecordSchema.optional(),
});

/** Historical record of a single Ralph loop iteration */
export type IterationHistory = z.infer<typeof IterationHistorySchema>;

/**
 * Schema for the complete loop execution history.
 * Aggregates all iterations and tracks struggle indicators to help detect
 * when the loop is stuck or making no progress.
 */
const RalphHistorySchema = z.object({
  /** Array of all completed iterations */
  iterations: z.array(IterationHistorySchema),
  /** Total duration of all iterations in milliseconds */
  totalDurationMs: z.number().int().nonnegative(),
  /** Metrics used to detect if the loop is struggling or stuck */
  struggleIndicators: z.object({
    /** Map of error messages to their occurrence count */
    repeatedErrors: z.record(z.string(), z.number().int().nonnegative()),
    /** Count of iterations where no progress was made */
    noProgressIterations: z.number().int().nonnegative(),
    /** Count of iterations that completed too quickly (potential issues) */
    shortIterations: z.number().int().nonnegative(),
  }),
});

/** Complete historical record of a Ralph loop session */
export type RalphHistory = z.infer<typeof RalphHistorySchema>;

/**
 * Schema for supervisor feature configuration.
 * The supervisor is an optional AI that monitors loop progress and can suggest
 * interventions when it detects the loop is stuck or off-track.
 */
const SupervisorConfigSchema = z.object({
  /** Whether the supervisor feature is enabled */
  enabled: z.boolean().default(false),
  /** The AI model to use for supervisor analysis (empty string uses default) */
  model: z.string().default(""),
  /** The promise text that indicates the supervisor recommends continuing */
  noActionPromise: z.string().default("CONTINUE"),
  /** The promise text that indicates the supervisor has a suggestion */
  suggestionPromise: z.string().default("SUGGEST"),
  /** Maximum number of past iterations the supervisor should review */
  memoryLimit: z.number().int().nonnegative().default(50),
  /** Optional custom prompt template for the supervisor */
  promptTemplate: z.string().optional(),
});

/** Configuration options for the Ralph supervisor feature */
export type SupervisorConfig = z.infer<typeof SupervisorConfigSchema>;

/**
 * Schema for tracking the runtime state of the supervisor.
 * Records when the supervisor ran and whether the loop is currently paused
 * waiting for user intervention.
 */
const SupervisorStateSchema = z.object({
  /** Whether the supervisor is currently enabled and active */
  enabled: z.boolean().default(false),
  /** Whether the loop is paused waiting for a user decision */
  pausedForDecision: z.boolean().default(false),
  /** The iteration number where the pause occurred */
  pauseIteration: z.number().int().positive().optional(),
  /** Human-readable reason for the pause */
  pauseReason: z.string().optional(),
  /** ISO timestamp of when the supervisor last ran */
  lastRunAt: z.string().optional(),
  /** The iteration number of the last supervisor run */
  lastRunIteration: z.number().int().nonnegative().optional(),
});

/** Runtime state tracking for the supervisor feature */
export type SupervisorState = z.infer<typeof SupervisorStateSchema>;

/**
 * Schema for verification feature state.
 * Tracks configuration and results of automated verification that runs
 * after iterations to validate that claimed completions actually work.
 */
const VerificationStateSchema = z.object({
  /** Whether automatic verification is enabled */
  enabled: z.boolean().default(false),
  /** When to run verification: on completion claim or every iteration */
  mode: z.enum(["on-claim", "every-iteration"]).default("on-claim"),
  /** Shell commands to run for verification (e.g., "npm test", "cargo build") */
  commands: z.array(z.string()).default([]),
  /** The last iteration where verification was run */
  lastRunIteration: z.number().int().positive().optional(),
  /** Whether the last verification run passed */
  lastRunPassed: z.boolean().optional(),
  /** Summary of the last verification failure (if any) */
  lastFailureSummary: z.string().optional(),
  /** Detailed output from the last verification failure (if any) */
  lastFailureDetails: z.string().optional(),
});

/** State tracking for the verification feature */
export type VerificationState = z.infer<typeof VerificationStateSchema>;

/**
 * Schema for the main Ralph loop state.
 * This is the primary state object persisted between iterations, containing
 * all configuration, progress tracking, and feature states for a loop session.
 */
const RalphStateSchema = z.object({
  /** Schema version for migration support */
  version: z.number().int().positive().default(1),
  /** Whether the loop is currently active/running */
  active: z.boolean(),
  /** Current iteration number (0 before first iteration starts) */
  iteration: z.number().int().nonnegative(),
  /** Minimum iterations required before the loop can complete */
  minIterations: z.number().int().nonnegative(),
  /** Maximum iterations allowed before the loop is forced to stop */
  maxIterations: z.number().int().nonnegative(),
  /** The text/promise that signals successful completion */
  completionPromise: z.string(),
  /** Optional text/promise that signals the loop should abort */
  abortPromise: z.string().optional(),
  /** Whether task mode is enabled (loop follows a task file) */
  tasksMode: z.boolean().default(false),
  /** The promise text used to signal task completion in task mode */
  taskPromise: z.string(),
  /** The original user prompt that started the loop */
  prompt: z.string(),
  /** Optional template for formatting prompts sent to the AI */
  promptTemplate: z.string().optional(),
  /** ISO timestamp when the loop started */
  startedAt: z.string(),
  /** The AI model used for this loop session */
  model: z.string().default(""),
  /** Supervisor configuration (if feature enabled) */
  supervisor: SupervisorConfigSchema.optional(),
  /** Supervisor runtime state (if feature enabled) */
  supervisorState: SupervisorStateSchema.optional(),
  /** Verification state (if feature enabled) */
  verification: VerificationStateSchema.optional(),
});

/** Main state object for a Ralph loop session */
export type RalphState = z.infer<typeof RalphStateSchema>;

export function ensureStateDir(): void {
  const dir = getStateDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function saveState(state: RalphState): void {
  ensureStateDir();
  writeStateFile(getStateFilePath(), state);
}

export class StateValidationError extends StateCorruptedError {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly zodError?: z.ZodError,
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = "StateValidationError";
  }
}

function backupCorruptedFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = filePath.replace(/(\.[^.]+)$/, `.corrupted-${timestamp}$1`);

  try {
    renameSync(filePath, backupPath);
  } catch (e: unknown) {
    console.warn(`Warning: Failed to backup corrupted state file: ${e}`);
  }
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
    .join("\n") || "Validation failed with no specific errors";
}

function writeStateFile(filePath: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);

  if (stateStorageOptions.compress) {
    writeFileSync(filePath, compressState(json));
    return;
  }

  writeFileSync(filePath, json);
}

function readStateFile(filePath: string): string {
  const raw = readFileSync(filePath);
  if (isGzipBuffer(raw)) {
    return decompressState(raw);
  }

  return raw.toString("utf-8");
}

function migrateState(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) {
    return raw;
  }

  const state = raw as Record<string, unknown>;

  if (!("version" in state)) {
    state["version"] = 1;
  }

  // Ensure nested supervisor objects have all required fields
  if ("supervisor" in state && state["supervisor"] !== null && typeof state["supervisor"] === "object") {
    const supervisor = state["supervisor"] as Record<string, unknown>;
    if (!("enabled" in supervisor)) supervisor["enabled"] = false;
    if (!("model" in supervisor)) supervisor["model"] = "";
    if (!("noActionPromise" in supervisor)) supervisor["noActionPromise"] = "CONTINUE";
    if (!("suggestionPromise" in supervisor)) supervisor["suggestionPromise"] = "SUGGEST";
    if (!("memoryLimit" in supervisor)) supervisor["memoryLimit"] = 50;
  }

  if ("supervisorState" in state && state["supervisorState"] !== null && typeof state["supervisorState"] === "object") {
    const supervisorState = state["supervisorState"] as Record<string, unknown>;
    if (!("enabled" in supervisorState)) supervisorState["enabled"] = false;
    if (!("pausedForDecision" in supervisorState)) supervisorState["pausedForDecision"] = false;
  }

  if ("verification" in state && state["verification"] !== null && typeof state["verification"] === "object") {
    const verification = state["verification"] as Record<string, unknown>;
    if (!("enabled" in verification)) verification["enabled"] = false;
    if (!("mode" in verification)) verification["mode"] = "on-claim";
    if (!("commands" in verification)) verification["commands"] = [];
  }

  return state;
}

export function loadState(): RalphState | null {
  const path = getStateFilePath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const raw = readStateFile(path);
    const parsed = JSON.parse(raw);

    const migrated = migrateState(parsed);

    const result = RalphStateSchema.safeParse(migrated);

    if (result.success) {
      return result.data;
    }

    backupCorruptedFile(path);

    // result.error is guaranteed when result.success === false
    const errorDetails = formatZodError(result.error);

    throw new StateValidationError(
      `State file validation failed. The corrupted file has been backed up.\n` +
      `Validation errors:\n${errorDetails}`,
      path,
      result.error,
      result.error,
    );
  } catch (e) {
    if (e instanceof StateValidationError) {
      throw e;
    }

    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    backupCorruptedFile(path);

    throw new StateValidationError(
      `Failed to load state file. The corrupted file has been backed up.\n` +
      `Error: ${e instanceof Error ? e.message : String(e)}`,
      path,
      undefined,
      e,
    );
  }
}

export function clearState(): void {
  const path = getStateFilePath();
  if (existsSync(path)) {
    try {
      require("fs").unlinkSync(path);
    } catch { }
  }
}

export function loadHistory(): RalphHistory {
  const path = getHistoryFilePath();
  if (!existsSync(path)) {
    return {
      iterations: [],
      totalDurationMs: 0,
      struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
    };
  }

  try {
    const raw = readStateFile(path);
    const parsed = JSON.parse(raw);

    const result = RalphHistorySchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    backupCorruptedFile(path);

    // result.error is guaranteed when result.success === false
    const errorDetails = formatZodError(result.error);

    throw new StateValidationError(
      `History file validation failed. The corrupted file has been backed up.\n` +
      `Validation errors:\n${errorDetails}`,
      path,
      result.error,
      result.error,
    );
  } catch (e) {
    if (e instanceof StateValidationError) {
      throw e;
    }

    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        iterations: [],
        totalDurationMs: 0,
        struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
      };
    }

    backupCorruptedFile(path);

    throw new StateValidationError(
      `Failed to load history file. The corrupted file has been backed up.\n` +
      `Error: ${e instanceof Error ? e.message : String(e)}`,
      path,
      undefined,
      e,
    );
  }
}

export function saveHistory(history: RalphHistory): void {
  ensureStateDir();

  const maxHistory = Math.max(1, stateStorageOptions.maxHistory);
  const prunedIterations = shouldPrune(history.iterations.length, { maxIterations: maxHistory })
    ? getIterationsToKeep(history.iterations, { maxIterations: maxHistory })
    : history.iterations;

  const historyToSave: RalphHistory = {
    ...history,
    iterations: prunedIterations,
  };

  writeStateFile(getHistoryFilePath(), historyToSave);
}

export function clearHistory(): void {
  const path = getHistoryFilePath();
  if (existsSync(path)) {
    try {
      require("fs").unlinkSync(path);
    } catch { }
  }
}

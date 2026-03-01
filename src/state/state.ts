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

export interface StateStorageOptions {
  compress: boolean;
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

const VerificationStepRecordSchema = z.object({
  command: z.string(),
  exitCode: z.number().int().nullable(),
  timedOut: z.boolean(),
  durationMs: z.number().int().nonnegative(),
  stdoutSnippet: z.string().optional(),
  stderrSnippet: z.string().optional(),
});

export type VerificationStepRecord = z.infer<typeof VerificationStepRecordSchema>;

const IterationVerificationRecordSchema = z.object({
  triggered: z.boolean(),
  reason: z.enum(["completion_claim", "task_completion_claim", "every_iteration"]),
  allPassed: z.boolean(),
  steps: z.array(VerificationStepRecordSchema),
});

export type IterationVerificationRecord = z.infer<typeof IterationVerificationRecordSchema>;

const IterationHistorySchema = z.object({
  iteration: z.number().int().positive(),
  startedAt: z.string(),
  endedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  model: z.string(),
  toolsUsed: z.record(z.string(), z.number().int().nonnegative()),
  filesModified: z.array(z.string()),
  exitCode: z.number(),
  completionDetected: z.boolean(),
  errors: z.array(z.string()),
  structuredOutputUsed: z.boolean().optional(),
  verification: IterationVerificationRecordSchema.optional(),
});

export type IterationHistory = z.infer<typeof IterationHistorySchema>;

const RalphHistorySchema = z.object({
  iterations: z.array(IterationHistorySchema),
  totalDurationMs: z.number().int().nonnegative(),
  struggleIndicators: z.object({
    repeatedErrors: z.record(z.string(), z.number().int().nonnegative()),
    noProgressIterations: z.number().int().nonnegative(),
    shortIterations: z.number().int().nonnegative(),
  }),
});

export type RalphHistory = z.infer<typeof RalphHistorySchema>;

const SupervisorConfigSchema = z.object({
  enabled: z.boolean().default(false),
  model: z.string().default(""),
  noActionPromise: z.string().default("CONTINUE"),
  suggestionPromise: z.string().default("SUGGEST"),
  memoryLimit: z.number().int().nonnegative().default(50),
  promptTemplate: z.string().optional(),
});

export type SupervisorConfig = z.infer<typeof SupervisorConfigSchema>;

const SupervisorStateSchema = z.object({
  enabled: z.boolean().default(false),
  pausedForDecision: z.boolean().default(false),
  pauseIteration: z.number().int().positive().optional(),
  pauseReason: z.string().optional(),
  lastRunAt: z.string().optional(),
  lastRunIteration: z.number().int().nonnegative().optional(),
});

export type SupervisorState = z.infer<typeof SupervisorStateSchema>;

const VerificationStateSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(["on-claim", "every-iteration"]).default("on-claim"),
  commands: z.array(z.string()).default([]),
  lastRunIteration: z.number().int().positive().optional(),
  lastRunPassed: z.boolean().optional(),
  lastFailureSummary: z.string().optional(),
  lastFailureDetails: z.string().optional(),
});

export type VerificationState = z.infer<typeof VerificationStateSchema>;

const RalphStateSchema = z.object({
  version: z.number().int().positive().default(1),
  active: z.boolean(),
  iteration: z.number().int().nonnegative(),
  minIterations: z.number().int().nonnegative(),
  maxIterations: z.number().int().positive(),
  completionPromise: z.string(),
  abortPromise: z.string().optional(),
  tasksMode: z.boolean().default(false),
  taskPromise: z.string(),
  prompt: z.string(),
  promptTemplate: z.string().optional(),
  startedAt: z.string(),
  model: z.string().default(""),
  supervisor: SupervisorConfigSchema.optional(),
  supervisorState: SupervisorStateSchema.optional(),
  verification: VerificationStateSchema.optional(),
});

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

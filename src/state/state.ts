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

export { getStateDir };

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
  enabled: z.boolean(),
  model: z.string(),
  noActionPromise: z.string(),
  suggestionPromise: z.string(),
  memoryLimit: z.number().int().nonnegative(),
  promptTemplate: z.string().optional(),
});

export type SupervisorConfig = z.infer<typeof SupervisorConfigSchema>;

const SupervisorStateSchema = z.object({
  enabled: z.boolean(),
  pausedForDecision: z.boolean(),
  pauseIteration: z.number().int().positive().optional(),
  pauseReason: z.string().optional(),
  lastRunAt: z.string().optional(),
  lastRunIteration: z.number().int().nonnegative().optional(),
});

export type SupervisorState = z.infer<typeof SupervisorStateSchema>;

const RalphStateSchema = z.object({
  version: z.number().int().positive().default(1),
  active: z.boolean(),
  iteration: z.number().int().nonnegative(),
  minIterations: z.number().int().nonnegative(),
  maxIterations: z.number().int().positive(),
  completionPromise: z.string(),
  abortPromise: z.string().optional(),
  tasksMode: z.boolean(),
  taskPromise: z.string(),
  prompt: z.string(),
  promptTemplate: z.string().optional(),
  startedAt: z.string(),
  model: z.string(),
  supervisor: SupervisorConfigSchema.optional(),
  supervisorState: SupervisorStateSchema.optional(),
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
  writeFileSync(getStateFilePath(), JSON.stringify(state, null, 2));
}

export class StateValidationError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly zodError?: z.ZodError
  ) {
    super(message);
    this.name = "StateValidationError";
  }
}

function backupCorruptedFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = filePath.replace(/(\.[^.]+)$/, `.corrupted-${timestamp}$1`);
  
  try {
    renameSync(filePath, backupPath);
  } catch (e) {
    console.warn(`Warning: Failed to backup corrupted state file: ${e}`);
  }
}

function migrateState(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) {
    return raw;
  }
  
  const state = raw as Record<string, unknown>;
  
  if (!("version" in state)) {
    state.version = 1;
  }
  
  return state;
}

export function loadState(): RalphState | null {
  const path = getStateFilePath();
  if (!existsSync(path)) {
    return null;
  }
  
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    
    const migrated = migrateState(parsed);
    
    const result = RalphStateSchema.safeParse(migrated);

    if (result.success) {
      return result.data;
    }

    if (!result.error) {
      backupCorruptedFile(path);
      throw new StateValidationError(
        "State file validation failed. The corrupted file has been backed up.",
        path
      );
    }

    const errorDetails = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    
    backupCorruptedFile(path);
    
    throw new StateValidationError(
      `State file validation failed. The corrupted file has been backed up.\n` +
      `Validation errors:\n${errorDetails}`,
      path,
      result.error
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
      path
    );
  }
}

export function clearState(): void {
  const path = getStateFilePath();
  if (existsSync(path)) {
    try {
      require("fs").unlinkSync(path);
    } catch {}
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
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    
    const result = RalphHistorySchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    if (!result.error) {
      backupCorruptedFile(path);
      throw new StateValidationError(
        "History file validation failed. The corrupted file has been backed up.",
        path
      );
    }

    const errorDetails = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    
    backupCorruptedFile(path);
    
    throw new StateValidationError(
      `History file validation failed. The corrupted file has been backed up.\n` +
      `Validation errors:\n${errorDetails}`,
      path,
      result.error
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
      path
    );
  }
}

export function saveHistory(history: RalphHistory): void {
  ensureStateDir();
  writeFileSync(getHistoryFilePath(), JSON.stringify(history, null, 2));
}

export function clearHistory(): void {
  const path = getHistoryFilePath();
  if (existsSync(path)) {
    try {
      require("fs").unlinkSync(path);
    } catch {}
  }
}

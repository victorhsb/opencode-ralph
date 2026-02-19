/**
 * State Management Module
 *
 * Manages Ralph loop state and history.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import {
  getStateDir,
  getStateFilePath,
  getHistoryFilePath,
} from "../config/config";

export { getStateDir };

export interface IterationHistory {
  iteration: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  model: string;
  toolsUsed: Record<string, number>;
  filesModified: string[];
  exitCode: number;
  completionDetected: boolean;
  errors: string[];
}

export interface RalphHistory {
  iterations: IterationHistory[];
  totalDurationMs: number;
  struggleIndicators: {
    repeatedErrors: Record<string, number>;
    noProgressIterations: number;
    shortIterations: number;
  };
}

export interface SupervisorConfig {
  enabled: boolean;
  model: string;
  noActionPromise: string;
  suggestionPromise: string;
  memoryLimit: number;
  promptTemplate?: string;
}

export interface SupervisorState {
  enabled: boolean;
  pausedForDecision: boolean;
  pauseIteration?: number;
  pauseReason?: string;
  lastRunAt?: string;
  lastRunIteration?: number;
}

export interface RalphState {
  active: boolean;
  iteration: number;
  minIterations: number;
  maxIterations: number;
  completionPromise: string;
  abortPromise?: string;
  tasksMode: boolean;
  taskPromise: string;
  prompt: string;
  promptTemplate?: string;
  startedAt: string;
  model: string;
  supervisor?: SupervisorConfig;
  supervisorState?: SupervisorState;
}

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

export function loadState(): RalphState | null {
  const path = getStateFilePath();
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
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
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {
      iterations: [],
      totalDurationMs: 0,
      struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
    };
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

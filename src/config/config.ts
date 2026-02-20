/**
 * Configuration Module
 *
 * Centralized configuration constants and paths for Ralph.
 */

import { join } from "path";

/**
 * Directory names
 */
export const STATE_DIR_NAME = ".ralph";

/**
 * State file names
 */
export const STATE_FILE = "ralph-loop.state.json";
export const HISTORY_FILE = "ralph-history.json";
export const CONTEXT_FILE = "ralph-context.md";
export const TASKS_FILE = "ralph-tasks.md";
export const SUPERVISOR_MEMORY_FILE = "supervisor-memory.md";
export const SUPERVISOR_SUGGESTIONS_FILE = "supervisor-suggestions.json";

/**
 * Default values
 */
export const DEFAULT_ITERATIONS = 1;
export const DEFAULT_MAX_ITERATIONS = 0; // 0 = unlimited
export const DEFAULT_COMPLETION_PROMISE = "COMPLETE";
export const DEFAULT_TASK_PROMISE = "READY_FOR_NEXT_TASK";
export const DEFAULT_SUPERVISOR_NO_ACTION_PROMISE = "NO_ACTION_NEEDED";
export const DEFAULT_SUPERVISOR_SUGGESTION_PROMISE = "USER_DECISION_REQUIRED";
export const DEFAULT_SUPERVISOR_MEMORY_LIMIT = 20;

/**
 * Timing constants
 */
export const TOOL_SUMMARY_INTERVAL_MS = 3000;
export const HEARTBEAT_INTERVAL_MS = 15 * 1000;
export const EVENT_STREAM_TIMEOUT_MS = 60 * 60 * 1000;
export const EVENT_SUBSCRIPTION_DELAY_MS = 100;
export const BETWEEN_ITERATIONS_DELAY_MS = 1000;
export const ERROR_ITERATIONS_DELAY_MS = 2000;
export const SHORT_ITERATION_THRESHOLD_MS = 30000;
export const SUPERVISOR_DECISION_POLL_INTERVAL_MS = 2000;

/**
 * Display constants
 */
export const MAX_ERRORS_TO_DISPLAY = 10;
export const MAX_TOOLS_IN_SUMMARY = 6;
export const SUPERVISOR_TRUNCATION_CHARS = 6000;
export const SUPERVISOR_MEMORY_SLICE = 10;

/**
 * Get configuration value, with optional environment variable override.
 */
function getConfig(envVar: string | undefined, defaultValue: number): number {
  if (envVar !== undefined) {
    const value = parseInt(envVar, 10);
    if (!isNaN(value)) {
      return value;
    }
  }
  return defaultValue;
}

/**
 * Get the supervisor decision poll interval.
 * Can be overridden via RALPH_SUPERVISOR_POLL_INTERVAL environment variable (for testing).
 */
export function getSupervisorPollInterval(): number {
  return getConfig(process.env.RALPH_SUPERVISOR_POLL_INTERVAL, SUPERVISOR_DECISION_POLL_INTERVAL_MS);
}

/**
 * Get paths relative to current working directory
 */
export function getStateDir(): string {
  return join(process.cwd(), STATE_DIR_NAME);
}

export function getStateFilePath(): string {
  return join(getStateDir(), STATE_FILE);
}

export function getHistoryFilePath(): string {
  return join(getStateDir(), HISTORY_FILE);
}

export function getContextFilePath(): string {
  return join(getStateDir(), CONTEXT_FILE);
}

export function getTasksFilePath(): string {
  return join(getStateDir(), TASKS_FILE);
}

export function getSupervisorMemoryFilePath(): string {
  return join(getStateDir(), SUPERVISOR_MEMORY_FILE);
}

export function getSupervisorSuggestionsFilePath(): string {
  return join(getStateDir(), SUPERVISOR_SUGGESTIONS_FILE);
}

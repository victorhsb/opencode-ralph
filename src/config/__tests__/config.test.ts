/**
 * Configuration Module Tests
 *
 * Tests for configuration constants and path helpers.
 */

import { describe, test, expect } from "bun:test";
import {
  STATE_DIR_NAME,
  STATE_FILE,
  HISTORY_FILE,
  CONTEXT_FILE,
  TASKS_FILE,
  SUPERVISOR_MEMORY_FILE,
  SUPERVISOR_SUGGESTIONS_FILE,
  DEFAULT_ITERATIONS,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_COMPLETION_PROMISE,
  DEFAULT_TASK_PROMISE,
  DEFAULT_SUPERVISOR_NO_ACTION_PROMISE,
  DEFAULT_SUPERVISOR_SUGGESTION_PROMISE,
  DEFAULT_SUPERVISOR_MEMORY_LIMIT,
  TOOL_SUMMARY_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  EVENT_STREAM_TIMEOUT_MS,
  EVENT_SUBSCRIPTION_DELAY_MS,
  BETWEEN_ITERATIONS_DELAY_MS,
  ERROR_ITERATIONS_DELAY_MS,
  SHORT_ITERATION_THRESHOLD_MS,
  SUPERVISOR_DECISION_POLL_INTERVAL_MS,
  MAX_ERRORS_TO_DISPLAY,
  MAX_TOOLS_IN_SUMMARY,
  SUPERVISOR_TRUNCATION_CHARS,
  SUPERVISOR_MEMORY_SLICE,
  getSupervisorPollInterval,
  getStateDir,
  getStateFilePath,
  getHistoryFilePath,
  getContextFilePath,
  getTasksFilePath,
  getSupervisorMemoryFilePath,
  getSupervisorSuggestionsFilePath,
} from "../config";

describe("Configuration constants", () => {
  test("STATE_DIR_NAME is correct", () => {
    expect(STATE_DIR_NAME).toBe(".ralph");
  });

  test("State file names are correct", () => {
    expect(STATE_FILE).toBe("ralph-loop.state.json");
    expect(HISTORY_FILE).toBe("ralph-history.json");
    expect(CONTEXT_FILE).toBe("ralph-context.md");
    expect(TASKS_FILE).toBe("ralph-tasks.md");
    expect(SUPERVISOR_MEMORY_FILE).toBe("supervisor-memory.md");
    expect(SUPERVISOR_SUGGESTIONS_FILE).toBe("supervisor-suggestions.json");
  });

  test("Default iteration values are correct", () => {
    expect(DEFAULT_ITERATIONS).toBe(1);
    expect(DEFAULT_MAX_ITERATIONS).toBe(0);
  });

  test("Default promise values are correct", () => {
    expect(DEFAULT_COMPLETION_PROMISE).toBe("COMPLETE");
    expect(DEFAULT_TASK_PROMISE).toBe("READY_FOR_NEXT_TASK");
    expect(DEFAULT_SUPERVISOR_NO_ACTION_PROMISE).toBe("NO_ACTION_NEEDED");
    expect(DEFAULT_SUPERVISOR_SUGGESTION_PROMISE).toBe("USER_DECISION_REQUIRED");
  });

  test("DEFAULT_SUPERVISOR_MEMORY_LIMIT is correct", () => {
    expect(DEFAULT_SUPERVISOR_MEMORY_LIMIT).toBe(20);
  });

  test("Timing constants are correct", () => {
    expect(TOOL_SUMMARY_INTERVAL_MS).toBe(3000);
    expect(HEARTBEAT_INTERVAL_MS).toBe(10000);
    expect(EVENT_STREAM_TIMEOUT_MS).toBe(30000);
    expect(EVENT_SUBSCRIPTION_DELAY_MS).toBe(100);
    expect(BETWEEN_ITERATIONS_DELAY_MS).toBe(1000);
    expect(ERROR_ITERATIONS_DELAY_MS).toBe(2000);
    expect(SHORT_ITERATION_THRESHOLD_MS).toBe(30000);
    expect(SUPERVISOR_DECISION_POLL_INTERVAL_MS).toBe(2000);
  });

  test("Display constants are correct", () => {
    expect(MAX_ERRORS_TO_DISPLAY).toBe(10);
    expect(MAX_TOOLS_IN_SUMMARY).toBe(6);
    expect(SUPERVISOR_TRUNCATION_CHARS).toBe(6000);
    expect(SUPERVISOR_MEMORY_SLICE).toBe(10);
  });
});

describe("getSupervisorPollInterval", () => {
  test("returns default value when env var not set", () => {
    const defaultInterval = getSupervisorPollInterval();
    expect(defaultInterval).toBe(SUPERVISOR_DECISION_POLL_INTERVAL_MS);
  });

  test("returns value from env var when set", () => {
    const originalValue = process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
    try {
      process.env.RALPH_SUPERVISOR_POLL_INTERVAL = "5000";
      const interval = getSupervisorPollInterval();
      expect(interval).toBe(5000);
    } finally {
      if (originalValue !== undefined) {
        process.env.RALPH_SUPERVISOR_POLL_INTERVAL = originalValue;
      } else {
        delete process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
      }
    }
  });

  test("handles env var as string", () => {
    const originalValue = process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
    try {
      process.env.RALPH_SUPERVISOR_POLL_INTERVAL = "1000";
      const interval = getSupervisorPollInterval();
      expect(interval).toBe(1000);
    } finally {
      if (originalValue !== undefined) {
        process.env.RALPH_SUPERVISOR_POLL_INTERVAL = originalValue;
      } else {
        delete process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
      }
    }
  });

  test("returns default when env var is invalid", () => {
    const originalValue = process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
    try {
      process.env.RALPH_SUPERVISOR_POLL_INTERVAL = "invalid";
      const interval = getSupervisorPollInterval();
      expect(interval).toBe(SUPERVISOR_DECISION_POLL_INTERVAL_MS);
    } finally {
      if (originalValue !== undefined) {
        process.env.RALPH_SUPERVISOR_POLL_INTERVAL = originalValue;
      } else {
        delete process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
      }
    }
  });

  test("handles env var with negative value", () => {
    const originalValue = process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
    try {
      process.env.RALPH_SUPERVISOR_POLL_INTERVAL = "-100";
      const interval = getSupervisorPollInterval();
      expect(interval).toBe(-100);
    } finally {
      if (originalValue !== undefined) {
        process.env.RALPH_SUPERVISOR_POLL_INTERVAL = originalValue;
      } else {
        delete process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
      }
    }
  });

  test("handles env var with zero value", () => {
    const originalValue = process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
    try {
      process.env.RALPH_SUPERVISOR_POLL_INTERVAL = "0";
      const interval = getSupervisorPollInterval();
      expect(interval).toBe(0);
    } finally {
      if (originalValue !== undefined) {
        process.env.RALPH_SUPERVISOR_POLL_INTERVAL = originalValue;
      } else {
        delete process.env.RALPH_SUPERVISOR_POLL_INTERVAL;
      }
    }
  });
});

describe("Path helper functions", () => {
  test("getStateDir returns correct path", () => {
    const stateDir = getStateDir();
    expect(stateDir).toContain(STATE_DIR_NAME);
    expect(stateDir).toContain(process.cwd());
  });

  test("getStateFilePath returns correct path", () => {
    const filePath = getStateFilePath();
    expect(filePath).toContain(STATE_DIR_NAME);
    expect(filePath).toContain(STATE_FILE);
  });

  test("getHistoryFilePath returns correct path", () => {
    const filePath = getHistoryFilePath();
    expect(filePath).toContain(STATE_DIR_NAME);
    expect(filePath).toContain(HISTORY_FILE);
  });

  test("getContextFilePath returns correct path", () => {
    const filePath = getContextFilePath();
    expect(filePath).toContain(STATE_DIR_NAME);
    expect(filePath).toContain(CONTEXT_FILE);
  });

  test("getTasksFilePath returns correct path", () => {
    const filePath = getTasksFilePath();
    expect(filePath).toContain(STATE_DIR_NAME);
    expect(filePath).toContain(TASKS_FILE);
  });

  test("getSupervisorMemoryFilePath returns correct path", () => {
    const filePath = getSupervisorMemoryFilePath();
    expect(filePath).toContain(STATE_DIR_NAME);
    expect(filePath).toContain(SUPERVISOR_MEMORY_FILE);
  });

  test("getSupervisorSuggestionsFilePath returns correct path", () => {
    const filePath = getSupervisorSuggestionsFilePath();
    expect(filePath).toContain(STATE_DIR_NAME);
    expect(filePath).toContain(SUPERVISOR_SUGGESTIONS_FILE);
  });

  test("all path helpers return consistent state directory", () => {
    const stateDir = getStateDir();
    const stateFilePath = getStateFilePath();
    const historyFilePath = getHistoryFilePath();

    expect(stateFilePath).toContain(stateDir);
    expect(historyFilePath).toContain(stateDir);
  });

  test("all paths include process.cwd()", () => {
    const cwd = process.cwd();
    const stateDir = getStateDir();
    const stateFilePath = getStateFilePath();

    expect(stateDir).toContain(cwd);
    expect(stateFilePath).toContain(cwd);
  });
});

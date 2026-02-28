/**
 * State Management Module Tests
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  RalphState,
  RalphHistory,
  loadState,
  saveState,
  loadHistory,
  saveHistory,
  clearState,
  clearHistory,
  StateValidationError,
} from "../state";
import { getStateFilePath, getHistoryFilePath } from "../../config/config";
import { existsSync, writeFileSync, readdirSync } from "fs";

describe("state validation", () => {
  beforeEach(() => {
    clearState();
    clearHistory();
  });

  afterEach(() => {
    clearState();
    clearHistory();
  });

  describe("loadState", () => {
    test("returns null when state file does not exist", () => {
      const result = loadState();
      expect(result).toBeNull();
    });

    test("loads valid state", () => {
      const validState: RalphState = {
        version: 1,
        active: false,
        iteration: 5,
        minIterations: 1,
        maxIterations: 20,
        completionPromise: "DONE",
        tasksMode: false,
        taskPromise: "TASK_COMPLETE",
        prompt: "test prompt",
        startedAt: new Date().toISOString(),
        model: "test-model",
        supervisor: {
          enabled: true,
          model: "test-model",
          noActionPromise: "no-action",
          suggestionPromise: "suggestion",
          memoryLimit: 50,
        },
      };
      saveState(validState);
      const result = loadState();
      expect(result).not.toBeNull();
      expect(result?.iteration).toBe(5);
    });

    test("throws StateValidationError for corrupted JSON", () => {
      writeFileSync(getStateFilePath(), "{ invalid json }");
      
      expect(() => loadState()).toThrow(StateValidationError);
    });

    test("throws StateValidationError for missing required fields", () => {
      writeFileSync(getStateFilePath(), JSON.stringify({
        version: 1,
        active: false,
      }));
      
      expect(() => loadState()).toThrow(StateValidationError);
    });

    test("backs up corrupted state file", () => {
      writeFileSync(getStateFilePath(), "{ invalid }");
      
      try {
        loadState();
      } catch (e) {
      }
      
      expect(existsSync(getStateFilePath())).toBe(false);
      const dir = getStateFilePath().replace(/\/[^/]+$/, "");
      const files = readdirSync(dir);
      const backupFile = files.find((f: string) => f.includes(".corrupted-"));
      expect(backupFile).toBeDefined();
    });

    test("migrates state without version field", () => {
      const stateWithoutVersion = {
        active: false,
        iteration: 3,
        minIterations: 1,
        maxIterations: 10,
        completionPromise: "DONE",
        tasksMode: false,
        taskPromise: "TASK_COMPLETE",
        prompt: "test",
        startedAt: new Date().toISOString(),
        model: "test-model",
      };
      writeFileSync(getStateFilePath(), JSON.stringify(stateWithoutVersion));
      
      const result = loadState();
      expect(result).not.toBeNull();
      expect(result?.version).toBe(1);
    });

    test("migrates state with missing fields", () => {
      const partialState = {
        active: true,
        iteration: 3,
        minIterations: 1,
        maxIterations: 10,
        completionPromise: "DONE",
        taskPromise: "READY",
        prompt: "test prompt",
        startedAt: new Date().toISOString(),
        // Missing: tasksMode, model
        supervisor: {
          // Missing: enabled, model, etc.
          noActionPromise: "NO_ACTION",
          suggestionPromise: "SUGGEST_ACTION",
          memoryLimit: 100,
        },
        supervisorState: {
          // Missing: enabled, only has pausedForDecision
          pausedForDecision: true,
        },
      };
      writeFileSync(getStateFilePath(), JSON.stringify(partialState));

      const result = loadState();
      expect(result).not.toBeNull();
      expect(result?.version).toBe(1);

      // Verify missing top-level fields have defaults
      expect(result?.tasksMode).toBe(false);
      expect(result?.model).toBe("");

      // Verify supervisor fields have defaults
      expect(result?.supervisor).toBeDefined();
      expect(result?.supervisor?.enabled).toBe(false);
      expect(result?.supervisor?.model).toBe("");
      expect(result?.supervisor?.noActionPromise).toBe("NO_ACTION"); // preserved from partial
      expect(result?.supervisor?.suggestionPromise).toBe("SUGGEST_ACTION"); // preserved from partial
      expect(result?.supervisor?.memoryLimit).toBe(100); // preserved from partial

      // Verify supervisorState fields have defaults
      expect(result?.supervisorState).toBeDefined();
      expect(result?.supervisorState?.enabled).toBe(false);
      expect(result?.supervisorState?.pausedForDecision).toBe(true); // preserved from partial
    });

    test("migrates partial verification state fields", () => {
      const partialState = {
        version: 1,
        active: true,
        iteration: 2,
        minIterations: 1,
        maxIterations: 10,
        completionPromise: "DONE",
        taskPromise: "READY",
        prompt: "test prompt",
        startedAt: new Date().toISOString(),
        model: "test-model",
        verification: {
          enabled: true,
        },
      };
      writeFileSync(getStateFilePath(), JSON.stringify(partialState));

      const result = loadState();
      expect(result?.verification).toBeDefined();
      expect(result?.verification?.enabled).toBe(true);
      expect(result?.verification?.mode).toBe("on-claim");
      expect(result?.verification?.commands).toEqual([]);
    });
  });

  describe("loadHistory", () => {
    test("returns empty history when file does not exist", () => {
      const result = loadHistory();
      expect(result.iterations).toEqual([]);
      expect(result.totalDurationMs).toBe(0);
    });

    test("loads valid history", () => {
      const validHistory: RalphHistory = {
        iterations: [{
          iteration: 1,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: 1000,
          model: "test-model",
          toolsUsed: {},
          filesModified: [],
          exitCode: 0,
          completionDetected: false,
          errors: [],
          verification: {
            triggered: true,
            reason: "completion_claim",
            allPassed: false,
            steps: [
              {
                command: "bun test",
                exitCode: 1,
                timedOut: false,
                durationMs: 1234,
                stderrSnippet: "fail",
              },
            ],
          },
        }],
        totalDurationMs: 1000,
        struggleIndicators: {
          repeatedErrors: {},
          noProgressIterations: 0,
          shortIterations: 0,
        },
      };
      saveHistory(validHistory);
      const result = loadHistory();
      expect(result.iterations).toHaveLength(1);
      expect(result.totalDurationMs).toBe(1000);
      expect(result.iterations[0]?.verification?.allPassed).toBe(false);
    });

    test("throws StateValidationError for corrupted JSON", () => {
      writeFileSync(getHistoryFilePath(), "{ invalid json }");
      
      expect(() => loadHistory()).toThrow(StateValidationError);
    });

    test("throws StateValidationError for invalid history structure", () => {
      writeFileSync(getHistoryFilePath(), JSON.stringify({
        iterations: "not-an-array",
      }));
      
      expect(() => loadHistory()).toThrow(StateValidationError);
    });

    test("backs up corrupted history file", () => {
      writeFileSync(getHistoryFilePath(), "{ invalid }");
      
      try {
        loadHistory();
      } catch (e) {
      }
      
      expect(existsSync(getHistoryFilePath())).toBe(false);
      const dir = getHistoryFilePath().replace(/\/[^/]+$/, "");
      const files = readdirSync(dir);
      const backupFile = files.find((f: string) => f.includes(".corrupted-"));
      expect(backupFile).toBeDefined();
    });
  });

  describe("StateValidationError", () => {
    test("includes file path", () => {
      const error = new StateValidationError("test error", "/path/to/file");
      expect(error.filePath).toBe("/path/to/file");
      expect(error.name).toBe("StateValidationError");
    });

    test("includes ZodError when provided", () => {
      const { ZodError } = require("zod");
      const zodError = new ZodError([]);
      const error = new StateValidationError("test error", "/path", zodError);
      expect(error.zodError).toBe(zodError);
    });
  });

  describe("saveState and saveHistory", () => {
    test("saves and loads state correctly", () => {
      const state: RalphState = {
        version: 1,
        active: true,
        iteration: 10,
        minIterations: 1,
        maxIterations: 20,
        completionPromise: "DONE",
        tasksMode: false,
        taskPromise: "TASK_COMPLETE",
        prompt: "test prompt",
        startedAt: new Date().toISOString(),
        model: "test-model",
        verification: {
          enabled: true,
          mode: "on-claim",
          commands: ["bun test"],
          lastRunIteration: 9,
          lastRunPassed: false,
          lastFailureSummary: "failed",
        },
      };
      saveState(state);
      const loaded = loadState();
      expect(loaded?.iteration).toBe(10);
      expect(loaded?.active).toBe(true);
      expect(loaded?.verification?.commands).toEqual(["bun test"]);
    });

    test("saves and loads history correctly", () => {
      const history: RalphHistory = {
        iterations: [],
        totalDurationMs: 5000,
        struggleIndicators: {
          repeatedErrors: {},
          noProgressIterations: 0,
          shortIterations: 0,
        },
      };
      saveHistory(history);
      const loaded = loadHistory();
      expect(loaded.totalDurationMs).toBe(5000);
    });
  });

  describe("clearState and clearHistory", () => {
    test("clears state file", () => {
      const state: RalphState = {
        version: 1,
        active: false,
        iteration: 1,
        minIterations: 1,
        maxIterations: 10,
        completionPromise: "DONE",
        tasksMode: false,
        taskPromise: "TASK_COMPLETE",
        prompt: "test",
        startedAt: new Date().toISOString(),
        model: "test-model",
      };
      saveState(state);
      expect(loadState()).not.toBeNull();
      
      clearState();
      expect(loadState()).toBeNull();
    });

    test("clears history file", () => {
      const history: RalphHistory = {
        iterations: [],
        totalDurationMs: 1000,
        struggleIndicators: {
          repeatedErrors: {},
          noProgressIterations: 0,
          shortIterations: 0,
        },
      };
      saveHistory(history);
      clearHistory();
      
      const loaded = loadHistory();
      expect(loaded.iterations).toEqual([]);
      expect(loaded.totalDurationMs).toBe(0);
    });
  });
});

import { describe, expect, test } from "bun:test";
import {
  ConfigError,
  LoopError,
  RalphError,
  SdkInitError,
  StateCorruptedError,
  TaskError,
  ValidationError,
  normalizeError,
} from "../index";
import { getUserFriendlyMessage } from "../messages";

describe("error hierarchy", () => {
  test("all typed errors extend RalphError", () => {
    expect(new SdkInitError("sdk") instanceof RalphError).toBe(true);
    expect(new ValidationError("validation") instanceof RalphError).toBe(true);
    expect(new StateCorruptedError("state") instanceof RalphError).toBe(true);
    expect(new ConfigError("config") instanceof RalphError).toBe(true);
    expect(new TaskError("task") instanceof RalphError).toBe(true);
    expect(new LoopError("loop") instanceof RalphError).toBe(true);
  });

  test("typed errors expose stable error codes", () => {
    expect(new SdkInitError("sdk").code).toBe("SDK_INIT_FAILED");
    expect(new ValidationError("validation").code).toBe("VALIDATION_FAILED");
    expect(new StateCorruptedError("state").code).toBe("STATE_CORRUPTED");
    expect(new ConfigError("config").code).toBe("CONFIG_ERROR");
    expect(new TaskError("task").code).toBe("TASK_ERROR");
    expect(new LoopError("loop").code).toBe("LOOP_ERROR");
  });

  test("preserves cause when provided", () => {
    const cause = new Error("root cause");
    const err = new SdkInitError("sdk failed", cause);
    expect(err.cause).toBe(cause);
  });
});

describe("user-friendly message mapper", () => {
  test("maps known errors to end-user messages", () => {
    const err = new ValidationError("raw internal validation details");
    expect(getUserFriendlyMessage(err)).toContain("Invalid input provided");
  });

  test("falls back to original message for unknown code", () => {
    const err = new RalphError("fallback message", "LOOP_ERROR");
    expect(getUserFriendlyMessage(err)).toContain("execution error");
  });
});

describe("error normalization", () => {
  test("returns RalphError unchanged", () => {
    const err = new TaskError("task failure");
    expect(normalizeError(err)).toBe(err);
  });

  test("wraps Error as LoopError", () => {
    const err = normalizeError(new Error("boom"));
    expect(err instanceof LoopError).toBe(true);
    expect(err.message).toBe("boom");
  });

  test("wraps non-Error values", () => {
    const err = normalizeError("boom");
    expect(err instanceof LoopError).toBe(true);
    expect(err.message).toBe("boom");
  });
});

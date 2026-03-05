import { describe, expect, test } from "bun:test";
import { runVerification } from "../runner";

describe("runVerification", () => {
  test("runs a single passing command", async () => {
    const result = await runVerification({
      commands: ["true"],
      timeoutMs: 1000,
      failFast: true,
      maxOutputChars: 4000,
      reason: "completion_claim",
    });

    expect(result.triggered).toBe(true);
    expect(result.allPassed).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.exitCode).toBe(0);
    expect(result.steps[0]?.timedOut).toBe(false);
  });

  test("records a failing command", async () => {
    const result = await runVerification({
      commands: ["printf 'boom' 1>&2; exit 7"],
      timeoutMs: 1000,
      failFast: true,
      maxOutputChars: 4000,
      reason: "completion_claim",
    });

    expect(result.allPassed).toBe(false);
    expect(result.steps[0]?.exitCode).toBe(7);
    expect(result.steps[0]?.stderrSnippet).toContain("boom");
  });

  test("preserves command order", async () => {
    const result = await runVerification({
      commands: ["printf first", "printf second"],
      timeoutMs: 1000,
      failFast: true,
      maxOutputChars: 4000,
      reason: "every_iteration",
    });

    expect(result.steps.map((s) => s.command)).toEqual(["printf first", "printf second"]);
  });

  test("stops on first failure when failFast is enabled", async () => {
    const result = await runVerification({
      commands: ["false", "printf should-not-run"],
      timeoutMs: 1000,
      failFast: true,
      maxOutputChars: 4000,
      reason: "completion_claim",
    });

    expect(result.steps).toHaveLength(1);
  });

  test("continues after failure when failFast is disabled", async () => {
    const result = await runVerification({
      commands: ["false", "printf ok"],
      timeoutMs: 1000,
      failFast: false,
      maxOutputChars: 4000,
      reason: "completion_claim",
    });

    expect(result.steps).toHaveLength(2);
    expect(result.steps[1]?.stdoutSnippet).toContain("ok");
  });

  test("marks timeout and failed step", async () => {
    const result = await runVerification({
      commands: ["sleep 0.2"],
      timeoutMs: 50,
      failFast: true,
      maxOutputChars: 4000,
      reason: "every_iteration",
    });

    expect(result.allPassed).toBe(false);
    expect(result.steps[0]?.timedOut).toBe(true);
    expect(result.steps[0]?.exitCode).toBeNull();
  });

  test("truncates output snippets to configured length", async () => {
    const result = await runVerification({
      commands: ["printf '0123456789abcdef'"],
      timeoutMs: 1000,
      failFast: true,
      maxOutputChars: 4,
      reason: "every_iteration",
    });

    expect(result.steps[0]?.stdoutSnippet).toBe("cdef");
  });
});

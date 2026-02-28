import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const RALPH_PATH = join(import.meta.dir, "..", "ralph.ts");

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "ralph-test-"));
}

function runRalphSync(cwd: string, args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawnSync(["bun", "run", RALPH_PATH, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

function fakeSdkEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    RALPH_FAKE_SDK: "1",
    RALPH_FAKE_OUTPUT: "<promise>COMPLETE</promise>",
    ...overrides,
  };
}

describe("supervisor cli", () => {
  test("rejects invalid supervisor-memory-limit", () => {
    const cwd = makeTempDir();
    const res = runRalphSync(cwd, ["--supervisor-memory-limit", "0", "-p", "test", "--dry-run"]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("--supervisor-memory-limit must be greater than 0");
  });

  test("approves suggestion and applies add_task", () => {
    const cwd = makeTempDir();
    const ralphDir = join(cwd, ".ralph");
    mkdirSync(ralphDir, { recursive: true });

    const suggestionFile = join(ralphDir, "supervisor-suggestions.json");
    writeFileSync(
      suggestionFile,
      JSON.stringify(
        {
          suggestions: [
            {
              id: "sup-1",
              iteration: 1,
              kind: "add_task",
              title: "Add docs",
              details: "Need docs task",
              proposedChanges: { task: "Document supervisor behavior" },
              status: "pending",
              createdAt: new Date().toISOString(),
            },
          ],
        },
        null,
        2,
      ),
    );

    const res = runRalphSync(cwd, ["suggestion", "approve", "sup-1"]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("approved and applied");

    const tasks = readFileSync(join(ralphDir, "ralph-tasks.md"), "utf-8");
    expect(tasks).toContain("- [ ] Document supervisor behavior");

    const updated = JSON.parse(readFileSync(suggestionFile, "utf-8"));
    expect(updated.suggestions[0].status).toBe("applied");
  });

  test("rejects suggestion", () => {
    const cwd = makeTempDir();
    const ralphDir = join(cwd, ".ralph");
    mkdirSync(ralphDir, { recursive: true });

    const suggestionFile = join(ralphDir, "supervisor-suggestions.json");
    writeFileSync(
      suggestionFile,
      JSON.stringify(
        {
          suggestions: [
            {
              id: "sup-2",
              iteration: 2,
              kind: "add_context",
              title: "Add hint",
              details: "Need hint",
              proposedChanges: { context: "Try parser refactor" },
              status: "pending",
              createdAt: new Date().toISOString(),
            },
          ],
        },
        null,
        2,
      ),
    );

    const res = runRalphSync(cwd, ["suggestion", "reject", "sup-2"]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("rejected");

    const updated = JSON.parse(readFileSync(suggestionFile, "utf-8"));
    expect(updated.suggestions[0].status).toBe("rejected");
  });

  test("supervisor disabled does not create supervisor files", () => {
    const cwd = makeTempDir();
    const events = [{ type: "session.idle" }];

    const res = runRalphSync(
      cwd,
      ["-p", "Simple task", "-x", "1", "--no-commit"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);

    const suggestionsPath = join(cwd, ".ralph", "supervisor-suggestions.json");
    expect(existsSync(suggestionsPath)).toBe(false);
  }, 15000);
});

describe("verification cli", () => {
  test("rejects invalid verify-mode", () => {
    const cwd = makeTempDir();
    const res = runRalphSync(cwd, ["--verify-mode", "sometimes", "-p", "test", "--dry-run"]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("--verify-mode must be one of");
  });

  test("rejects invalid verify-timeout-ms", () => {
    const cwd = makeTempDir();
    const res = runRalphSync(cwd, ["--verify-timeout-ms", "0", "-p", "test", "--dry-run"]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("--verify-timeout-ms must be greater than 0");
  });

  test("rejects invalid verify-max-output-chars", () => {
    const cwd = makeTempDir();
    const res = runRalphSync(cwd, ["--verify-max-output-chars", "199", "-p", "test", "--dry-run"]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("--verify-max-output-chars must be at least 200");
  });

  test("dry-run prints verification configuration", () => {
    const cwd = makeTempDir();
    const res = runRalphSync(cwd, ["-p", "test", "--dry-run", "--verify", "true", "--verify", "printf ok"]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("VERIFICATION CONFIG");
    expect(res.stdout).toContain("Mode: on-claim");
    expect(res.stdout).toContain("- true");
    expect(res.stdout).toContain("- printf ok");
  });

  test("completion is accepted when verification passes", () => {
    const cwd = makeTempDir();
    const res = runRalphSync(
      cwd,
      ["-p", "Simple task", "-x", "1", "--no-commit", "--verify", "true"],
      fakeSdkEnv(),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("Running verification");
    expect(res.stdout).toContain("Verification passed");
    expect(res.stdout).toContain("Completion promise detected");
  }, 15000);

  test("completion is rejected and loop continues when verification fails", () => {
    const cwd = makeTempDir();
    const res = runRalphSync(
      cwd,
      ["-p", "Simple task", "-x", "1", "--no-commit", "--verify", "false"],
      fakeSdkEnv(),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("Running verification");
    expect(res.stdout).toContain("Verification failed");
    expect(res.stdout).toContain("Completion claim rejected");
    expect(res.stdout).toContain("Max iterations (1) reached");
  }, 15000);

  test("status shows verification config and recent verify marker", () => {
    const cwd = makeTempDir();
    const ralphDir = join(cwd, ".ralph");
    mkdirSync(ralphDir, { recursive: true });

    writeFileSync(
      join(ralphDir, "ralph-loop.state.json"),
      JSON.stringify(
        {
          version: 1,
          active: true,
          iteration: 2,
          minIterations: 1,
          maxIterations: 5,
          completionPromise: "COMPLETE",
          tasksMode: false,
          taskPromise: "READY",
          prompt: "test prompt",
          startedAt: new Date().toISOString(),
          model: "fake/model",
          verification: {
            enabled: true,
            mode: "on-claim",
            commands: ["bun test"],
            lastRunIteration: 1,
            lastRunPassed: false,
            lastFailureSummary: "Verification failed: exit 1 for \"bun test\"",
          },
        },
        null,
        2,
      ),
    );

    writeFileSync(
      join(ralphDir, "ralph-history.json"),
      JSON.stringify(
        {
          iterations: [
            {
              iteration: 1,
              startedAt: new Date().toISOString(),
              endedAt: new Date().toISOString(),
              durationMs: 1000,
              model: "fake/model",
              toolsUsed: {},
              filesModified: [],
              exitCode: 0,
              completionDetected: true,
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
                    durationMs: 1000,
                    stderrSnippet: "fail",
                  },
                ],
              },
            },
          ],
          totalDurationMs: 1000,
          struggleIndicators: {
            repeatedErrors: {},
            noProgressIterations: 0,
            shortIterations: 0,
          },
        },
        null,
        2,
      ),
    );

    const res = runRalphSync(cwd, ["status"]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("Verify:       ENABLED");
    expect(res.stdout).toContain("Verify Mode:  on-claim");
    expect(res.stdout).toContain("Verify Last:  #1 FAIL");
    expect(res.stdout).toContain("verify:FAIL");
  });
});

describe("streamed CLI output", () => {
  test("shows compact tool summary when tool events stream", () => {
    const cwd = makeTempDir();
    const events = [
      {
        type: "message.part.updated",
        properties: {
          part: { type: "tool", tool: "read", state: { status: "running" } },
        },
      },
      {
        type: "message.part.updated",
        properties: {
          part: { type: "tool", tool: "edit", state: { status: "running" } },
        },
      },
      { type: "session.idle" },
    ];

    const res = runRalphSync(
      cwd,
      ["-p", "Simple task", "-x", "1", "--no-commit"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("| Tools");
    expect(res.stdout).toMatch(/read\s+[1-9]/);
    expect(res.stdout).toMatch(/edit\s+[1-9]/);
  }, 15000);

  test("shows per-tool lines with --verbose-tools", () => {
    const cwd = makeTempDir();
    const events = [
      {
        type: "message.part.updated",
        properties: {
          part: { type: "tool", tool: "bash", state: { status: "running" } },
        },
      },
      { type: "session.idle" },
    ];

    const res = runRalphSync(
      cwd,
      ["-p", "Simple task", "-x", "1", "--no-commit", "--verbose-tools"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("🔧 bash...");
  }, 15000);

  test("does not render streamed tool lines with --no-stream", () => {
    const cwd = makeTempDir();
    const events = [
      {
        type: "message.part.delta",
        properties: {
          field: "text",
          delta: "stream only text\n",
        },
      },
      {
        type: "message.part.updated",
        properties: {
          part: { type: "tool", tool: "read", state: { status: "running" } },
        },
      },
      { type: "session.idle" },
    ];

    const res = runRalphSync(
      cwd,
      ["-p", "Simple task", "-x", "1", "--no-commit", "-n"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("| Tools");
    expect(res.stdout).not.toContain("🔧 read...");
    expect(res.stdout).not.toContain("stream only text");
  }, 15000);

  test("renders text deltas and tool usage in same run", () => {
    const cwd = makeTempDir();
    const events = [
      {
        type: "message.part.delta",
        properties: {
          field: "text",
          delta: "thinking line\n",
        },
      },
      {
        type: "message.part.updated",
        properties: {
          part: { type: "tool", tool: "glob", state: { status: "running" } },
        },
      },
      { type: "session.idle" },
    ];

    const res = runRalphSync(
      cwd,
      ["-p", "Simple task", "-x", "1", "--no-commit"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("thinking line");
    expect(res.stdout).toContain("| Tools");
    expect(res.stdout).toContain("glob 1");
  }, 15000);

  test("shows tool result details with file paths", () => {
    const cwd = makeTempDir();
    const events = [
      {
        type: "message.part.updated",
        properties: {
          part: {
            type: "tool",
            tool: "read",
            state: { status: "running" }
          },
        },
      },
      {
        type: "message.part.updated",
        properties: {
          part: {
            type: "tool",
            tool: "read",
            state: {
              status: "completed",
              input: { filePath: "/test/file.txt" },
              output: "line 1\nline 2\nline 3",
              title: "Read file"
            }
          },
        },
      },
      { type: "session.idle" },
    ];

    const res = runRalphSync(
      cwd,
      ["-p", "Simple task", "-x", "1", "--no-commit"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("🔧 read...");
    expect(res.stdout).toContain("/test/file.txt");
    expect(res.stdout).toContain("✓ read");
  }, 15000);

  test("suppresses tool details with --silent flag", () => {
    const cwd = makeTempDir();
    const events = [
      {
        type: "message.part.updated",
        properties: {
          part: { type: "tool", tool: "read", state: { status: "running" } },
        },
      },
      {
        type: "message.part.updated",
        properties: {
          part: {
            type: "tool",
            tool: "read",
            state: {
              status: "completed",
              input: { filePath: "/test/file.txt" },
              output: "content"
            }
          },
        },
      },
      { type: "session.idle" },
    ];

    const res = runRalphSync(
      cwd,
      ["-p", "Simple task", "-x", "1", "--no-commit", "--silent"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).not.toContain("🔧 read...");
    expect(res.stdout).not.toContain("/test/file.txt");
    expect(res.stdout).not.toContain("✓ read");
  }, 15000);
});

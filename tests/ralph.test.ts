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
    const res = runRalphSync(cwd, ["task", "--supervisor-memory-limit", "0"]);
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

    const res = runRalphSync(cwd, ["--approve-suggestion", "sup-1"]);
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

    const res = runRalphSync(cwd, ["--reject-suggestion", "sup-2"]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("rejected");

    const updated = JSON.parse(readFileSync(suggestionFile, "utf-8"));
    expect(updated.suggestions[0].status).toBe("rejected");
  });

  test("supervisor disabled does not create supervisor files", () => {
    const cwd = makeTempDir();

    const res = runRalphSync(cwd, ["Simple task", "--max-iterations", "1", "--no-commit", "--no-stream"], fakeSdkEnv());

    expect(res.exitCode).toBe(0);
    expect(existsSync(join(cwd, ".ralph", "supervisor-suggestions.json"))).toBe(false);
    expect(existsSync(join(cwd, ".ralph", "supervisor-memory.md"))).toBe(false);
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
      ["Simple task", "--max-iterations", "1", "--no-commit"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("| Tools");
    expect(res.stdout).toMatch(/read\s+[1-9]/);
    expect(res.stdout).toMatch(/edit\s+[1-9]/);
  });

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
      ["Simple task", "--max-iterations", "1", "--no-commit", "--verbose-tools"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("🔧 bash...");
  });

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
      ["Simple task", "--max-iterations", "1", "--no-commit", "--no-stream"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("| Tools");
    expect(res.stdout).not.toContain("🔧 read...");
    expect(res.stdout).not.toContain("stream only text");
  });

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
      ["Simple task", "--max-iterations", "1", "--no-commit"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("thinking line");
    expect(res.stdout).toContain("| Tools");
    expect(res.stdout).toContain("glob 1");
  });

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
      ["Simple task", "--max-iterations", "1", "--no-commit"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("🔧 read...");
    expect(res.stdout).toContain("/test/file.txt");
    expect(res.stdout).toContain("✓ read");
  });

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
      ["Simple task", "--max-iterations", "1", "--no-commit", "--silent"],
      fakeSdkEnv({
        RALPH_FAKE_EVENTS_JSON: JSON.stringify(events),
      }),
    );

    expect(res.exitCode).toBe(0);
    expect(res.stdout).not.toContain("🔧 read...");
    expect(res.stdout).not.toContain("/test/file.txt");
    expect(res.stdout).not.toContain("✓ read");
  });
});

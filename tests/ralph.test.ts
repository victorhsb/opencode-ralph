import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const RALPH_PATH = "/Users/torugo/go/src/github.com/victorhsb/open-ralph-wiggum/ralph.ts";

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

function writeMockAgent(path: string, script: string): void {
  writeFileSync(path, script);
  chmodSync(path, 0o755);
}

async function waitFor(condition: () => boolean, timeoutMs = 12000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("timeout waiting for condition");
    }
    await new Promise(r => setTimeout(r, 100));
  }
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

  test("completion is gated by supervisor suggestions until user decision", async () => {
    const cwd = makeTempDir();
    const marker = join(cwd, "supervisor.once");
    const agentPath = join(cwd, "mock-agent.sh");

    writeMockAgent(
      agentPath,
      `#!/bin/sh
all="$*"
if echo "$all" | grep -q "Ralph Supervisor"; then
  if [ -f "$SUP_MARKER" ]; then
    echo "<promise>NO_ACTION_NEEDED</promise>"
  else
    touch "$SUP_MARKER"
    echo "<promise>USER_DECISION_REQUIRED</promise>"
    echo '<supervisor_suggestion>{"kind":"add_task","title":"Expand scope","details":"Add hardening task","proposedChanges":{"task":"Add supervisor edge-case tests"}}</supervisor_suggestion>'
  fi
else
  echo "<promise>COMPLETE</promise>"
fi
`,
    );

    const proc = Bun.spawn(["bun", "run", RALPH_PATH, "Implement feature", "--agent", "opencode", "--supervisor", "--supervisor-agent", "codex", "--max-iterations", "2", "--no-commit", "--no-stream"], {
      cwd,
      env: {
        ...process.env,
        RALPH_OPENCODE_BINARY: agentPath,
        RALPH_CODEX_BINARY: agentPath,
        SUP_MARKER: marker,
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    await waitFor(() => existsSync(join(cwd, ".ralph", "supervisor-suggestions.json")));
    const suggestionsPath = join(cwd, ".ralph", "supervisor-suggestions.json");
    await waitFor(() => {
      try {
        const parsed = JSON.parse(readFileSync(suggestionsPath, "utf-8"));
        return parsed.suggestions?.some((s: { status: string }) => s.status === "pending");
      } catch {
        return false;
      }
    });

    const parsed = JSON.parse(readFileSync(suggestionsPath, "utf-8"));
    const suggestionId = parsed.suggestions[0].id as string;

    const approve = runRalphSync(cwd, ["--approve-suggestion", suggestionId]);
    expect(approve.exitCode).toBe(0);

    const stdoutPromise = new Response(proc.stdout).text();
    const stderrPromise = new Response(proc.stderr).text();
    const exitCode = await Promise.race([
      proc.exited,
      new Promise<number>((_, reject) => setTimeout(() => reject(new Error("loop timeout")), 15000)),
    ]);

    const stdout = await stdoutPromise;
    const stderr = await stderrPromise;
    expect(exitCode).toBe(0);
    expect(`${stdout}\n${stderr}`).toContain("Waiting for supervisor decision");

    const tasks = readFileSync(join(cwd, ".ralph", "ralph-tasks.md"), "utf-8");
    expect(tasks).toContain("- [ ] Add supervisor edge-case tests");
  });

  test("supervisor disabled does not create supervisor files", () => {
    const cwd = makeTempDir();
    const agentPath = join(cwd, "done-agent.sh");
    writeMockAgent(
      agentPath,
      `#!/bin/sh
echo "<promise>COMPLETE</promise>"
`,
    );

    const res = runRalphSync(cwd, ["Simple task", "--agent", "opencode", "--max-iterations", "1", "--no-commit", "--no-stream"], {
      RALPH_OPENCODE_BINARY: agentPath,
    });

    expect(res.exitCode).toBe(0);
    expect(existsSync(join(cwd, ".ralph", "supervisor-suggestions.json"))).toBe(false);
    expect(existsSync(join(cwd, ".ralph", "supervisor-memory.md"))).toBe(false);
  });
});

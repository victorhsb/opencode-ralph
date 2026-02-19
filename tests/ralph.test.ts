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
    const agentPath = join(cwd, "done-agent.sh");
    writeMockAgent(
      agentPath,
      `#!/bin/sh
echo "<promise>COMPLETE</promise>"
`,
    );

    const res = runRalphSync(cwd, ["Simple task", "--max-iterations", "1", "--no-commit", "--no-stream"], {
    });

    expect(res.exitCode).toBe(0);
    expect(existsSync(join(cwd, ".ralph", "supervisor-suggestions.json"))).toBe(false);
    expect(existsSync(join(cwd, ".ralph", "supervisor-memory.md"))).toBe(false);
  });
});

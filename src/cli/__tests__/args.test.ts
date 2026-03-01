import { describe, expect, test } from "bun:test";
import { join } from "path";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";

const RALPH_PATH = join(import.meta.dir, "..", "..", "..", "ralph.ts");

function runRalphSync(args: string[], options: { cwd?: string; env?: Record<string, string | undefined> } = {}) {
  const proc = Bun.spawnSync(["bun", "run", RALPH_PATH, ...args], {
    cwd: options.cwd ?? process.cwd(),
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

describe("CLI argument parsing", () => {
  test("accepts --prompt in dry-run mode", () => {
    const res = runRalphSync(["-p", "Test positional prompt", "--dry-run"]);

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("=== PROMPT THAT WOULD BE SENT ===");
    expect(res.stdout).toContain("Test positional prompt");
  });

  test("accepts repeated verify commands", () => {
    const res = runRalphSync([
      "-p",
      "Test verify list",
      "--dry-run",
      "--verify",
      "bun test",
      "--verify",
      "bun run build",
      "--verify-mode",
      "every-iteration",
    ]);

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("=== VERIFICATION CONFIG ===");
    expect(res.stdout).toContain("Mode: every-iteration");
    expect(res.stdout).toContain("- bun test");
    expect(res.stdout).toContain("- bun run build");
  });

  test("rejects missing prompt", () => {
    const res = runRalphSync(["--dry-run"]);

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("No prompt provided");
  });

  test("rejects empty prompt value", () => {
    const res = runRalphSync(["-p", "", "--dry-run"]);

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("No prompt provided");
  });

  test("rejects invalid verify-mode", () => {
    const res = runRalphSync([
      "-p",
      "Invalid verify mode",
      "--verify-mode",
      "sometimes",
      "--dry-run",
    ]);

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("Error: --verify-mode must be one of: on-claim, every-iteration");
  });

  test("rejects invalid log-level", () => {
    const res = runRalphSync([
      "-p",
      "Invalid log level",
      "--log-level",
      "trace",
      "--dry-run",
    ]);

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("Error: --log-level must be one of: DEBUG, INFO, WARN, ERROR");
  });

  test("rejects negative min-iterations", () => {
    const res = runRalphSync([
      "-p",
      "Invalid min",
      "--min-iterations",
      "-1",
      "--dry-run",
    ]);

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("Error: --min-iterations must be non-negative");
  });

  test("rejects non-positive verify timeout", () => {
    const res = runRalphSync([
      "-p",
      "Invalid verify timeout",
      "--verify-timeout-ms",
      "0",
      "--dry-run",
    ]);

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("Error: --verify-timeout-ms must be greater than 0");
  });

  test("rejects unknown arguments", () => {
    const res = runRalphSync(["-p", "Unknown option", "--dry-run", "--totally-unknown"]);

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("unknown option '--totally-unknown'");
  });

  test("loads project config from .ralphrc.json", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "ralph-project-config-"));
    try {
      writeFileSync(
        join(projectDir, ".ralphrc.json"),
        JSON.stringify({
          minIterations: 3,
        }),
      );

      const res = runRalphSync(["-p", "Config test", "--dry-run"], { cwd: projectDir });

      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain("Current Iteration: 1 (unlimited) (min: 3)");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("CLI flags override project config values", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "ralph-config-precedence-"));
    try {
      writeFileSync(
        join(projectDir, ".ralphrc.json"),
        JSON.stringify({
          completionPromise: "DONE",
        }),
      );

      const res = runRalphSync(
        ["-p", "Config override test", "--completion-promise", "CLAIMED", "--dry-run"],
        { cwd: projectDir },
      );

      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain("<promise>CLAIMED</promise>");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("loads home config when project config is absent", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "ralph-home-config-project-"));
    const homeDir = mkdtempSync(join(tmpdir(), "ralph-home-config-home-"));
    try {
      mkdirSync(homeDir, { recursive: true });
      writeFileSync(
        join(homeDir, ".ralphrc.json"),
        JSON.stringify({
          completionPromise: "DONE",
        }),
      );

      const res = runRalphSync(["-p", "Home config test", "--dry-run"], {
        cwd: projectDir,
        env: {
          HOME: homeDir,
        },
      });

      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain("<promise>DONE</promise>");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
      rmSync(homeDir, { recursive: true, force: true });
    }
  });
});

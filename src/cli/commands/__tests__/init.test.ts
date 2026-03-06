import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";

const RALPH_PATH = join(import.meta.dir, "..", "..", "..", "..", "ralph.ts");

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "ralph-init-test-"));
}

function runRalphSync(
  cwd: string,
  args: string[],
  env: Record<string, string> = {},
) {
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

describe("init command", () => {
  describe("--skills-scope option", () => {
    test("rejects invalid skills-scope value", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, [
        "init",
        "--skills-scope",
        "invalid",
      ]);
      expect(res.exitCode).toBe(1);
      expect(res.stderr).toContain(
        'Error: Invalid --skills-scope value "invalid"',
      );
      expect(res.stderr).toContain('Must be "local" or "global"');

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });

    test("accepts 'local' as valid skills-scope", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, ["init", "--skills-scope", "local"]);
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain("Installing skills locally");

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });

    test("accepts 'global' as valid skills-scope", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, ["init", "--skills-scope", "global"]);
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain("Installing skills globally");

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });
  });

  describe("local scope installation", () => {
    test("installs skills to .opencode/skills/ directory", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, ["init", "--skills-scope", "local"]);
      expect(res.exitCode).toBe(0);

      // Verify skills are installed locally
      const localSkillsPath = join(cwd, ".opencode", "skills");
      expect(existsSync(localSkillsPath)).toBe(true);
      expect(existsSync(join(localSkillsPath, "ralph-cli-manager"))).toBe(true);
      expect(
        existsSync(join(localSkillsPath, "ralph-loop-plan-creator")),
      ).toBe(true);

      // Verify SKILL.md files exist
      expect(
        existsSync(
          join(localSkillsPath, "ralph-cli-manager", "SKILL.md"),
        ),
      ).toBe(true);
      expect(
        existsSync(
          join(localSkillsPath, "ralph-loop-plan-creator", "SKILL.md"),
        ),
      ).toBe(true);

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });

    test("adds both .ralph/ and .opencode/ to .gitignore", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, ["init", "--skills-scope", "local"]);
      expect(res.exitCode).toBe(0);

      const gitignorePath = join(cwd, ".gitignore");
      expect(existsSync(gitignorePath)).toBe(true);

      const gitignoreContent = readFileSync(gitignorePath, "utf-8");
      expect(gitignoreContent).toContain(".ralph/");
      expect(gitignoreContent).toContain(".opencode/");

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });

    test("default scope is local when not specified", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, ["init"]);
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain("Installing skills locally");

      // Verify local installation
      const localSkillsPath = join(cwd, ".opencode", "skills");
      expect(existsSync(localSkillsPath)).toBe(true);

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });
  });

  describe("global scope installation", () => {
    test("installs skills to ~/.config/opencode/skills/ directory", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, ["init", "--skills-scope", "global"]);
      expect(res.exitCode).toBe(0);

      // Verify skills are installed globally
      const home = process.env["HOME"] || process.env["USERPROFILE"];
      if (home) {
        const globalSkillsPath = join(home, ".config", "opencode", "skills");
        expect(existsSync(globalSkillsPath)).toBe(true);
        expect(
          existsSync(join(globalSkillsPath, "ralph-cli-manager")),
        ).toBe(true);
        expect(
          existsSync(join(globalSkillsPath, "ralph-loop-plan-creator")),
        ).toBe(true);
      }

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });

    test("only adds .ralph/ to .gitignore (not .opencode/)", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, ["init", "--skills-scope", "global"]);
      expect(res.exitCode).toBe(0);

      const gitignorePath = join(cwd, ".gitignore");
      expect(existsSync(gitignorePath)).toBe(true);

      const gitignoreContent = readFileSync(gitignorePath, "utf-8");
      expect(gitignoreContent).toContain(".ralph/");
      expect(gitignoreContent).not.toContain(".opencode/");

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });
  });

  describe("--no-skill flag", () => {
    test("skips skill installation with --no-skill", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, ["init", "--no-skill"]);
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain("Skipping skill installation");

      // Verify no local skills directory
      const localSkillsPath = join(cwd, ".opencode", "skills");
      expect(existsSync(localSkillsPath)).toBe(false);

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });

    test("--no-skill takes precedence over --skills-scope", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, [
        "init",
        "--no-skill",
        "--skills-scope",
        "global",
      ]);
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain("Skipping skill installation");

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });
  });

  describe("--force flag", () => {
    test("overwrites existing .ralph/ directory with --force", () => {
      const cwd = makeTempDir();

      // First init
      const res1 = runRalphSync(cwd, ["init"]);
      expect(res1.exitCode).toBe(0);

      // Create a marker file
      const markerPath = join(cwd, ".ralph", "marker.txt");
      writeFileSync(markerPath, "marker", "utf-8");
      expect(existsSync(markerPath)).toBe(true);

      // Second init without --force should fail
      const res2 = runRalphSync(cwd, ["init"]);
      expect(res2.exitCode).toBe(1);
      expect(res2.stderr).toContain("already exists");

      // Third init with --force should succeed
      const res3 = runRalphSync(cwd, ["init", "--force"]);
      expect(res3.exitCode).toBe(0);
      expect(res3.stdout).toContain("Overwriting");

      // Marker file should be gone
      expect(existsSync(markerPath)).toBe(false);

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });
  });

  describe("creates starter files", () => {
    test("creates tasks.md and context.md", () => {
      const cwd = makeTempDir();
      const res = runRalphSync(cwd, ["init"]);
      expect(res.exitCode).toBe(0);

      const ralphDir = join(cwd, ".ralph");
      expect(existsSync(join(ralphDir, "tasks.md"))).toBe(true);
      expect(existsSync(join(ralphDir, "context.md"))).toBe(true);

      // Verify content
      const tasksContent = readFileSync(
        join(ralphDir, "tasks.md"),
        "utf-8",
      );
      expect(tasksContent).toContain("# Ralph Tasks");

      const contextContent = readFileSync(
        join(ralphDir, "context.md"),
        "utf-8",
      );
      expect(contextContent).toContain("# Ralph Context");

      // Cleanup
      rmSync(cwd, { recursive: true, force: true });
    });
  });
});

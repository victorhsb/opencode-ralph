import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { ConfigError } from "../../errors";
import { loadRalphConfig } from "../loader";

const createdDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("loadRalphConfig", () => {
  test("returns default config when no files exist", async () => {
    const cwd = makeTempDir("ralph-config-default-cwd-");
    const homeDir = makeTempDir("ralph-config-default-home-");

    const loaded = await loadRalphConfig({ cwd, homeDir });

    expect(loaded.config.minIterations).toBe(1);
    expect(loaded.config.maxIterations).toBe(0);
    expect(loaded.config.logLevel).toBe("INFO");
    expect(loaded.config.structuredLogs).toBe(false);
    expect(loaded.config.completionPromise).toBe("COMPLETE");
    expect(loaded.config.performance?.trackTokens).toBe(true);
    expect(loaded.config.performance?.estimateCost).toBe(true);
    expect(loaded.config.state?.compress).toBe(false);
    expect(loaded.config.state?.maxHistory).toBe(100);
    expect(loaded.sources).toEqual([]);
  });

  test("loads state management config", async () => {
    const cwd = makeTempDir("ralph-config-state-cwd-");
    const homeDir = makeTempDir("ralph-config-state-home-");

    writeFileSync(
      join(cwd, ".ralphrc.json"),
      JSON.stringify({
        state: {
          compress: true,
          maxHistory: 25,
        },
      }),
    );

    const loaded = await loadRalphConfig({ cwd, homeDir });
    expect(loaded.config.state?.compress).toBe(true);
    expect(loaded.config.state?.maxHistory).toBe(25);
  });

  test("loads home config file", async () => {
    const cwd = makeTempDir("ralph-config-home-cwd-");
    const homeDir = makeTempDir("ralph-config-home-home-");
    writeFileSync(
      join(homeDir, ".ralphrc.json"),
      JSON.stringify({
        maxIterations: 12,
      }),
    );

    const loaded = await loadRalphConfig({ cwd, homeDir });

    expect(loaded.config.maxIterations).toBe(12);
    expect(loaded.sources).toHaveLength(1);
    expect(loaded.sources[0]).toContain(".ralphrc.json");
  });

  test("project .ralphrc.json overrides home .ralphrc.json", async () => {
    const cwd = makeTempDir("ralph-config-precedence-cwd-");
    const homeDir = makeTempDir("ralph-config-precedence-home-");

    writeFileSync(join(homeDir, ".ralphrc.json"), JSON.stringify({ minIterations: 2 }));
    writeFileSync(join(cwd, ".ralphrc.json"), JSON.stringify({ minIterations: 5 }));

    const loaded = await loadRalphConfig({ cwd, homeDir });

    expect(loaded.config.minIterations).toBe(5);
  });

  test("ralph.config.ts overrides project .ralphrc.json", async () => {
    const cwd = makeTempDir("ralph-config-ts-cwd-");
    const homeDir = makeTempDir("ralph-config-ts-home-");

    writeFileSync(join(cwd, ".ralphrc.json"), JSON.stringify({ minIterations: 3 }));
    writeFileSync(
      join(cwd, "ralph.config.ts"),
      `export default {
  minIterations: 9,
};
`,
    );

    const loaded = await loadRalphConfig({ cwd, homeDir });

    expect(loaded.config.minIterations).toBe(9);
  });

  test("throws ConfigError for invalid JSON config", async () => {
    const cwd = makeTempDir("ralph-config-bad-json-cwd-");
    const homeDir = makeTempDir("ralph-config-bad-json-home-");

    writeFileSync(join(cwd, ".ralphrc.json"), "{ invalid json }");

    await expect(loadRalphConfig({ cwd, homeDir })).rejects.toBeInstanceOf(ConfigError);
  });

  test("throws ConfigError for invalid schema", async () => {
    const cwd = makeTempDir("ralph-config-bad-schema-cwd-");
    const homeDir = makeTempDir("ralph-config-bad-schema-home-");

    writeFileSync(
      join(cwd, ".ralphrc.json"),
      JSON.stringify({
        minIterations: -1,
      }),
    );

    await expect(loadRalphConfig({ cwd, homeDir })).rejects.toBeInstanceOf(ConfigError);
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Logger, configureLogger, logger } from "../index";

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

  configureLogger({
    level: "INFO",
    structured: false,
  });
});

describe("Logger", () => {
  test("filters by level", () => {
    const entries: string[] = [];
    const originalWarn = globalThis.console.warn;
    globalThis.console.warn = (...args: unknown[]) => {
      entries.push(args.map(String).join(" "));
    };

    try {
      const localLogger = new Logger({ level: "WARN" });
      localLogger.info("should-not-log");
      localLogger.warn("should-log");

      expect(entries).toHaveLength(1);
      expect(entries[0]).toContain("should-log");
    } finally {
      globalThis.console.warn = originalWarn;
    }
  });

  test("emits structured output when enabled", () => {
    const entries: string[] = [];
    const originalLog = globalThis.console.log;
    globalThis.console.log = (...args: unknown[]) => {
      entries.push(args.map(String).join(" "));
    };

    try {
      const localLogger = new Logger({ level: "DEBUG", structured: true });
      localLogger.info("hello", { scope: "test" });

      expect(entries).toHaveLength(1);
      const parsed = JSON.parse(entries[0] as string) as Record<string, unknown>;
      expect(parsed["message"]).toBe("hello");
      expect(parsed["level"]).toBe("INFO");
      expect(parsed["scope"]).toBe("test");
      expect(typeof parsed["timestamp"]).toBe("string");
    } finally {
      globalThis.console.log = originalLog;
    }
  });

  test("writes log lines to file", () => {
    const dir = makeTempDir("ralph-logger-");
    const filePath = join(dir, "logs", "app.log");
    const localLogger = new Logger({ level: "INFO", file: filePath });

    localLogger.info("file-line-1");
    localLogger.error("file-line-2");

    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("file-line-1");
    expect(content).toContain("file-line-2");
  });

  test("global logger can be reconfigured", () => {
    const entries: string[] = [];
    const originalError = globalThis.console.error;
    globalThis.console.error = (...args: unknown[]) => {
      entries.push(args.map(String).join(" "));
    };

    try {
      configureLogger({ level: "ERROR" });
      logger.info("skip-me");
      logger.error("show-me");
      expect(entries).toHaveLength(1);
      expect(entries[0]).toContain("show-me");
    } finally {
      globalThis.console.error = originalError;
    }
  });
});

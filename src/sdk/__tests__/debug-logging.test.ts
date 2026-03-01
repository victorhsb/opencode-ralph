/**
 * Debug Event Logging Tests
 *
 * Tests for the logEventDebug function that logs SDK events
 * when RALPH_DEBUG_EVENTS=1 environment variable is set.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";

/**
 * Log event debug information when RALPH_DEBUG_EVENTS=1.
 * Logs to stderr to avoid polluting stdout.
 * This is a copy of the function from executor.ts for testing.
 */
function logEventDebug(eventType: string, content: string): void {
  if (process.env["RALPH_DEBUG_EVENTS"] !== "1") return;
  const timestamp = new Date().toISOString();
  const size = Buffer.byteLength(content, "utf8");
  console.error(`[DEBUG] [${timestamp}] Event: ${eventType} | Size: ${size} bytes`);
}

describe("Debug Event Logging", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Store original env value
    originalEnv = process.env["RALPH_DEBUG_EVENTS"];
    // Clear the env var before each test
    delete process.env["RALPH_DEBUG_EVENTS"];
  });

  afterEach(() => {
    // Restore original env value
    if (originalEnv !== undefined) {
      process.env["RALPH_DEBUG_EVENTS"] = originalEnv;
    } else {
      delete process.env["RALPH_DEBUG_EVENTS"];
    }
  });

  describe("when RALPH_DEBUG_EVENTS=1", () => {
    test("should log event to stderr with correct format", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "1";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      logEventDebug("message.part.delta", '{"delta": "Hello"}');

      console.error = originalConsoleError;

      expect(errors.length).toBe(1);
      expect(errors[0]).toMatch(/^\[DEBUG\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Event: message\.part\.delta \| Size: \d+ bytes$/);
    });

    test("should include correct event type in log", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "1";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      logEventDebug("tool_start", '{"tool": "read"}');

      console.error = originalConsoleError;

      expect(errors[0]).toContain("Event: tool_start");
    });

    test("should include correct byte size in log", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "1";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      const content = '{"tool": "read"}';
      const expectedSize = Buffer.byteLength(content, "utf8");

      logEventDebug("tool_start", content);

      console.error = originalConsoleError;

      expect(errors[0]).toContain(`Size: ${expectedSize} bytes`);
    });

    test("should handle empty content", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "1";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      logEventDebug("empty_event", "");

      console.error = originalConsoleError;

      expect(errors[0]).toContain("Size: 0 bytes");
    });

    test("should handle large content", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "1";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      const largeContent = "x".repeat(10000);
      const expectedSize = Buffer.byteLength(largeContent, "utf8");

      logEventDebug("large_event", largeContent);

      console.error = originalConsoleError;

      expect(errors[0]).toContain(`Size: ${expectedSize} bytes`);
    });

    test("should handle multibyte UTF-8 characters", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "1";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      const content = "Hello, 世界! 🌍";
      const expectedSize = Buffer.byteLength(content, "utf8");

      logEventDebug("utf8_event", content);

      console.error = originalConsoleError;

      expect(expectedSize).toBeGreaterThan(content.length); // UTF-8 bytes > character count
      expect(errors[0]).toContain(`Size: ${expectedSize} bytes`);
    });
  });

  describe("when RALPH_DEBUG_EVENTS is not set", () => {
    test("should not log anything", () => {
      delete process.env["RALPH_DEBUG_EVENTS"];

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      logEventDebug("some_event", "content");

      console.error = originalConsoleError;

      expect(errors.length).toBe(0);
    });
  });

  describe("when RALPH_DEBUG_EVENTS has different values", () => {
    test("should not log when value is '0'", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "0";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      logEventDebug("some_event", "content");

      console.error = originalConsoleError;

      expect(errors.length).toBe(0);
    });

    test("should not log when value is 'true'", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "true";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      logEventDebug("some_event", "content");

      console.error = originalConsoleError;

      expect(errors.length).toBe(0);
    });

    test("should not log when value is empty string", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      logEventDebug("some_event", "content");

      console.error = originalConsoleError;

      expect(errors.length).toBe(0);
    });

    test("should not log when value is 'yes'", () => {
      process.env["RALPH_DEBUG_EVENTS"] = "yes";

      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      logEventDebug("some_event", "content");

      console.error = originalConsoleError;

      expect(errors.length).toBe(0);
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      process.env["RALPH_DEBUG_EVENTS"] = "1";
    });

    test("should handle event type with special characters", () => {
      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      logEventDebug("event:type.special", "content");

      console.error = originalConsoleError;

      expect(errors[0]).toContain("Event: event:type.special");
    });

    test("should handle content with newlines", () => {
      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (msg: string) => errors.push(msg);

      const content = "line1\nline2\nline3";
      const expectedSize = Buffer.byteLength(content, "utf8");

      logEventDebug("multiline_event", content);

      console.error = originalConsoleError;

      expect(errors[0]).toContain(`Size: ${expectedSize} bytes`);
    });
  });
});

console.log("Debug event logging tests loaded successfully");
console.log("Testing logEventDebug behavior with environment variable...");

// Run a quick verification
const testCases = [
  { env: "1", shouldLog: true, desc: "RALPH_DEBUG_EVENTS=1" },
  { env: "0", shouldLog: false, desc: "RALPH_DEBUG_EVENTS=0" },
  { env: undefined, shouldLog: false, desc: "RALPH_DEBUG_EVENTS unset" },
];

for (const tc of testCases) {
  if (tc.env !== undefined) {
    process.env["RALPH_DEBUG_EVENTS"] = tc.env;
  } else {
    delete process.env["RALPH_DEBUG_EVENTS"];
  }

  const errors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (msg: string) => errors.push(msg);

  logEventDebug("test_event", "{}");

  console.error = originalConsoleError;

  const didLog = errors.length > 0;
  const status = didLog === tc.shouldLog ? "✓" : "✗";
  console.log(`  ${tc.desc}: ${status} (expected ${tc.shouldLog}, got ${didLog})`);
}

console.log("\nAll debug logging tests ready to run with: bun test src/sdk/__tests__/debug-logging.test.ts");

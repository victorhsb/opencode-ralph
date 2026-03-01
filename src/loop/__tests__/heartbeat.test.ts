/**
 * Contextual Heartbeat Tests
 *
 * Tests for the heartbeat functionality that provides contextual
 * status updates based on event types and elapsed time.
 */

import { describe, test, expect } from "bun:test";

/**
 * Format elapsed time in human-readable format.
 * This is a copy of the function from iteration.ts for testing.
 */
function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}min${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ""}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ""}`;
}

/**
 * Generate heartbeat message based on current state.
 * This is a copy of the function from iteration.ts for testing.
 */
function getHeartbeatMessage(
  lastEventType: string | null,
  lastEventTime: number,
  currentTime: number
): string {
  const elapsed = currentTime - lastEventTime;
  const formattedTime = formatElapsedTime(elapsed);

  if (lastEventType === "text") {
    return `| ... (waiting for model, ${formattedTime} since last output)`;
  }
  if (lastEventType === "tool_start") {
    return `| ... (tool execution in progress, ${formattedTime} elapsed)`;
  }
  return `| ... (model generating, ${formattedTime} elapsed)`;
}

/**
 * Check if heartbeat should be printed based on timing constraints.
 * This replicates the timing logic from iteration.ts for testing.
 */
function shouldPrintHeartbeat(
  lastPrintedAt: number,
  lastEventTime: number,
  currentTime: number,
  heartbeatIntervalMs: number = 10000,
  minHeartbeatDelayMs: number = 30000
): boolean {
  const timeSinceLastEvent = currentTime - lastEventTime;
  return (
    currentTime - lastPrintedAt >= heartbeatIntervalMs &&
    timeSinceLastEvent >= minHeartbeatDelayMs
  );
}

describe("formatElapsedTime", () => {
  test("should format 45000ms as '45s'", () => {
    const result = formatElapsedTime(45000);
    expect(result).toBe("45s");
  });

  test("should format 150000ms as '2min 30s'", () => {
    const result = formatElapsedTime(150000);
    expect(result).toBe("2min 30s");
  });

  test("should format 5400000ms as '1h 30min'", () => {
    const result = formatElapsedTime(5400000);
    expect(result).toBe("1h 30min");
  });

  test("should format 0ms as '0s'", () => {
    const result = formatElapsedTime(0);
    expect(result).toBe("0s");
  });

  test("should format 1000ms as '1s'", () => {
    const result = formatElapsedTime(1000);
    expect(result).toBe("1s");
  });

  test("should format 59999ms as '59s'", () => {
    const result = formatElapsedTime(59999);
    expect(result).toBe("59s");
  });

  test("should format 60000ms as '1min'", () => {
    const result = formatElapsedTime(60000);
    expect(result).toBe("1min");
  });

  test("should format 90000ms as '1min 30s'", () => {
    const result = formatElapsedTime(90000);
    expect(result).toBe("1min 30s");
  });

  test("should format 3599000ms as '59min 59s'", () => {
    const result = formatElapsedTime(3599000);
    expect(result).toBe("59min 59s");
  });

  test("should format 3600000ms as '1h'", () => {
    const result = formatElapsedTime(3600000);
    expect(result).toBe("1h");
  });

  test("should format 7200000ms as '2h'", () => {
    const result = formatElapsedTime(7200000);
    expect(result).toBe("2h");
  });

  test("should format 9000000ms as '2h 30min'", () => {
    const result = formatElapsedTime(9000000);
    expect(result).toBe("2h 30min");
  });
});

describe("getHeartbeatMessage", () => {
  const baseTime = Date.now();

  describe("text event type", () => {
    test("should return 'waiting for model' message for text event at 45s", () => {
      const result = getHeartbeatMessage("text", baseTime, baseTime + 45000);
      expect(result).toContain("waiting for model");
      expect(result).toContain("45s");
    });

    test("should return 'waiting for model' message for text event at 2min", () => {
      const result = getHeartbeatMessage("text", baseTime, baseTime + 120000);
      expect(result).toContain("waiting for model");
      expect(result).toContain("2min");
    });

    test("should include formatted time in message", () => {
      const result = getHeartbeatMessage("text", baseTime, baseTime + 90000);
      expect(result).toBe("| ... (waiting for model, 1min 30s since last output)");
    });
  });

  describe("tool_start event type", () => {
    test("should return 'tool execution' message for tool_start event", () => {
      const result = getHeartbeatMessage("tool_start", baseTime, baseTime + 45000);
      expect(result).toContain("tool execution");
      expect(result).toContain("45s");
    });

    test("should return 'tool execution' message for tool_start at 1min", () => {
      const result = getHeartbeatMessage("tool_start", baseTime, baseTime + 60000);
      expect(result).toContain("tool execution in progress");
      expect(result).toContain("1min");
    });

    test("should include formatted time in tool message", () => {
      const result = getHeartbeatMessage("tool_start", baseTime, baseTime + 150000);
      expect(result).toBe("| ... (tool execution in progress, 2min 30s elapsed)");
    });
  });

  describe("other event types", () => {
    test("should return 'model generating' for null event type", () => {
      const result = getHeartbeatMessage(null, baseTime, baseTime + 45000);
      expect(result).toContain("model generating");
      expect(result).toContain("45s");
    });

    test("should return 'model generating' for undefined event type", () => {
      const result = getHeartbeatMessage(null, baseTime, baseTime + 45000);
      expect(result).toContain("model generating");
    });

    test("should return 'model generating' for unknown event type", () => {
      const result = getHeartbeatMessage("unknown_event", baseTime, baseTime + 45000);
      expect(result).toContain("model generating");
    });

    test("should return 'model generating' for tool_end event", () => {
      const result = getHeartbeatMessage("tool_end", baseTime, baseTime + 45000);
      expect(result).toContain("model generating");
    });

    test("should return 'model generating' for thinking event", () => {
      const result = getHeartbeatMessage("thinking", baseTime, baseTime + 45000);
      expect(result).toContain("model generating");
    });

    test("should return 'model generating' for error event", () => {
      const result = getHeartbeatMessage("error", baseTime, baseTime + 45000);
      expect(result).toContain("model generating");
    });
  });

  describe("message format", () => {
    test("should start with '| ... ('", () => {
      const result = getHeartbeatMessage("text", baseTime, baseTime + 45000);
      expect(result.startsWith("| ... (")).toBe(true);
    });

    test("should end with ')'", () => {
      const result = getHeartbeatMessage("text", baseTime, baseTime + 45000);
      expect(result.endsWith(")")).toBe(true);
    });
  });
});

describe("shouldPrintHeartbeat", () => {
  const baseTime = 1000000;

  test("should not print when less than 30 seconds elapsed since last event", () => {
    const result = shouldPrintHeartbeat(baseTime, baseTime, baseTime + 25000);
    expect(result).toBe(false);
  });

  test("should print when exactly 30 seconds elapsed since last event", () => {
    // lastPrintedAt is old enough (baseTime), lastEventTime was at baseTime
    // current time is baseTime + 30000
    // timeSinceLastEvent = 30000 (meets threshold)
    // currentTime - lastPrintedAt = 30000 (>= heartbeatIntervalMs of 10000)
    const result = shouldPrintHeartbeat(baseTime, baseTime, baseTime + 30000);
    expect(result).toBe(true);
  });

  test("should print when more than 30 seconds elapsed since last event", () => {
    const result = shouldPrintHeartbeat(baseTime, baseTime, baseTime + 45000);
    expect(result).toBe(true);
  });

  test("should not print when heartbeat interval has not passed", () => {
    // lastPrintedAt is recent (baseTime + 35000)
    // current time is baseTime + 40000
    // timeSinceLastEvent = 40000 (>= minHeartbeatDelayMs)
    // but currentTime - lastPrintedAt = 5000 (< heartbeatIntervalMs)
    const result = shouldPrintHeartbeat(baseTime + 35000, baseTime, baseTime + 40000);
    expect(result).toBe(false);
  });

  test("should print when both thresholds are met", () => {
    // lastPrintedAt at baseTime, lastEvent at baseTime + 5000
    // current time at baseTime + 35000
    // timeSinceLastEvent = 30000 (meets threshold)
    // currentTime - lastPrintedAt = 35000 (>= heartbeatIntervalMs)
    const result = shouldPrintHeartbeat(baseTime, baseTime + 5000, baseTime + 35000);
    expect(result).toBe(true);
  });

  test("should handle boundary case at 30 seconds", () => {
    const result = shouldPrintHeartbeat(baseTime, baseTime, baseTime + 30000);
    expect(result).toBe(true);
  });

  test("should not print when timeSinceLastEvent is just under 30 seconds", () => {
    const result = shouldPrintHeartbeat(baseTime, baseTime, baseTime + 29999);
    expect(result).toBe(false);
  });
});

describe("edge cases", () => {
  const baseTime = Date.now();

  test("should handle very large elapsed times", () => {
    const result = getHeartbeatMessage("text", baseTime, baseTime + 86400000); // 24 hours
    expect(result).toContain("24h");
  });

  test("should handle negative elapsed time (clock skew case)", () => {
    // This shouldn't happen in practice, but test the behavior
    const result = getHeartbeatMessage("text", baseTime + 1000, baseTime);
    // Negative elapsed time is formatted as negative seconds
    expect(result).toContain("-1s");
  });

  test("should handle millisecond precision by flooring to seconds", () => {
    const result = getHeartbeatMessage("text", baseTime, baseTime + 45500);
    expect(result).toContain("45s");
    expect(result).not.toContain("45.5s");
  });
});

console.log("Contextual heartbeat tests loaded successfully");
console.log("Testing time formatting and heartbeat message generation...");

// Run quick verification
console.log("\nformatElapsedTime samples:");
const timeTests = [
  { ms: 45000, expected: "45s" },
  { ms: 150000, expected: "2min 30s" },
  { ms: 5400000, expected: "1h 30min" },
];

for (const tc of timeTests) {
  const result = formatElapsedTime(tc.ms);
  const status = result === tc.expected ? "✓" : "✗";
  console.log(`  ${tc.ms}ms -> ${result} ${status}`);
}

console.log("\ngetHeartbeatMessage samples:");
const base = Date.now();
const messageTests = [
  { type: "text", offset: 45000, expected: "waiting for model" },
  { type: "tool_start", offset: 45000, expected: "tool execution" },
  { type: "other", offset: 45000, expected: "model generating" },
];

for (const tc of messageTests) {
  const result = getHeartbeatMessage(tc.type as any, base, base + tc.offset);
  const status = result.includes(tc.expected) ? "✓" : "✗";
  console.log(`  ${tc.type}: ${status} (${tc.expected})`);
}

console.log("\nAll heartbeat tests ready to run with: bun test src/loop/__tests__/heartbeat.test.ts");

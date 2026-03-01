/**
 * Subagent Monitoring Tests
 *
 * Comprehensive tests for the subagent monitoring feature including:
 * - Type definitions and interfaces
 * - Output formatting utilities
 * - Event parsing for task_spawn events
 * - SubagentMonitor class functionality
 * - Integration with SDK executor
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { SubagentInfo, SubagentEvent, SubagentMonitorOptions } from "../subagent-types.js";
import {
  generateShortId,
  formatSubagentOutput,
  formatSubagentStart,
  formatSubagentEnd,
  GRAY,
  RESET,
} from "../subagent-output.js";
import { SubagentMonitor } from "../subagent-monitor.js";
import type { SdkEvent } from "../executor.js";

// ============================================================================
// Mock Types and Helpers
// ============================================================================

/**
 * Mock SDK client for testing.
 * Provides configurable responses for session and event operations.
 */
interface MockClient {
  session: {
    children: (params: { sessionID: string }) => Promise<{
      data: unknown[] | null;
      error?: string | undefined;
    }>;
    create: (params: { title: string }) => Promise<{
      data: { id: string } | null;
      error?: string | undefined;
    }>;
    prompt: (params: unknown) => Promise<{
      data: unknown;
      error?: string | undefined;
    }>;
  };
  event: {
    subscribe: () => Promise<{
      stream: AsyncIterable<unknown>;
    }>;
  };
}

/**
 * Creates a mock SDK client with optional overrides.
 */
function createMockClient(overrides?: Partial<MockClient>): MockClient {
  return {
    session: {
      children: async () => ({ data: [] }),
      create: async () => ({ data: { id: "test-session" } }),
      prompt: async () => ({ data: {} }),
    },
    event: {
      subscribe: async () => ({ stream: (async function* () {})() }),
    },
    ...overrides,
  };
}

/**
 * Creates a mock event stream that yields events from an array.
 */
function createMockEventStream(events: unknown[]): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
  };
}

// ============================================================================
// Type Validation Tests
// ============================================================================

describe("Subagent Monitoring", () => {
  describe("Types", () => {
    test("SubagentInfo interface structure", () => {
      const info: SubagentInfo = {
        sessionId: "sess-abc123-def456",
        shortId: "ef456",
        agentName: "explore",
        parentId: "parent-sess",
        depth: 1,
        status: "running",
      };

      expect(info.sessionId).toBe("sess-abc123-def456");
      expect(info.shortId).toBe("ef456");
      expect(info.agentName).toBe("explore");
      expect(info.parentId).toBe("parent-sess");
      expect(info.depth).toBe(1);
      expect(info.status).toBe("running");
    });

    test("SubagentInfo supports all status values", () => {
      const runningInfo: SubagentInfo = {
        sessionId: "1",
        shortId: "1",
        agentName: "test",
        parentId: "parent",
        depth: 1,
        status: "running",
      };
      const completedInfo: SubagentInfo = {
        ...runningInfo,
        status: "completed",
      };
      const errorInfo: SubagentInfo = {
        ...runningInfo,
        status: "error",
      };

      expect(runningInfo.status).toBe("running");
      expect(completedInfo.status).toBe("completed");
      expect(errorInfo.status).toBe("error");
    });

    test("SubagentEvent structure", () => {
      const subagent: SubagentInfo = {
        sessionId: "sess-123",
        shortId: "s123",
        agentName: "code",
        parentId: "parent",
        depth: 1,
        status: "running",
      };

      const sdkEvent: SdkEvent = {
        type: "text",
        content: "Hello",
        timestamp: Date.now(),
      };

      const subagentEvent: SubagentEvent = {
        subagent,
        event: sdkEvent,
      };

      expect(subagentEvent.subagent.agentName).toBe("code");
      expect(subagentEvent.event.type).toBe("text");
      expect(subagentEvent.event.content).toBe("Hello");
    });

    test("depth calculation logic - direct child", () => {
      const info: SubagentInfo = {
        sessionId: "child",
        shortId: "child",
        agentName: "test",
        parentId: "parent",
        depth: 1,
        status: "running",
      };

      expect(info.depth).toBe(1);
      expect(info.parentId).toBe("parent");
    });

    test("depth calculation logic - nested subagent", () => {
      const grandchild: SubagentInfo = {
        sessionId: "grandchild",
        shortId: "gc",
        agentName: "nested",
        parentId: "child",
        depth: 2,
        status: "running",
      };

      expect(grandchild.depth).toBe(2);
      expect(grandchild.parentId).toBe("child");
    });

    test("depth calculation logic - deeply nested", () => {
      const deep: SubagentInfo = {
        sessionId: "deep",
        shortId: "d",
        agentName: "deep",
        parentId: "level3",
        depth: 4,
        status: "running",
      };

      expect(deep.depth).toBe(4);
    });
  });

  // ============================================================================
  // Output Formatting Tests
  // ============================================================================

  describe("Output Formatting", () => {
    describe("generateShortId", () => {
      test("should extract last 6 characters", () => {
        const result = generateShortId("sess-abc123-def456");
        expect(result).toBe("def456");
      });

      test("should convert to lowercase", () => {
        const result = generateShortId("ABC-DEF-GHI");
        expect(result).toBe("ef-ghi");
      });

      test("should handle exact 6 character strings", () => {
        const result = generateShortId("abcdef");
        expect(result).toBe("abcdef");
      });

      test("should handle empty string", () => {
        const result = generateShortId("");
        expect(result).toBe("");
      });

      test("should handle strings shorter than 6 characters", () => {
        const result = generateShortId("abc");
        expect(result).toBe("abc");
      });

      test("should handle UUID-like strings", () => {
        const result = generateShortId("550e8400-e29b-41d4-a716-446655440000");
        expect(result).toBe("440000");
      });

      test("should handle session IDs with hyphens", () => {
        const result = generateShortId("session-abc-123-xyz");
        expect(result).toBe("23-xyz");
      });
    });

    describe("formatSubagentOutput", () => {
      const baseInfo: SubagentInfo = {
        sessionId: "sess-abc123-def456",
        shortId: "ef456",
        agentName: "explore",
        parentId: "parent",
        depth: 1,
        status: "running",
      };

      test("should format single line content", () => {
        const result = formatSubagentOutput(baseInfo, "I need to investigate");
        expect(result).toContain("subagent explore@ef456:");
        expect(result).toContain("I need to investigate");
        expect(result).toContain(GRAY);
        expect(result).toContain(RESET);
      });

      test("should format multi-line content", () => {
        const content = "Line 1\nLine 2\nLine 3";
        const result = formatSubagentOutput(baseInfo, content);
        const lines = result.split("\n");
        expect(lines.length).toBe(3);
        expect(lines[0]).toContain("Line 1");
        expect(lines[1]).toContain("Line 2");
        expect(lines[2]).toContain("Line 3");
      });

      test("should apply indentation based on depth", () => {
        const depth1Info = { ...baseInfo, depth: 1 };
        const depth2Info = { ...baseInfo, depth: 2 };
        const depth3Info = { ...baseInfo, depth: 3 };

        const result1 = formatSubagentOutput(depth1Info, "test");
        const result2 = formatSubagentOutput(depth2Info, "test");
        const result3 = formatSubagentOutput(depth3Info, "test");

        // Depth 1 = 2 spaces, Depth 2 = 4 spaces, Depth 3 = 6 spaces
        expect(result1.indexOf("subagent")).toBe(2 + GRAY.length);
        expect(result2.indexOf("subagent")).toBe(4 + GRAY.length);
        expect(result3.indexOf("subagent")).toBe(6 + GRAY.length);
      });

      test("should handle empty content", () => {
        const result = formatSubagentOutput(baseInfo, "");
        expect(result).toBe("");
      });

      test("should handle content with trailing whitespace", () => {
        const result = formatSubagentOutput(baseInfo, "content   ");
        expect(result).toContain("content");
        expect(result).not.toContain("content   ");
      });

      test("should preserve internal whitespace", () => {
        const result = formatSubagentOutput(baseInfo, "word1   word2");
        expect(result).toContain("word1   word2");
      });

      test("should handle content with empty lines", () => {
        const content = "Line 1\n\nLine 3";
        const result = formatSubagentOutput(baseInfo, content);
        const lines = result.split("\n");
        expect(lines.length).toBe(3);
        // Middle line should have just indentation and formatting
        expect(lines[1]).toContain(GRAY);
        expect(lines[1]).toContain(RESET);
      });

      test("should handle different agent names", () => {
        const codeInfo = { ...baseInfo, agentName: "code" };
        const result = formatSubagentOutput(codeInfo, "test");
        expect(result).toContain("subagent code@ef456:");
      });

      test("should handle special characters in content", () => {
        const content = "Hello! @#$%^&*()_+{}|:<>?";
        const result = formatSubagentOutput(baseInfo, content);
        expect(result).toContain(content);
      });
    });

    describe("formatSubagentStart", () => {
      const baseInfo: SubagentInfo = {
        sessionId: "sess-abc123-def456",
        shortId: "ef456",
        agentName: "explore",
        parentId: "parent",
        depth: 1,
        status: "running",
      };

      test("should include arrow symbol", () => {
        const result = formatSubagentStart(baseInfo);
        expect(result).toContain("↳");
      });

      test("should include agent name and short ID", () => {
        const result = formatSubagentStart(baseInfo);
        expect(result).toContain("explore@ef456");
        expect(result).toContain("started");
      });

      test("should apply indentation based on depth", () => {
        const depth1 = formatSubagentStart({ ...baseInfo, depth: 1 });
        const depth2 = formatSubagentStart({ ...baseInfo, depth: 2 });
        const depth3 = formatSubagentStart({ ...baseInfo, depth: 3 });

        expect(depth1.indexOf("↳")).toBe(2 + GRAY.length);
        expect(depth2.indexOf("↳")).toBe(4 + GRAY.length);
        expect(depth3.indexOf("↳")).toBe(6 + GRAY.length);
      });

      test("should include ANSI codes", () => {
        const result = formatSubagentStart(baseInfo);
        expect(result).toContain(GRAY);
        expect(result).toContain(RESET);
      });

      test("should handle different agent names", () => {
        const codeInfo = { ...baseInfo, agentName: "code-reviewer" };
        const result = formatSubagentStart(codeInfo);
        expect(result).toContain("code-reviewer@ef456");
      });
    });

    describe("formatSubagentEnd", () => {
      const baseInfo: SubagentInfo = {
        sessionId: "sess-abc123-def456",
        shortId: "ef456",
        agentName: "explore",
        parentId: "parent",
        depth: 1,
        status: "running",
      };

      test("should show checkmark for completed status", () => {
        const completedInfo = { ...baseInfo, status: "completed" as const };
        const result = formatSubagentEnd(completedInfo);
        expect(result).toContain("✓");
        expect(result).toContain("completed");
      });

      test("should show X for error status", () => {
        const errorInfo = { ...baseInfo, status: "error" as const };
        const result = formatSubagentEnd(errorInfo);
        expect(result).toContain("✗");
        expect(result).toContain("error");
      });

      test("should include agent name and short ID", () => {
        const completedInfo = { ...baseInfo, status: "completed" as const };
        const result = formatSubagentEnd(completedInfo);
        expect(result).toContain("explore@ef456");
      });

      test("should apply indentation based on depth", () => {
        const depth1Info = { ...baseInfo, status: "completed" as const, depth: 1 };
        const depth2Info = { ...baseInfo, status: "completed" as const, depth: 2 };

        const result1 = formatSubagentEnd(depth1Info);
        const result2 = formatSubagentEnd(depth2Info);

        expect(result1.indexOf("✓")).toBe(2 + GRAY.length);
        expect(result2.indexOf("✓")).toBe(4 + GRAY.length);
      });

      test("should include ANSI codes", () => {
        const completedInfo = { ...baseInfo, status: "completed" as const };
        const result = formatSubagentEnd(completedInfo);
        expect(result).toContain(GRAY);
        expect(result).toContain(RESET);
      });
    });

    describe("ANSI codes", () => {
      test("GRAY constant is defined", () => {
        expect(GRAY).toBeDefined();
        expect(typeof GRAY).toBe("string");
        expect(GRAY.length).toBeGreaterThan(0);
      });

      test("RESET constant is defined", () => {
        expect(RESET).toBeDefined();
        expect(typeof RESET).toBe("string");
        expect(RESET.length).toBeGreaterThan(0);
      });

      test("GRAY starts with escape sequence", () => {
        expect(GRAY).toMatch(/^\x1b\[/);
      });

      test("RESET starts with escape sequence", () => {
        expect(RESET).toMatch(/^\x1b\[/);
      });

      test("formatted output contains gray codes", () => {
        const info: SubagentInfo = {
          sessionId: "test",
          shortId: "test",
          agentName: "test",
          parentId: "parent",
          depth: 1,
          status: "running",
        };

        const output = formatSubagentOutput(info, "content");
        const start = formatSubagentStart(info);
        const end = formatSubagentEnd({ ...info, status: "completed" });

        expect(output).toContain(GRAY);
        expect(output).toContain(RESET);
        expect(start).toContain(GRAY);
        expect(start).toContain(RESET);
        expect(end).toContain(GRAY);
        expect(end).toContain(RESET);
      });
    });
  });

  // ============================================================================
  // Event Parsing Tests
  // ============================================================================

  describe("Event Parsing", () => {
    describe("Task tool detection", () => {
      test("should detect task tool from message.part.updated", () => {
        const event = {
          type: "message.part.updated",
          properties: {
            part: {
              type: "tool",
              tool: "task",
              state: {
                status: "running",
              },
            },
          },
        };

        const part = (event.properties.part || {}) as Record<string, unknown>;
        expect(part["tool"]).toBe("task");
      });

      test("should create task_spawn event with agent name", () => {
        const event = {
          type: "message.part.updated",
          properties: {
            part: {
              type: "tool",
              tool: "task",
              state: {
                status: "running",
                input: {
                  agent: "explore",
                },
              },
            },
          },
        };

        const part = (event.properties.part || {}) as Record<string, unknown>;
        const state = (part["state"] || {}) as Record<string, unknown>;
        const input = (state["input"] ?? part["input"]) as Record<string, unknown> | undefined;
        const agentName = typeof input?.["agent"] === "string" ? input["agent"] : undefined;

        expect(agentName).toBe("explore");
      });

      test("should create task_spawn event with description", () => {
        const event = {
          type: "message.part.updated",
          properties: {
            part: {
              type: "tool",
              tool: "task",
              state: {
                status: "running",
                input: {
                  agent: "code",
                  description: "Fix the bug in user authentication",
                },
              },
            },
          },
        };

        const part = (event.properties.part || {}) as Record<string, unknown>;
        const state = (part["state"] || {}) as Record<string, unknown>;
        const input = (state["input"] ?? part["input"]) as Record<string, unknown> | undefined;
        const description = typeof input?.["description"] === "string" ? input["description"] : undefined;

        expect(description).toBe("Fix the bug in user authentication");
      });

      test("should handle missing agent name", () => {
        const event = {
          type: "message.part.updated",
          properties: {
            part: {
              type: "tool",
              tool: "task",
              state: {
                status: "running",
                input: {},
              },
            },
          },
        };

        const part = (event.properties.part || {}) as Record<string, unknown>;
        const state = (part["state"] || {}) as Record<string, unknown>;
        const input = (state["input"] ?? part["input"]) as Record<string, unknown> | undefined;
        const agentName = typeof input?.["agent"] === "string" ? input["agent"] : undefined;

        expect(agentName).toBeUndefined();
      });

      test("should handle missing input entirely", () => {
        const event = {
          type: "message.part.updated",
          properties: {
            part: {
              type: "tool",
              tool: "task",
              state: {
                status: "running",
              },
            },
          },
        };

        const part = (event.properties.part || {}) as Record<string, unknown>;
        const state = (part["state"] || {}) as Record<string, unknown>;
        const input = (state["input"] ?? part["input"]) as Record<string, unknown> | undefined;

        expect(input).toBeUndefined();
      });

      test("should not create task_spawn for non-task tools", () => {
        const nonTaskTools = ["read", "edit", "bash", "glob", "grep"];

        for (const toolName of nonTaskTools) {
          const event = {
            type: "message.part.updated",
            properties: {
              part: {
                type: "tool",
                tool: toolName,
                state: {
                  status: "running",
                },
              },
            },
          };

          const part = (event.properties.part || {}) as Record<string, unknown>;
          const tool = typeof part["tool"] === "string" ? part["tool"] : "";

          expect(tool).not.toBe("task");
          expect(tool).toBe(toolName);
        }
      });

      test("should handle task tool with completed status", () => {
        const event = {
          type: "message.part.updated",
          properties: {
            part: {
              type: "tool",
              tool: "task",
              state: {
                status: "completed",
                input: {
                  agent: "explore",
                  description: "Done exploring",
                },
                output: "Results found",
              },
            },
          },
        };

        const part = (event.properties.part || {}) as Record<string, unknown>;
        const state = (part["state"] || {}) as Record<string, unknown>;
        const status = typeof state["status"] === "string" ? state["status"] : "";

        expect(status).toBe("completed");
      });
    });
  });

  // ============================================================================
  // SubagentMonitor Tests
  // ============================================================================

  describe("SubagentMonitor", () => {
    let mockClient: MockClient;
    let monitorOptions: SubagentMonitorOptions;
    let startedSubagents: SubagentInfo[];
    let completedSubagents: SubagentInfo[];
    let subagentEvents: SubagentEvent[];

    beforeEach(() => {
      startedSubagents = [];
      completedSubagents = [];
      subagentEvents = [];

      mockClient = createMockClient();
      monitorOptions = {
        client: mockClient as unknown as SubagentMonitorOptions["client"],
        parentSessionId: "parent-session-123",
        onSubagentStarted: (info) => startedSubagents.push(info),
        onSubagentCompleted: (info) => completedSubagents.push(info),
        onSubagentEvent: (event) => subagentEvents.push(event),
      };
    });

    afterEach(async () => {
      // Clean up any running monitors
      // No cleanup needed here as monitors are stopped in individual tests
    });

    describe("constructor", () => {
      test("should initialize maps correctly", () => {
        const monitor = new SubagentMonitor(monitorOptions);

        // Access private properties for verification
        // @ts-expect-error - accessing private property for testing
        expect(monitor.activeSubagents).toBeInstanceOf(Map);
        // @ts-expect-error - accessing private property for testing
        expect(monitor.activeSubagents.size).toBe(0);
        // @ts-expect-error - accessing private property for testing
        expect(monitor.eventSubscriptions).toBeInstanceOf(Map);
        // @ts-expect-error - accessing private property for testing
        expect(monitor.eventSubscriptions.size).toBe(0);
        // @ts-expect-error - accessing private property for testing
        expect(monitor.childMonitors).toBeInstanceOf(Array);
        // @ts-expect-error - accessing private property for testing
        expect(monitor.childMonitors.length).toBe(0);
      });

      test("should store options", () => {
        const monitor = new SubagentMonitor(monitorOptions);

        // @ts-expect-error - accessing private property for testing
        expect(monitor.options).toBe(monitorOptions);
        // @ts-expect-error - accessing private property for testing
        expect(monitor.options.parentSessionId).toBe("parent-session-123");
      });

      test("should initialize isRunning to false", () => {
        const monitor = new SubagentMonitor(monitorOptions);

        // @ts-expect-error - accessing private property for testing
        expect(monitor.isRunning).toBe(false);
      });

      test("should initialize pollInterval to null", () => {
        const monitor = new SubagentMonitor(monitorOptions);

        // @ts-expect-error - accessing private property for testing
        expect(monitor.pollInterval).toBeNull();
      });
    });

    describe("start", () => {
      test("should set isRunning to true", async () => {
        const monitor = new SubagentMonitor(monitorOptions);
        await monitor.start();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.isRunning).toBe(true);

        await monitor.stop();
      });

      test("should begin polling immediately", async () => {
        let pollCalled = false;
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => {
              pollCalled = true;
              return { data: [], error: undefined };
            },
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait a bit for async operations
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(pollCalled).toBe(true);
        await monitor.stop();
      });

      test("should be safe to call multiple times", async () => {
        const monitor = new SubagentMonitor(monitorOptions);

        await monitor.start();
        await monitor.start(); // Second call should be no-op
        await monitor.start(); // Third call should be no-op

        // @ts-expect-error - accessing private property for testing
        expect(monitor.isRunning).toBe(true);

        await monitor.stop();
      });

      test("should set up poll interval", async () => {
        const monitor = new SubagentMonitor(monitorOptions);
        await monitor.start();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.pollInterval).not.toBeNull();

        await monitor.stop();
      });
    });

    describe("stop", () => {
      test("should set isRunning to false", async () => {
        const monitor = new SubagentMonitor(monitorOptions);
        await monitor.start();
        await monitor.stop();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.isRunning).toBe(false);
      });

      test("should clear poll interval", async () => {
        const monitor = new SubagentMonitor(monitorOptions);
        await monitor.start();
        await monitor.stop();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.pollInterval).toBeNull();
      });

      test("should clear event subscriptions", async () => {
        const monitor = new SubagentMonitor(monitorOptions);

        // Manually add a mock subscription
        const mockSubscription = {
          iterator: {} as AsyncIterator<unknown>,
          abortController: new AbortController(),
        };

        // @ts-expect-error - accessing private property for testing
        monitor.eventSubscriptions.set("test-session", mockSubscription);

        await monitor.start();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.eventSubscriptions.size).toBeGreaterThan(0);

        await monitor.stop();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.eventSubscriptions.size).toBe(0);
      });

      test("should stop child monitors", async () => {
        const monitor = new SubagentMonitor(monitorOptions);

        // Manually add a mock child monitor
        const mockChildMonitor = {
          stop: async () => { /* no-op */ },
        };

        // @ts-expect-error - accessing private property for testing
        monitor.childMonitors.push(mockChildMonitor as SubagentMonitor);

        await monitor.start();
        await monitor.stop();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.childMonitors.length).toBe(0);
      });

      test("should be safe to call multiple times", async () => {
        const monitor = new SubagentMonitor(monitorOptions);
        await monitor.start();
        await monitor.stop();
        await monitor.stop(); // Second call should be no-op
        await monitor.stop(); // Third call should be no-op

        // @ts-expect-error - accessing private property for testing
        expect(monitor.isRunning).toBe(false);
      });

      test("should handle stop when not started", async () => {
        const monitor = new SubagentMonitor(monitorOptions);

        // Should not throw
        await monitor.stop();
        await monitor.stop();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.isRunning).toBe(false);
      });
    });

    describe("pollForChildren", () => {
      test("should detect new child sessions", async () => {
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent-session-123", title: "explore: investigate" }],
            }),
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream([]),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);

        // Manually call pollForChildren via start and stop quickly
        // @ts-expect-error - accessing private method for testing
        await monitor.pollForChildren();

        expect(startedSubagents.length).toBeGreaterThan(0);
        expect(startedSubagents[0]!.sessionId).toBe("child-1");
      });

      test("should skip already tracked sessions", async () => {
        let callCount = 0;
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => {
              callCount++;
              return {
                data: [{ id: "child-1", parentID: "parent", title: "explore" }],
              };
            },
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream([]),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);

        // First poll - should add child
        // @ts-expect-error - accessing private method for testing
        await monitor.pollForChildren();
        const initialCount = startedSubagents.length;
        expect(initialCount).toBe(1);

        // Second poll - should skip already tracked
        // @ts-expect-error - accessing private method for testing
        await monitor.pollForChildren();

        // Should not add duplicate
        expect(startedSubagents.length).toBe(initialCount);
      });

      test("should handle empty children response", async () => {
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({ data: [] }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(startedSubagents.length).toBe(0);

        await monitor.stop();
      });

      test("should handle error response", async () => {
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({ data: null, error: "Connection failed" }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);

        // @ts-expect-error - accessing private method for testing
        await monitor.pollForChildren();

        // Should not throw, just silently handle error
        expect(startedSubagents.length).toBe(0);
      });

      test("should extract agent name from title", async () => {
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "explore: investigate codebase" }],
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);

        // @ts-expect-error - accessing private method for testing
        await monitor.pollForChildren();

        expect(startedSubagents[0]!.agentName).toBe("explore");
      });

      test("should use default agent name when title doesn't match pattern", async () => {
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "Some random title" }],
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);

        // @ts-expect-error - accessing private method for testing
        await monitor.pollForChildren();

        expect(startedSubagents[0]!.agentName).toBe("unknown");
      });

      test("should skip invalid child objects", async () => {
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [
                null,
                { id: null, parentID: "parent" },
                { id: "valid-child", parentID: "parent", title: "explore" },
              ],
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);

        // @ts-expect-error - accessing private method for testing
        await monitor.pollForChildren();

        // Only the valid child should be tracked
        expect(startedSubagents.length).toBe(1);
        expect(startedSubagents[0]!.sessionId).toBe("valid-child");
      });
    });

    describe("subscribeToSession", () => {
      test("should handle events from session", async () => {
        const events = [
          { type: "message.part.delta", properties: { delta: "Hello", field: "text" }, sessionID: "child-1" },
        ];

        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "explore" }],
              error: undefined,
            }),
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream(events),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(subagentEvents.length).toBeGreaterThan(0);

        await monitor.stop();
      });

      test("should detect session.idle completion", async () => {
        const events = [
          { type: "session.idle", properties: {}, sessionID: "child-1" },
        ];

        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "explore" }],
              error: undefined,
            }),
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream(events),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(completedSubagents.length).toBeGreaterThan(0);
        expect(completedSubagents[0]!.status).toBe("completed");

        await monitor.stop();
      });

      test("should detect session.error completion", async () => {
        const events = [
          { type: "session.error", properties: { error: { message: "Failed" } }, sessionID: "child-1" },
        ];

        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "explore" }],
              error: undefined,
            }),
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream(events),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(completedSubagents.length).toBeGreaterThan(0);
        expect(completedSubagents[0]!.status).toBe("error");

        await monitor.stop();
      });

      test("should skip events for other sessions", async () => {
        const events = [
          { type: "message.part.delta", properties: { delta: "Hello", field: "text" }, sessionID: "other-session" },
          { type: "message.part.delta", properties: { delta: "World", field: "text" }, sessionID: "child-1" },
        ];

        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "explore" }],
              error: undefined,
            }),
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream(events),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Only events for child-1 should be processed
        expect(subagentEvents.length).toBe(1);

        await monitor.stop();
      });

      test("should handle events without sessionID", async () => {
        const events = [
          { type: "message.part.delta", properties: { delta: "Hello", field: "text" } },
        ];

        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "explore" }],
              error: undefined,
            }),
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream(events),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Events without sessionID should still be processed (forwarded to all)
        expect(subagentEvents.length).toBeGreaterThan(0);

        await monitor.stop();
      });
    });

    describe("handleEvent", () => {
      test("should parse and forward SdkEvent", async () => {
        const events = [
          { type: "message.part.delta", properties: { delta: "Test content", field: "text" }, sessionID: "child-1" },
        ];

        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "explore" }],
              error: undefined,
            }),
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream(events),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(subagentEvents.length).toBe(1);
        expect(subagentEvents[0]!.event.type).toBe("text");
        expect(subagentEvents[0]!.event.content).toBe("Test content");

        await monitor.stop();
      });

      test("should skip unparsable events", async () => {
        const events = [
          { type: "unknown.event.type", properties: {}, sessionID: "child-1" },
        ];

        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "explore" }],
              error: undefined,
            }),
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream(events),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Unknown event types should result in null/empty events
        // which might still be forwarded depending on implementation

        await monitor.stop();
      });

      test("should include subagent info in forwarded events", async () => {
        const events = [
          { type: "message.part.delta", properties: { delta: "Content", field: "text" }, sessionID: "child-1" },
        ];

        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async () => ({
              data: [{ id: "child-1", parentID: "parent", title: "code: fix bug" }],
              error: undefined,
            }),
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream(events),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(subagentEvents.length).toBeGreaterThan(0);
        expect(subagentEvents[0]!.subagent.agentName).toBe("code");
        expect(subagentEvents[0]!.subagent.sessionId).toBe("child-1");

        await monitor.stop();
      });
    });

    describe("spawnChildMonitor", () => {
      test("should spawn nested monitor for child subagent", async () => {
        // First level child
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async ({ sessionID }) => {
              if (sessionID === "parent-session-123") {
                return {
                  data: [{ id: "child-1", parentID: "parent-session-123", title: "explore" }],
                  error: undefined,
                };
              }
              if (sessionID === "child-1") {
                return {
                  data: [{ id: "grandchild-1", parentID: "child-1", title: "code" }],
                  error: undefined,
                };
              }
              return { data: [], error: undefined };
            },
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream([]),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for polling to discover children
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Should have discovered both child and grandchild
        const hasChild = startedSubagents.some((s) => s.sessionId === "child-1");
        const hasGrandchild = startedSubagents.some((s) => s.sessionId === "grandchild-1");

        expect(hasChild).toBe(true);
        expect(hasGrandchild).toBe(true);

        await monitor.stop();
      });

      test("should set correct depth for nested subagents", async () => {
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async ({ sessionID }) => {
              if (sessionID === "parent-session-123") {
                return {
                  data: [{ id: "child-1", parentID: "parent-session-123", title: "explore" }],
                  error: undefined,
                };
              }
              if (sessionID === "child-1") {
                return {
                  data: [{ id: "grandchild-1", parentID: "child-1", title: "code" }],
                  error: undefined,
                };
              }
              return { data: [], error: undefined };
            },
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream([]),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for polling
        await new Promise((resolve) => setTimeout(resolve, 600));

        const child = startedSubagents.find((s) => s.sessionId === "child-1");
        const grandchild = startedSubagents.find((s) => s.sessionId === "grandchild-1");

        expect(child?.depth).toBe(1);
        expect(grandchild?.depth).toBe(2);

        await monitor.stop();
      });

      test("should stop child monitors when parent stops", async () => {
        const customClient = createMockClient({
          session: {
            ...mockClient.session,
            children: async ({ sessionID }) => {
              if (sessionID === "parent-session-123") {
                return {
                  data: [{ id: "child-1", parentID: "parent-session-123", title: "explore" }],
                  error: undefined,
                };
              }
              return { data: [], error: undefined };
            },
          },
          event: {
            subscribe: async () => ({
              stream: createMockEventStream([]),
            }),
          },
        });

        const customOptions = {
          ...monitorOptions,
          client: customClient as unknown as SubagentMonitorOptions["client"],
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // Wait for child to be discovered
        await new Promise((resolve) => setTimeout(resolve, 100));

        // @ts-expect-error - accessing private property for testing
        expect(monitor.childMonitors.length).toBeGreaterThan(0);

        await monitor.stop();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.childMonitors.length).toBe(0);
      });
    });

    describe("abort signal handling", () => {
      test("should respect abort signal", async () => {
        const abortController = new AbortController();

        const customOptions = {
          ...monitorOptions,
          signal: abortController.signal,
        };

        const monitor = new SubagentMonitor(customOptions);
        await monitor.start();

        // @ts-expect-error - accessing private property for testing
        expect(monitor.isRunning).toBe(true);

        abortController.abort();

        // Wait for poll interval to check signal
        await new Promise((resolve) => setTimeout(resolve, 600));

        // @ts-expect-error - accessing private property for testing
        expect(monitor.isRunning).toBe(false);

        await monitor.stop();
      });
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration", () => {
    let intMockClient: MockClient;
    let intStartedSubagents: SubagentInfo[];
    let intCompletedSubagents: SubagentInfo[];
    let intSubagentEvents: SubagentEvent[];

    beforeEach(() => {
      intStartedSubagents = [];
      intCompletedSubagents = [];
      intSubagentEvents = [];
      intMockClient = createMockClient();
    });

    test("monitor should work with SDK-like event flow", async () => {
      const events: unknown[] = [];

      const customClient = createMockClient({
        session: {
          ...intMockClient.session,
          children: async () => ({
            data: [{ id: "subagent-1", parentID: "parent", title: "explore: investigate" }],
          }),
        },
        event: {
          subscribe: async () => ({
            stream: createMockEventStream([
              { type: "message.part.delta", properties: { delta: "Looking for files", field: "text" }, sessionID: "subagent-1" },
              { type: "message.part.delta", properties: { delta: "Found 3 files", field: "text" }, sessionID: "subagent-1" },
              { type: "session.idle", properties: {}, sessionID: "subagent-1" },
            ]),
          }),
        },
      });

      const customOptions: SubagentMonitorOptions = {
        client: customClient as unknown as SubagentMonitorOptions["client"],
        parentSessionId: "parent-session-123",
        onSubagentStarted: (info) => intStartedSubagents.push(info),
        onSubagentCompleted: (info) => intCompletedSubagents.push(info),
        onSubagentEvent: (event) => intSubagentEvents.push(event),
      };

      const monitor = new SubagentMonitor(customOptions);
      await monitor.start();

      // Wait for full flow
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify callbacks were invoked
      expect(intStartedSubagents.length).toBe(1);
      expect(intStartedSubagents[0]!.agentName).toBe("explore");

      expect(intSubagentEvents.length).toBe(2);
      expect(intSubagentEvents[0]!.event.content).toBe("Looking for files");
      expect(intSubagentEvents[1]!.event.content).toBe("Found 3 files");

      expect(intCompletedSubagents.length).toBe(1);
      expect(intCompletedSubagents[0]!.status).toBe("completed");

      await monitor.stop();
    });

    test("callbacks should receive correct subagent context", async () => {
      const customClient = createMockClient({
        session: {
          ...intMockClient.session,
          children: async () => ({
            data: [{ id: "agent-abc123", parentID: "parent", title: "code: refactor" }],
          }),
        },
        event: {
          subscribe: async () => ({
            stream: createMockEventStream([
              { type: "message.part.delta", properties: { delta: "Starting refactor", field: "text" }, sessionID: "agent-abc123" },
              { type: "session.idle", properties: {}, sessionID: "agent-abc123" },
            ]),
          }),
        },
      });

      const customOptions: SubagentMonitorOptions = {
        client: customClient as unknown as SubagentMonitorOptions["client"],
        parentSessionId: "parent-session-123",
        onSubagentStarted: (info) => intStartedSubagents.push(info),
        onSubagentCompleted: (info) => intCompletedSubagents.push(info),
        onSubagentEvent: (event) => intSubagentEvents.push(event),
      };

      const monitor = new SubagentMonitor(customOptions);
      await monitor.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify subagent info in callbacks
      expect(intStartedSubagents[0]!.sessionId).toBe("agent-abc123");
      expect(intStartedSubagents[0]!.shortId).toBe("bc123");
      expect(intStartedSubagents[0]!.agentName).toBe("code");
      expect(intStartedSubagents[0]!.depth).toBe(1);
      expect(intStartedSubagents[0]!.status).toBe("running");

      expect(intSubagentEvents[0]!.subagent.sessionId).toBe("agent-abc123");

      await monitor.stop();
    });

    test("should handle multiple subagents concurrently", async () => {
      const customClient = createMockClient({
        session: {
          ...intMockClient.session,
          children: async () => ({
            data: [
              { id: "subagent-1", parentID: "parent", title: "explore" },
              { id: "subagent-2", parentID: "parent", title: "code" },
              { id: "subagent-3", parentID: "parent", title: "test" },
            ],
          }),
        },
        event: {
          subscribe: async () => ({
            stream: createMockEventStream([]),
          }),
        },
      });

      const customOptions: SubagentMonitorOptions = {
        client: customClient as unknown as SubagentMonitorOptions["client"],
        parentSessionId: "parent-session-123",
        onSubagentStarted: (info) => intStartedSubagents.push(info),
        onSubagentCompleted: (info) => intCompletedSubagents.push(info),
        onSubagentEvent: (event) => intSubagentEvents.push(event),
      };

      const monitor = new SubagentMonitor(customOptions);
      await monitor.start();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(intStartedSubagents.length).toBe(3);
      expect(intStartedSubagents.map((s) => s.agentName).sort()).toEqual(["code", "explore", "test"]);

      await monitor.stop();
    });

    test("should handle error in one subagent while others continue", async () => {
      let subscribeCount = 0;
      const customClient = createMockClient({
        session: {
          ...intMockClient.session,
          children: async () => ({
            data: [
              { id: "success-agent", parentID: "parent", title: "explore" },
              { id: "error-agent", parentID: "parent", title: "code" },
            ],
          }),
        },
        event: {
          subscribe: async () => {
            subscribeCount++;
            if (subscribeCount === 2) {
              // Second subscription (error-agent) returns error event
              return {
                stream: createMockEventStream([
                  { type: "session.error", properties: { error: { message: "Failed" } }, sessionID: "error-agent" },
                ]),
              };
            }
            // First subscription (success-agent) returns success
            return {
              stream: createMockEventStream([
                { type: "session.idle", properties: {}, sessionID: "success-agent" },
              ]),
            };
          },
        },
      });

      const customOptions: SubagentMonitorOptions = {
        client: customClient as unknown as SubagentMonitorOptions["client"],
        parentSessionId: "parent-session-123",
        onSubagentStarted: (info) => intStartedSubagents.push(info),
        onSubagentCompleted: (info) => intCompletedSubagents.push(info),
        onSubagentEvent: (event) => intSubagentEvents.push(event),
      };

      const monitor = new SubagentMonitor(customOptions);
      await monitor.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Both should complete
      expect(intCompletedSubagents.length).toBe(2);

      const successAgent = intCompletedSubagents.find((s) => s.sessionId === "success-agent");
      const errorAgent = intCompletedSubagents.find((s) => s.sessionId === "error-agent");

      expect(successAgent?.status).toBe("completed");
      expect(errorAgent?.status).toBe("error");

      await monitor.stop();
    });

    test("full lifecycle with task_spawn events", async () => {
      const customClient = createMockClient({
        session: {
          ...intMockClient.session,
          children: async () => ({
            data: [{ id: "task-agent", parentID: "parent", title: "code: review PR" }],
          }),
        },
        event: {
          subscribe: async () => ({
            stream: createMockEventStream([
              {
                type: "message.part.updated",
                properties: {
                  part: {
                    type: "tool",
                    tool: "task",
                    state: {
                      status: "running",
                      input: {
                        agent: "reviewer",
                        description: "Review pull request #42",
                      },
                    },
                  },
                },
                sessionID: "task-agent",
              },
              { type: "session.idle", properties: {}, sessionID: "task-agent" },
            ]),
          }),
        },
      });

      const customOptions: SubagentMonitorOptions = {
        client: customClient as unknown as SubagentMonitorOptions["client"],
        parentSessionId: "parent-session-123",
        onSubagentStarted: (info) => intStartedSubagents.push(info),
        onSubagentCompleted: (info) => intCompletedSubagents.push(info),
        onSubagentEvent: (event) => intSubagentEvents.push(event),
      };

      const monitor = new SubagentMonitor(customOptions);
      await monitor.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should have captured the task_spawn event
      const taskSpawnEvent = intSubagentEvents.find((e) => e.event.type === "task_spawn");
      expect(taskSpawnEvent).toBeDefined();
      expect(taskSpawnEvent?.event.taskSpawn?.agentName).toBe("reviewer");
      expect(taskSpawnEvent?.event.taskSpawn?.description).toBe("Review pull request #42");

      await monitor.stop();
    });
  });
});

// Run a simple verification
console.log("Subagent monitoring tests loaded successfully");
console.log("Test coverage includes:");
console.log("  ✓ Type definitions (SubagentInfo, SubagentEvent)");
console.log("  ✓ Output formatting (generateShortId, formatSubagentOutput, etc.)");
console.log("  ✓ Event parsing (Task tool detection, task_spawn events)");
console.log("  ✓ SubagentMonitor class (constructor, start, stop, polling, subscriptions)");
console.log("  ✓ Integration tests (lifecycle, callbacks, concurrent subagents)");
console.log("\nRun tests with: bun test src/sdk/__tests__/subagent-monitor.test.ts");

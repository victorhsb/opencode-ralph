/**
 * Agent Module Tests
 */

import { describe, test, expect } from "bun:test";
import { formatAgentList, type AgentInfo } from "../agents";

describe("formatAgentList", () => {
  test("formats empty agent list", () => {
    const result = formatAgentList([]);
    expect(result).toBe("  (no primary agents available)");
  });

  test("formats single agent without description", () => {
    const agents: AgentInfo[] = [{ name: "build" }];
    const result = formatAgentList(agents);
    expect(result).toContain("build");
  });

  test("formats multiple agents with descriptions", () => {
    const agents: AgentInfo[] = [
      { name: "build", description: "Build-focused agent" },
      { name: "review", description: "Code review agent" },
    ];
    const result = formatAgentList(agents);
    expect(result).toContain("build");
    expect(result).toContain("Build-focused agent");
    expect(result).toContain("review");
    expect(result).toContain("Code review agent");
  });

  test("aligns agent names at same column position", () => {
    const agents: AgentInfo[] = [
      { name: "a", description: "Short" },
      { name: "verylongagentname", description: "Long" },
    ];
    const result = formatAgentList(agents);
    const lines = result.split("\n");
    expect(lines.length).toBe(2);
    // The description separator (" - ") should start at the same position
    // indicating names are properly aligned
    const descStartPos0 = lines[0].indexOf(" - ");
    const descStartPos1 = lines[1].indexOf(" - ");
    expect(descStartPos0).toBe(descStartPos1);
    expect(descStartPos0).toBeGreaterThan(2); // After the 2-space indent
  });
});

describe("AgentInfo interface", () => {
  test("accepts agent with name only", () => {
    const agent: AgentInfo = { name: "build" };
    expect(agent.name).toBe("build");
    expect(agent.description).toBeUndefined();
  });

  test("accepts agent with name and description", () => {
    const agent: AgentInfo = { name: "review", description: "Reviews code" };
    expect(agent.name).toBe("review");
    expect(agent.description).toBe("Reviews code");
  });
});

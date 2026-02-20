/**
 * Agent Validation Module
 *
 * Provides functions for querying and validating OpenCode SDK agents.
 */

import type { OpencodeClient } from "@opencode-ai/sdk";

export interface AgentInfo {
  name: string;
  description?: string;
}

/**
 * Query available primary agents from the SDK.
 * Filters for agents with mode === "primary".
 */
export async function listPrimaryAgents(client: OpencodeClient): Promise<AgentInfo[]> {
  const response = await client.app.agents();

  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }

  // Filter for primary agents only
  const primaryAgents = response.data.filter((agent: any) => agent.mode === "primary");

  return primaryAgents.map((agent: any) => ({
    name: agent.name,
    description: agent.description,
  }));
}

/**
 * Validate if an agent exists and is a primary agent.
 * Returns the agent info if valid, null otherwise.
 */
export async function validateAgent(
  client: OpencodeClient,
  agentName: string,
): Promise<AgentInfo | null> {
  const agents = await listPrimaryAgents(client);
  const found = agents.find((a) => a.name === agentName);
  return found || null;
}

/**
 * Format the list of agents for display.
 * Returns a formatted string with agent names and descriptions.
 */
export function formatAgentList(agents: AgentInfo[]): string {
  if (agents.length === 0) {
    return "  (no primary agents available)";
  }

  const lines: string[] = [];

  // Find the longest name for alignment
  const maxNameLength = Math.max(...agents.map((a) => a.name.length), 10);

  for (const agent of agents) {
    const namePadded = agent.name.padEnd(maxNameLength);
    const desc = agent.description ? ` - ${agent.description}` : "";
    lines.push(`  ${namePadded}${desc}`);
  }

  return lines.join("\n");
}

/**
 * Check if an agent exists and return an error message if not.
 */
export async function checkAgentExists(
  client: OpencodeClient,
  agentName: string,
): Promise<{ valid: boolean; error?: string; availableAgents?: AgentInfo[] }> {
  const agents = await listPrimaryAgents(client);
  const found = agents.find((a) => a.name === agentName);

  if (found) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Agent '${agentName}' not found.`,
    availableAgents: agents,
  };
}

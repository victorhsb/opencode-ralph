/**
 * Subagent Monitoring Types
 *
 * Type definitions for monitoring child sessions (subagents) spawned
 * by OpenCode SDK during execution.
 */

import type { SdkEvent } from "./executor.js";
import type { createOpencode } from "@opencode-ai/sdk/v2";

export type { SdkEvent };

/**
 * Information about a running or completed subagent session.
 * Tracks hierarchical relationships between parent and child sessions.
 */
export interface SubagentInfo {
  /** Full session ID from the SDK */
  sessionId: string;
  /** Shortened ID (last 6 characters) for display */
  shortId: string;
  /** Agent type/name (e.g., "explore", "general", "code") */
  agentName: string;
  /** Parent session ID that spawned this subagent */
  parentId: string;
  /** Nesting depth: 1 = direct child, 2+ = nested subagent */
  depth: number;
  /** Current execution status */
  status: "running" | "completed" | "error";
}

/**
 * Event emitted when a subagent generates an SDK event.
 * Links the event to the specific subagent that produced it.
 */
export interface SubagentEvent {
  /** Subagent that produced this event */
  subagent: SubagentInfo;
  /** The SDK event data */
  event: SdkEvent;
}

/**
 * Configuration options for the subagent monitor.
 * Provides callbacks for tracking subagent lifecycle and events.
 */
export interface SubagentMonitorOptions {
  /** OpenCode SDK client instance */
  client: Awaited<ReturnType<typeof createOpencode>>["client"];
  /** Parent session ID to monitor for child sessions */
  parentSessionId: string;
  /** Called for every SDK event from any subagent */
  onSubagentEvent: (event: SubagentEvent) => void;
  /** Called when a new subagent starts */
  onSubagentStarted: (info: SubagentInfo) => void;
  /** Called when a subagent completes (success or error) */
  onSubagentCompleted: (info: SubagentInfo) => void;
  /** Optional abort signal for cancellation */
  signal?: AbortSignal;
}

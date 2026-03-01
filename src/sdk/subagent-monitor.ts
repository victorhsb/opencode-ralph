/**
 * Subagent Monitor Module
 *
 * Monitors child sessions (subagents) spawned by the Task tool.
 * Handles polling for new children, event subscription, and recursive monitoring.
 */

import type { SubagentInfo, SubagentEvent, SubagentMonitorOptions } from "./subagent-types.js";
import { generateShortId } from "./subagent-output.js";
import type { SdkEvent } from "./executor.js";

/**
 * Poll interval in milliseconds for checking new child sessions.
 */
const POLL_INTERVAL_MS = 500;

/**
 * Default agent name when it cannot be detected from session data.
 */
const DEFAULT_AGENT_NAME = "unknown";

/**
 * Monitors child sessions spawned by the Task tool.
 *
 * Polls for new child sessions, subscribes to their events,
 * and recursively monitors nested subagents. Provides callbacks
 * for lifecycle events (start, events, completion).
 *
 * @example
 * const monitor = new SubagentMonitor({
 *   client,
 *   parentSessionId: "parent-123",
 *   onSubagentStarted: (info) => console.log(`Started: ${info.agentName}@${info.shortId}`),
 *   onSubagentEvent: (event) => console.log(event.event.content),
 *   onSubagentCompleted: (info) => console.log(`Completed: ${info.agentName}`),
 * });
 * await monitor.start();
 * // ... later ...
 * await monitor.stop();
 */
export class SubagentMonitor {
  private activeSubagents: Map<string, SubagentInfo>;
  private eventSubscriptions: Map<string, { iterator: AsyncIterator<unknown>; abortController: AbortController }>;
  private options: SubagentMonitorOptions;
  private pollInterval: ReturnType<typeof setInterval> | null;
  private isRunning: boolean;
  private childMonitors: SubagentMonitor[];

  /**
   * Creates a new SubagentMonitor instance.
   *
   * @param options - Configuration options including client, session ID, and callbacks
   */
  constructor(options: SubagentMonitorOptions) {
    this.options = options;
    this.activeSubagents = new Map();
    this.eventSubscriptions = new Map();
    this.pollInterval = null;
    this.isRunning = false;
    this.childMonitors = [];
  }

  /**
   * Starts monitoring for child sessions.
   *
   * Begins polling for new child sessions and sets up event subscriptions.
   * Can be safely called multiple times - subsequent calls are no-ops.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Do an initial poll immediately
    await this.pollForChildren();

    // Set up polling interval
    this.pollInterval = setInterval(async () => {
      if (!this.isRunning || this.options.signal?.aborted) {
        await this.stop();
        return;
      }
      await this.pollForChildren();
    }, POLL_INTERVAL_MS);
  }

  /**
   * Stops all monitoring and cleans up resources.
   *
   * Clears polling interval, aborts event subscriptions, and stops child monitors.
   * Safe to call multiple times.
   */
  async stop(): Promise<void> {
    if (!this.isRunning && !this.pollInterval) {
      return;
    }

    this.isRunning = false;

    // Clear poll interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Abort all event subscriptions
    for (const [sessionId, subscription] of this.eventSubscriptions) {
      try {
        subscription.abortController.abort();
      } catch (error) {
        // Ignore abort errors
      }
    }
    this.eventSubscriptions.clear();

    // Stop all child monitors
    for (const childMonitor of this.childMonitors) {
      try {
        await childMonitor.stop();
      } catch (error) {
        // Ignore child monitor stop errors
      }
    }
    this.childMonitors = [];
  }

  /**
   * Polls for new child sessions.
   *
   * Compares current children with active subagents and subscribes to new ones.
   * Silently handles errors to maintain continuous monitoring.
   */
  private async pollForChildren(): Promise<void> {
    try {
      if (this.options.signal?.aborted) {
        return;
      }

      const response = await this.options.client.session.children({
        sessionID: this.options.parentSessionId,
      });

      if (response.error || !response.data) {
        return;
      }

      const children = Array.isArray(response.data) ? response.data : [];

      for (const child of children) {
        if (!child || typeof child !== "object") {
          continue;
        }

        const sessionId = typeof (child as Record<string, unknown>)['id'] === "string"
          ? (child as Record<string, unknown>)['id'] as string
          : "";

        if (!sessionId) {
          continue;
        }

        // Skip if already tracked
        if (this.activeSubagents.has(sessionId)) {
          continue;
        }

        // Extract parent ID and title
        const parentId = typeof (child as Record<string, unknown>)['parentID'] === "string"
          ? (child as Record<string, unknown>)['parentID'] as string
          : this.options.parentSessionId;

        const title = typeof (child as Record<string, unknown>)['title'] === "string"
          ? (child as Record<string, unknown>)['title'] as string
          : "";

        // Try to extract agent name from title or use default
        const agentName = this.extractAgentNameFromTitle(title) || DEFAULT_AGENT_NAME;

        // Create subagent info
        const subagentInfo: SubagentInfo = {
          sessionId,
          shortId: generateShortId(sessionId),
          agentName,
          parentId,
          depth: 1,
          status: "running",
        };

        this.activeSubagents.set(sessionId, subagentInfo);

        // Notify that subagent started
        this.options.onSubagentStarted(subagentInfo);

        // Subscribe to events for this session
        await this.subscribeToSession(sessionId, subagentInfo);

        // Spawn child monitor for nested subagents
        await this.spawnChildMonitor(subagentInfo);
      }
    } catch (error) {
      // Silently ignore polling errors - we'll retry on next poll
    }
  }

  /**
   * Extracts agent name from session title.
   *
   * Attempts to parse the title to extract the agent type.
   * Returns null if no agent name can be determined.
   *
   * @param title - Session title which may contain agent name
   * @returns Extracted agent name or null
   */
  private extractAgentNameFromTitle(title: string): string | null {
    if (!title) {
      return null;
    }

    // Try common patterns:
    // "explore: ..." or "explore agent" or similar
    const patterns = [
      /^(\w+):/, // "agent: ..."
      /^(\w+)\s+agent/i, // "agent agent"
      /\b(\w+)\s+subagent/i, // "... subagent"
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        const name = match[1].toLowerCase();
        // Filter out common non-agent words
        if (!["session", "task", "subtask"].includes(name)) {
          return name;
        }
      }
    }

    return null;
  }

  /**
   * Subscribes to events for a specific child session.
   *
   * Sets up event stream and forwards parsed events to the callback.
   * Handles session completion detection.
   *
   * @param sessionId - Session ID to subscribe to
   * @param info - Subagent information for this session
   */
  private async subscribeToSession(sessionId: string, info: SubagentInfo): Promise<void> {
    try {
      const abortController = new AbortController();

      // Create subscription to events
      const eventSubscription = await this.options.client.event.subscribe();

      this.eventSubscriptions.set(sessionId, {
        iterator: eventSubscription.stream[Symbol.asyncIterator](),
        abortController,
      });

      // Process events in background
      (async () => {
        try {
          for await (const event of eventSubscription.stream) {
            // Check if we should stop
            if (!this.isRunning || abortController.signal.aborted || this.options.signal?.aborted) {
              break;
            }

            // Check if this event is for our session
            const eventObj = event as Record<string, unknown>;
            const eventSessionId = typeof eventObj['sessionID'] === "string"
              ? eventObj['sessionID']
              : "";

            // Skip events for other sessions
            if (eventSessionId && eventSessionId !== sessionId) {
              continue;
            }

            // Handle the event
            this.handleEvent(info, event);

            // Check for session completion
            const eventType = typeof eventObj['type'] === "string" ? eventObj['type'] : "";
            if (eventType === "session.idle" || eventType === "session.error") {
              // Update status based on event type
              const finalStatus: SubagentInfo["status"] = eventType === "session.error" ? "error" : "completed";
              info.status = finalStatus;

              // Notify completion
              this.options.onSubagentCompleted(info);

              // Clean up subscription
              this.eventSubscriptions.delete(sessionId);

              break;
            }
          }
        } catch (error) {
          // Mark as error and notify
          info.status = "error";
          this.options.onSubagentCompleted(info);
        }
      })();
    } catch (error) {
      // Mark as error and continue
      info.status = "error";
      this.options.onSubagentCompleted(info);
    }
  }

  /**
   * Handles a raw SDK event by parsing and forwarding to callback.
   *
   * Parses the event using the same logic as executor.ts and creates
   * a SubagentEvent to forward to the onSubagentEvent callback.
   *
   * @param info - Subagent information for event attribution
   * @param rawEvent - Raw event from SDK
   */
  private handleEvent(info: SubagentInfo, rawEvent: unknown): void {
    const sdkEvent = this.parseSdkEvent(rawEvent);

    if (!sdkEvent) {
      return;
    }

    const subagentEvent: SubagentEvent = {
      subagent: info,
      event: sdkEvent,
    };

    this.options.onSubagentEvent(subagentEvent);
  }

  /**
   * Spawns a child monitor for nested subagent tracking.
   *
   * Creates a new SubagentMonitor for the given subagent's children,
   * allowing recursive monitoring of the full subagent hierarchy.
   *
   * @param parentInfo - Parent subagent information
   */
  private async spawnChildMonitor(parentInfo: SubagentInfo): Promise<void> {
    try {
      // Create child monitor with same callbacks but increased depth
      const childOptions: SubagentMonitorOptions = {
        client: this.options.client,
        parentSessionId: parentInfo.sessionId,
        onSubagentStarted: (childInfo) => {
          // Adjust depth based on parent
          childInfo.depth = parentInfo.depth + 1;
          childInfo.parentId = parentInfo.sessionId;
          this.options.onSubagentStarted(childInfo);
        },
        onSubagentEvent: this.options.onSubagentEvent,
        onSubagentCompleted: this.options.onSubagentCompleted,
      };

      // Only add signal if it exists
      if (this.options.signal) {
        childOptions.signal = this.options.signal;
      }

      const childMonitor = new SubagentMonitor(childOptions);

      this.childMonitors.push(childMonitor);

      // Start the child monitor
      await childMonitor.start();
    } catch (error) {
      // Silently handle child monitor spawn failures
    }
  }

  /**
   * Parses a raw SDK event into SdkEvent format.
   *
   * Reuses the parsing logic pattern from executor.ts to handle
   * OpenCode SDK event types consistently.
   *
   * @param event - Raw event from SDK
   * @returns Parsed SdkEvent or null if event cannot be parsed
   */
  private parseSdkEvent(event: unknown): SdkEvent | null {
    const timestamp = Date.now();

    if (!event || typeof event !== "object") {
      return null;
    }

    const eventObj = event as Record<string, unknown>;
    const eventType = typeof eventObj['type'] === "string" ? eventObj['type'] : "";
    const props = (eventObj['properties'] || {}) as Record<string, unknown>;

    // Handle message.part.delta - streaming text chunks
    if (eventType === "message.part.delta") {
      const delta = typeof props['delta'] === "string" ? props['delta'] : "";
      const field = typeof props['field'] === "string" ? props['field'] : "";

      if (field === "text" && delta) {
        return {
          type: "text",
          content: delta,
          timestamp,
        };
      }

      return null;
    }

    // Handle message.part.updated - complete parts
    if (eventType === "message.part.updated") {
      const part = (props['part'] || {}) as Record<string, unknown>;
      const partType = typeof part['type'] === "string" ? part['type'] : "";

      // Handle tool parts
      if (partType === "tool") {
        const toolName = typeof part['tool'] === "string" ? part['tool'] : "unknown";
        const state = (part['state'] || {}) as Record<string, unknown>;
        const status = typeof state['status'] === "string" ? state['status'] : "";

        // Handle Task tool invocations
        if (toolName === "task") {
          const input = (state['input'] ?? part['input']) as Record<string, unknown> | undefined;
          const agentName = typeof input?.['agent'] === "string" ? input['agent'] : undefined;
          const description = typeof input?.['description'] === "string" ? input['description'] : undefined;

          if (status === "running" || status === "completed") {
            const taskSpawn: SdkEvent["taskSpawn"] = {};
            if (agentName !== undefined) {
              taskSpawn.agentName = agentName;
            }
            if (description !== undefined) {
              taskSpawn.description = description;
            }
            return {
              type: "task_spawn",
              toolName,
              taskSpawn,
              timestamp,
            };
          }
        }

        // Tool is starting
        if (status === "running") {
          return {
            type: "tool_start",
            toolName,
            timestamp,
          };
        }

        // Tool completed
        if (status === "completed") {
          const toolResult: SdkEvent["result"] = {};
          if (state['input'] !== undefined && typeof state['input'] === "object" && state['input'] !== null) {
            toolResult.input = state['input'] as Record<string, unknown>;
          }
          if (typeof state['output'] === "string") {
            toolResult.output = state['output'];
          }
          if (typeof state['title'] === "string") {
            toolResult.title = state['title'];
          }
          return {
            type: "tool_end",
            toolName,
            result: toolResult,
            timestamp,
          };
        }
      }

      // Handle text parts from assistant
      if (partType === "text") {
        const text = typeof part['text'] === "string" ? part['text'] : "";
        const role = typeof part['role'] === "string" ? part['role'] : "";
        if (text && role === "assistant") {
          return {
            type: "text",
            content: text,
            timestamp,
          };
        }
      }

      // Handle reasoning/thinking
      if (partType === "reasoning" || partType === "thinking") {
        const text = typeof part['text'] === "string" ? part['text'] : "";
        if (text) {
          return {
            type: "thinking",
            content: text,
            timestamp,
          };
        }
      }
    }

    // Handle session errors
    if (eventType === "session.error") {
      const error = (props['error'] || {}) as Record<string, unknown>;
      let errorMessage = "Unknown error";

      if (typeof error['data'] === "object" && error['data'] !== null) {
        const errorData = error['data'] as Record<string, unknown>;
        if (typeof errorData['message'] === "string") {
          errorMessage = errorData['message'];
        }
      }

      if (errorMessage === "Unknown error" && typeof error['message'] === "string") {
        errorMessage = error['message'];
      }

      return {
        type: "error",
        content: errorMessage,
        timestamp,
      };
    }

    return null;
  }
}

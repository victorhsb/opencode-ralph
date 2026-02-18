/**
 * SDK Executor Module
 *
 * Execute prompts using SDK with real-time event streaming.
 * Handles session creation, event subscription, and tool tracking.
 */

import type { OpenCodeClient } from "@opencode-ai/sdk";

export interface ExecutionResult {
  /** The text output from the execution */
  output: string;
  /** Map of tool names to their invocation counts */
  toolCounts: Map<string, number>;
  /** Array of error messages encountered during execution */
  errors: string[];
  /** Whether the execution was successful */
  success: boolean;
  /** Exit code (0 for success, non-zero for failure) */
  exitCode: number;
}

export interface ExecutionOptions {
  /** The OpenCode SDK client instance */
  client: OpenCodeClient;
  /** The prompt text to send */
  prompt: string;
  /** Optional model override */
  model?: string;
  /** Optional callback for real-time event display */
  onEvent?: (event: SdkEvent) => void;
  /** Optional abort signal for cancellation */
  signal?: AbortSignal;
}

export interface SdkEvent {
  /** Event type */
  type: "text" | "tool_start" | "tool_end" | "thinking" | "error";
  /** Event content (if applicable) */
  content?: string;
  /** Tool name (for tool events) */
  toolName?: string;
  /** Event timestamp */
  timestamp: number;
}

/**
 * Execute a prompt using the SDK with real-time event streaming.
 *
 * Flow:
 * 1. Create fresh session
 * 2. Subscribe to events
 * 3. Send prompt
 * 4. Collect response and tool usage
 * 5. Return structured result
 *
 * Each call creates a new session (no persistence across calls).
 */
export async function executePrompt(
  options: ExecutionOptions
): Promise<ExecutionResult> {
  const { client, prompt, model, onEvent, signal } = options;

  const toolCounts = new Map<string, number>();
  const errors: string[] = [];
  let output = "";

  try {
    // Create fresh session
    const session = await client.session.create({
      body: { title: `Ralph iteration ${Date.now()}` },
    });

    // Subscribe to events for real-time tracking
    const eventSubscription = await client.event.subscribe();
    
    // Small delay to ensure event subscription is active before sending prompt
    await new Promise(resolve => setTimeout(resolve, 100));

    // Process events in background
    let sessionComplete = false;
    const eventPromise = (async () => {
      try {
        for await (const event of eventSubscription.stream) {
          if (signal?.aborted) break;

          // Check for session completion events
          const eventType = (event as any)?.type;
          if (eventType === "session.idle" || eventType === "session.error") {
            sessionComplete = true;
          }

          const sdkEvent = parseSdkEvent(event);

          // Track tools
          if (sdkEvent.type === "tool_start" && sdkEvent.toolName) {
            toolCounts.set(
              sdkEvent.toolName,
              (toolCounts.get(sdkEvent.toolName) ?? 0) + 1
            );
          }

          // Build output from text events
          if (sdkEvent.type === "text" && sdkEvent.content) {
            output += sdkEvent.content;
          }

          // Callback for real-time display
          onEvent?.(sdkEvent);

          // Exit loop when session is complete
          if (sessionComplete) {
            break;
          }
        }
      } catch (error) {
        // Stream errors are logged but don't stop execution
        errors.push(`Event stream error: ${error}`);
      }
    })();

    // Send prompt
    const modelConfig = model
      ? {
          providerID: model.split("/")[0] || "openai",
          modelID: model.split("/")[1] || model,
        }
      : undefined;

    const result = await client.session.prompt({
      path: { id: session.id },
      body: {
        model: modelConfig,
        parts: [{ type: "text" as const, text: prompt }],
      },
    });

    // Wait for events to complete (with timeout)
    const timeoutPromise = new Promise<void>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Event stream timeout"));
      }, 30000);
      signal?.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(new Error("Aborted"));
      });
    });

    try {
      await Promise.race([eventPromise, timeoutPromise]);
    } catch (error) {
      if (String(error).includes("Aborted")) {
        throw error;
      }
      // Timeout is not fatal - continue with what we have
    }

    // Extract final output from result
    const finalOutput = extractOutputFromMessage(result);

    return {
      output: finalOutput || output,
      toolCounts,
      errors,
      success: true,
      exitCode: 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      output,
      toolCounts,
      errors,
      success: false,
      exitCode: 1,
    };
  }
}

/**
 * Parse SDK event into internal event format.
 *
 * Handles OpenCode SDK event types:
 * - message.part.delta: Streaming text chunks (properties.delta)
 * - message.part.updated: Complete message parts (properties.part)
 * - session.error: Error events
 * - session.idle: Completion indicator
 */
function parseSdkEvent(event: unknown): SdkEvent {
  const timestamp = Date.now();

  if (!event || typeof event !== "object") {
    return {
      type: "text",
      content: "",
      timestamp,
    };
  }

  const eventObj = event as Record<string, unknown>;
  const eventType = typeof eventObj.type === "string" ? eventObj.type : "";
  const props = (eventObj.properties || {}) as Record<string, unknown>;

  // Handle message.part.delta - streaming text chunks
  if (eventType === "message.part.delta") {
    const delta = typeof props.delta === "string" ? props.delta : "";
    const field = typeof props.field === "string" ? props.field : "";
    
    // Only process text deltas, not other field types
    if (field === "text" && delta) {
      return {
        type: "text",
        content: delta,
        timestamp,
      };
    }
    
    return {
      type: "text",
      content: "",
      timestamp,
    };
  }

  // Handle message.part.updated - complete parts
  if (eventType === "message.part.updated") {
    const part = (props.part || {}) as Record<string, unknown>;
    const partType = typeof part.type === "string" ? part.type : "";
    
    // Handle tool usage
    if (partType === "tool_use") {
      const toolName = typeof part.name === "string" ? part.name : "unknown";
      return {
        type: "tool_start",
        toolName,
        timestamp,
      };
    }
    
    // Handle tool results
    if (partType === "tool_result") {
      const toolName = typeof part.name === "string" ? part.name : "unknown";
      return {
        type: "tool_end",
        toolName,
        timestamp,
      };
    }
    
    // Handle text parts from assistant
    if (partType === "text") {
      const text = typeof part.text === "string" ? part.text : "";
      const role = typeof part.role === "string" ? part.role : "";
      // Only include if it's from assistant and has content
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
      const text = typeof part.text === "string" ? part.text : "";
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
    const error = (props.error || {}) as Record<string, unknown>;
    const errorMessage = 
      typeof error.data?.message === "string" 
        ? error.data.message 
        : typeof error.message === "string"
          ? error.message
          : "Unknown error";
    return {
      type: "error",
      content: errorMessage,
      timestamp,
    };
  }

  // Default: no content
  return {
    type: "text",
    content: "",
    timestamp,
  };
}

/**
 * Extract text output from SDK message response.
 *
 * The message structure from SDK typically contains:
 * - role: "assistant"
 * - content: Array of content parts
 * - Each part can be text, thinking, tool_use, or tool_result
 */
function extractOutputFromMessage(
  message: unknown
): string {
  if (!message || typeof message !== "object") {
    return "";
  }

  const msg = message as Record<string, unknown>;
  const output: string[] = [];

  // Extract from content array
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (typeof part === "object" && part !== null) {
        const partObj = part as Record<string, unknown>;

        // Text content
        if (partObj.type === "text" && typeof partObj.text === "string") {
          output.push(partObj.text);
        }

        // Thinking content (optional - can be included for debugging)
        if (
          partObj.type === "thinking" &&
          typeof partObj.thinking === "string"
        ) {
          output.push(`[Thinking: ${partObj.thinking}]`);
        }

        // Tool results (show summary)
        if (partObj.type === "tool_result" && typeof partObj.name === "string") {
          output.push(`[Tool ${partObj.name} executed]`);
        }
      }
    }
  }

  // Fallback: try to extract from text field directly
  if (output.length === 0 && typeof msg.text === "string") {
    output.push(msg.text);
  }

  return output.join("\n");
}

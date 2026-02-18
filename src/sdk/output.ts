/**
 * SDK Output Module
 *
 * Format SDK response parts and events for display.
 * Handles different message part types and event formatting.
 */

import type { SdkEvent } from "./executor";

/**
 * Interface representing a message part from the SDK.
 * Matches the SDK Part type structure.
 */
interface Part {
  type: "text" | "thinking" | "tool_use" | "tool_result" | string;
  text?: string;
  thinking?: string;
  name?: string;
  result?: unknown;
}

/**
 * Interface representing an assistant message from the SDK.
 */
interface AssistantMessage {
  role: "assistant";
  content?: Part[] | unknown;
  text?: string;
}

/**
 * Format SDK response parts into displayable text.
 *
 * Handles different part types:
 * - text: Direct text content
 * - thinking: Internal reasoning (optional display)
 * - tool_use: Tool invocation display
 * - tool_result: Tool output display
 *
 * @param parts - Array of message parts from SDK
 * @returns Formatted text string
 */
export function formatResponseParts(parts: Part[]): string {
  return parts
    .map((part) => formatPart(part))
    .filter(Boolean)
    .join("\n");
}

/**
 * Format a single message part based on its type.
 *
 * @param part - Message part to format
 * @returns Formatted string representation
 */
function formatPart(part: Part): string {
  switch (part.type) {
    case "text":
      return part.text || "";

    case "thinking":
      // Optionally display thinking with prefix
      return part.thinking ? `💭 ${part.thinking}` : "";

    case "tool_use":
      return part.name ? `🔧 Using tool: ${part.name}` : "";

    case "tool_result":
      return part.name ? `✓ Tool result: ${part.name}` : "";

    default:
      // For unknown types, try to extract text if available
      if (part.text) return part.text;
      return "";
  }
}

/**
 * Extract all text content from an assistant message.
 *
 * Iterates through message content parts and extracts
 * text from each applicable part type.
 *
 * @param message - Assistant message from SDK
 * @returns Concatenated text content
 */
export function extractTextFromMessage(message: AssistantMessage): string {
  if (!message || typeof message !== "object") {
    return "";
  }

  // If message has a direct text field, use it
  if (typeof message.text === "string" && message.text) {
    return message.text;
  }

  // Process content array
  if (Array.isArray(message.content)) {
    const textParts: string[] = [];

    for (const part of message.content) {
      if (typeof part === "object" && part !== null) {
        const typedPart = part as Part;

        // Extract text from text parts
        if (typedPart.type === "text" && typedPart.text) {
          textParts.push(typedPart.text);
        }

        // Optionally include thinking content
        if (typedPart.type === "thinking" && typedPart.thinking) {
          textParts.push(`[Thinking: ${typedPart.thinking}]`);
        }

        // Include tool execution summary
        if (typedPart.type === "tool_result" && typedPart.name) {
          textParts.push(`[Tool ${typedPart.name} executed]`);
        }
      }
    }

    return textParts.join("\n");
  }

  return "";
}

/**
 * Format event for display (real-time streaming).
 *
 * Converts SDK events into human-readable format
 * with appropriate prefixes and emoji indicators.
 *
 * @param event - SDK event to format
 * @returns Formatted display string
 */
export function formatEvent(event: SdkEvent): string {
  switch (event.type) {
    case "text":
      return event.content || "";

    case "thinking":
      return event.content ? `💭 ${event.content}` : "";

    case "tool_start":
      return event.toolName ? `🔧 ${event.toolName}...` : "🔧 Using tool...";

    case "tool_end":
      return event.toolName ? `✓ ${event.toolName}` : "✓ Tool complete";

    case "error":
      return event.content ? `❌ ${event.content}` : "❌ Error occurred";

    default:
      return "";
  }
}

/**
 * Format tool counts for display summary.
 *
 * @param toolCounts - Map of tool names to invocation counts
 * @returns Formatted summary string
 */
export function formatToolSummary(toolCounts: Map<string, number>): string {
  if (toolCounts.size === 0) {
    return "No tools used";
  }

  const entries = Array.from(toolCounts.entries());
  const summary = entries
    .map(([name, count]) => `${name}: ${count}`)
    .join(", ");

  return `Tools used: ${summary}`;
}

/**
 * Subagent Output Formatting
 *
 * Utilities for formatting subagent output with proper indentation,
 * coloring, and prefixing for hierarchical display.
 */

import type { SubagentInfo } from "./subagent-types.js";

/**
 * ANSI escape codes for text formatting.
 */
export const GRAY = "\x1b[90m";
export const RESET = "\x1b[0m";

/**
 * Generate a short ID from a full session ID.
 *
 * Extracts the last 6 characters of the session ID and converts to lowercase.
 * Useful for creating compact, readable identifiers for display.
 *
 * @param sessionId - The full session ID from the SDK
 * @returns Lowercase 6-character short ID
 * @example
 * generateShortId("sess-abc123-def456"); // Returns "ef456"
 * generateShortId("ABC-DEF-GHI"); // Returns "f-ghi"
 */
export function generateShortId(sessionId: string): string {
  if (!sessionId || sessionId.length === 0) {
    return "";
  }
  const lastSix = sessionId.slice(-6);
  return lastSix.toLowerCase();
}

/**
 * Generate indentation string based on subagent depth.
 *
 * Each depth level adds 2 spaces of indentation.
 *
 * @param depth - Nesting depth (1 = direct child, 2+ = nested)
 * @returns Indentation string with appropriate spaces
 */
function getIndent(depth: number): string {
  return " ".repeat(depth * 2);
}

/**
 * Format subagent output content with proper prefix and styling.
 *
 * Each line is prefixed with "subagent <agent>@<short-id>: " and indented
 * according to the subagent's depth in the hierarchy. All output is rendered
 * in gray text.
 *
 * @param info - Subagent information containing agent name, short ID, and depth
 * @param content - The content to format (may contain multiple lines)
 * @returns Formatted string with gray color, indentation, and prefix
 * @example
 * const info = {
 *   sessionId: "sess-abc123-def456",
 *   shortId: "ef456",
 *   agentName: "explore",
 *   parentId: "parent-sess",
 *   depth: 1,
 *   status: "running"
 * };
 * formatSubagentOutput(info, "I need to investigate Y");
 * // Returns: "\x1b[90m  subagent explore@ef456: I need to investigate Y\x1b[0m"
 */
export function formatSubagentOutput(info: SubagentInfo, content: string): string {
  if (!content || content.length === 0) {
    return "";
  }

  const indent = getIndent(info.depth);
  const prefix = `subagent ${info.agentName}@${info.shortId}: `;

  // Split content into lines and format each
  const lines = content.split("\n");
  const formattedLines = lines.map((line) => {
    // Trim trailing whitespace but preserve leading whitespace for indentation
    const trimmedLine = line.trimEnd();
    if (trimmedLine.length === 0) {
      // Empty lines still get the gray formatting and indent (no prefix)
      return `${GRAY}${indent}${RESET}`;
    }
    return `${GRAY}${indent}${prefix}${trimmedLine}${RESET}`;
  });

  return formattedLines.join("\n");
}

/**
 * Format a subagent start notification.
 *
 * Displays an arrow indicating a new subagent has started, with
 * proper indentation and gray coloring.
 *
 * @param info - Subagent information for the started subagent
 * @returns Formatted start notification string
 * @example
 * formatSubagentStart(info);
 * // Returns: "\x1b[90m  ↳ subagent explore@ef456 started\x1b[0m"
 */
export function formatSubagentStart(info: SubagentInfo): string {
  const indent = getIndent(info.depth);
  return `${GRAY}${indent}↳ subagent ${info.agentName}@${info.shortId} started${RESET}`;
}

/**
 * Format a subagent completion notification.
 *
 * Displays a checkmark for successful completion or an X for errors,
 * with proper indentation and gray coloring.
 *
 * @param info - Subagent information including final status
 * @returns Formatted end notification string
 * @example
 * // For completed status:
 * formatSubagentEnd(info);
 * // Returns: "\x1b[90m  ✓ subagent explore@ef456 completed\x1b[0m"
 *
 * // For error status:
 * formatSubagentEnd(info);
 * // Returns: "\x1b[90m  ✗ subagent explore@ef456 error\x1b[0m"
 */
export function formatSubagentEnd(info: SubagentInfo): string {
  const indent = getIndent(info.depth);
  const symbol = info.status === "error" ? "✗" : "✓";
  const statusText = info.status === "error" ? "error" : "completed";

  return `${GRAY}${indent}${symbol} subagent ${info.agentName}@${info.shortId} ${statusText}${RESET}`;
}

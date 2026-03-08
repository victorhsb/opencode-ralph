/**
 * Subagent Output Formatting
 *
 * Utilities for formatting subagent output with proper indentation,
 * coloring, and prefixing for hierarchical display.
 *
 * Re-exports identity helpers for backward compatibility.
 */

import type { SubagentInfo } from "./subagent-types.js";
import {
  GRAY,
  RESET,
  getIndent,
  getSubagentPrefix,
  formatSubagentStart as formatSubagentStartShared,
  formatSubagentEnd as formatSubagentEndShared,
} from "./subagent-format.js";

// Re-export identity helper for backward compatibility
export { generateShortId } from "./subagent-identity.js";

export { GRAY, RESET };

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
  const prefix = getSubagentPrefix(info);

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
  return formatSubagentStartShared(info);
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
  return formatSubagentEndShared(info);
}

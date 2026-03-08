/**
 * Subagent Formatting Helpers
 *
 * Shared formatting primitives for ANSI codes, indentation,
 * and subagent label/prefix generation.
 */

import type { SubagentInfo } from "./subagent-types.js";

/**
 * ANSI escape codes for text formatting.
 */
export const GRAY = "\x1b[90m";
export const RESET = "\x1b[0m";

/**
 * Generate indentation string based on subagent depth.
 *
 * Each depth level adds 2 spaces of indentation.
 *
 * @param depth - Nesting depth (1 = direct child, 2+ = nested)
 * @returns Indentation string with appropriate spaces
 */
export function getIndent(depth: number): string {
  return " ".repeat(depth * 2);
}

/**
 * Generate a subagent prefix string.
 *
 * Format: "subagent <agentName>@<shortId>: "
 *
 * @param info - Subagent information containing agent name and short ID
 * @returns Prefix string for subagent output
 */
export function getSubagentPrefix(info: SubagentInfo): string {
  return `subagent ${info.agentName}@${info.shortId}: `;
}

/**
 * Format a subagent start notification.
 *
 * Displays an arrow indicating a new subagent has started, with
 * proper indentation and gray coloring.
 *
 * @param info - Subagent information for the started subagent
 * @returns Formatted start notification string
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
 */
export function formatSubagentEnd(info: SubagentInfo): string {
  const indent = getIndent(info.depth);
  const symbol = info.status === "error" ? "✗" : "✓";
  const statusText = info.status === "error" ? "error" : "completed";

  return `${GRAY}${indent}${symbol} subagent ${info.agentName}@${info.shortId} ${statusText}${RESET}`;
}

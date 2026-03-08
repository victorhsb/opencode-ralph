/**
 * Subagent Streaming Formatter
 *
 * Stateful formatter for streaming subagent output that ensures
 * the prefix is only printed at the beginning of lines, not on
 * every text chunk.
 */

import type { SubagentInfo } from "./subagent-types.js";

/**
 * ANSI escape codes for text formatting.
 */
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

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
 * Formatter for streaming subagent output chunks.
 *
 * Maintains internal state to ensure the subagent prefix is only
 * printed at the beginning of lines, preventing garbled output when
 * text arrives in small chunks (words/characters).
 *
 * @example
 * const formatter = new SubagentStreamingFormatter(info);
 * formatter.formatChunk("Hello")     // "  subagent explore@zawwzv: Hello"
 * formatter.formatChunk(" world")    // " world"
 * formatter.formatChunk("\nNext")     // "\n  subagent explore@zawwzv: Next"
 * formatter.formatChunk(" line")      // " line"
 */
export class SubagentStreamingFormatter {
  /** Subagent information for prefix generation */
  private readonly info: SubagentInfo;
  /** Indentation string based on depth */
  private readonly indent: string;
  /** Prefix string with agent name and short ID */
  private readonly prefix: string;
  /** Tracks whether we're at the start of a line */
  private isAtLineStart: boolean;

  /**
   * Create a new streaming formatter for a subagent.
   *
   * @param info - Subagent information containing agent name, short ID, and depth
   */
  constructor(info: SubagentInfo) {
    this.info = info;
    this.indent = getIndent(info.depth);
    this.prefix = `subagent ${info.agentName}@${info.shortId}: `;
    this.isAtLineStart = true;
  }

  /**
   * Format a text chunk for streaming output.
   *
   * Handles the prefix insertion logic:
   * - If at line start: outputs gray color + indent + prefix before content
   * - If content contains newlines: inserts prefix after each newline
   * - Properly handles state tracking for subsequent chunks
   *
   * @param chunk - Raw text chunk from the subagent stream
   * @returns Formatted string ready for display
   */
  formatChunk(chunk: string): string {
    if (!chunk || chunk.length === 0) {
      return "";
    }

    // Split the chunk by newlines to handle line boundaries
    const lines = chunk.split("\n");
    const formattedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const isLastLine = i === lines.length - 1;

      if (this.isAtLineStart && line.length > 0) {
        // At line start with content: add prefix
        formattedLines.push(`${GRAY}${this.indent}${this.prefix}${line}${RESET}`);
        this.isAtLineStart = false;
      } else if (!this.isAtLineStart) {
        // Not at line start: just add the content (already has color from prefix)
        formattedLines.push(line);
      } else {
        // At line start but empty line (consecutive newlines)
        formattedLines.push(`${GRAY}${this.indent}${RESET}`);
      }

      // If not the last line, we hit a newline
      if (!isLastLine) {
        // Add the newline separator back
        formattedLines.push("\n");
        // Next line starts fresh
        this.isAtLineStart = true;
      }
    }

    return formattedLines.join("");
  }

  /**
   * Flush any pending output.
   *
   * Ensures the formatter state is clean, optionally adding
   * a newline if the output ended mid-line.
   *
   * @returns Empty string (no pending output in current implementation)
   */
  flush(): string {
    // Current implementation maintains state per chunk,
    // so there's no buffered content to flush.
    // Future implementations might buffer partial words.
    return "";
  }

  /**
   * Reset the formatter to initial state.
   *
   * Clears the line position tracking, causing the next
   * formatted chunk to include the prefix at line start.
   */
  reset(): void {
    this.isAtLineStart = true;
  }
}

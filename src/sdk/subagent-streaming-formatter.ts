/**
 * Subagent Streaming Formatter
 *
 * Stateful formatter for streaming subagent output that ensures
 * the prefix is only printed at the beginning of lines, not on
 * every text chunk.
 */

import type { SubagentInfo } from "./subagent-types.js";
import { GRAY, RESET, getIndent, getSubagentPrefix } from "./subagent-format.js";

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
  /** Full prefix line including gray color, indent, and prefix text */
  private readonly prefixLine: string;
  /** Empty line marker for line breaks without content */
  private readonly emptyLine: string;
  /** Tracks whether the next output should be prefixed (at line start) */
  private isAtLineStart: boolean;

  /**
   * Create a new streaming formatter for a subagent.
   *
   * @param info - Subagent information containing agent name, short ID, and depth
   */
  constructor(info: SubagentInfo) {
    const indent = getIndent(info.depth);
    const prefix = getSubagentPrefix(info);
    this.prefixLine = `${GRAY}${indent}${prefix}`;
    this.emptyLine = `${GRAY}${indent}${RESET}`;
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

    const lines = chunk.split("\n");
    const formattedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const isLastLine = i === lines.length - 1;

      this.formatLine(line, isLastLine, formattedLines);
    }

    return formattedLines.join("");
  }

  /**
   * Format a single line and append to the output buffer.
   *
   * Handles the three line states:
   * - Line start with content: prefix + content
   * - Mid-line: just content
   * - Line start with empty line: empty line marker
   *
   * @param line - The raw line content
   * @param isLastLine - Whether this is the final line in the chunk
   * @param output - Array to append formatted output to
   */
  private formatLine(line: string, isLastLine: boolean, output: string[]): void {
    if (this.isAtLineStart) {
      this.formatLineStart(line, output);
    } else {
      this.formatMidLine(line, output);
    }

    if (!isLastLine) {
      this.formatLineBreak(output);
    }
  }

  /**
   * Format a line when at the start of a new line.
   *
   * @param line - The raw line content
   * @param output - Array to append formatted output to
   */
  private formatLineStart(line: string, output: string[]): void {
    if (line.length > 0) {
      // At line start with content: add prefix + content + reset
      output.push(`${this.prefixLine}${line}${RESET}`);
      this.isAtLineStart = false;
    } else {
      // At line start but empty line (consecutive newlines)
      output.push(this.emptyLine);
    }
  }

  /**
   * Format a line when continuing mid-line.
   *
   * @param line - The raw line content
   * @param output - Array to append formatted output to
   */
  private formatMidLine(line: string, output: string[]): void {
    // Not at line start: just add the content (color already active from prefix)
    output.push(line);
  }

  /**
   * Format a line break transition.
   *
   * Adds newline separator and marks next line as line start.
   *
   * @param output - Array to append formatted output to
   */
  private formatLineBreak(output: string[]): void {
    output.push("\n");
    this.isAtLineStart = true;
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

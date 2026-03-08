/**
 * SubagentStreamingFormatter Tests
 *
 * Comprehensive tests for the streaming formatter that ensures
 * subagent prefixes are only printed at the beginning of lines.
 */

import { describe, test, expect } from "bun:test";
import { SubagentStreamingFormatter } from "../subagent-streaming-formatter.js";
import type { SubagentInfo } from "../subagent-types.js";

/**
 * ANSI escape codes used by the formatter.
 */
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

describe("SubagentStreamingFormatter", () => {
  /**
   * Creates a mock SubagentInfo for testing.
   */
  const createMockInfo = (overrides?: Partial<SubagentInfo>): SubagentInfo => ({
    sessionId: "sess-test-123456",
    shortId: "123456",
    agentName: "explore",
    parentId: "parent-sess",
    depth: 1,
    status: "running",
    ...overrides,
  });

  describe("Basic single line output", () => {
    test("should add prefix for first chunk on new line", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("Hello world");

      expect(result).toBe(`${GRAY}  subagent explore@123456: Hello world${RESET}`);
    });

    test("should not add prefix for subsequent chunks on same line", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      // First chunk gets prefix
      const result1 = formatter.formatChunk("Hello");
      expect(result1).toBe(`${GRAY}  subagent explore@123456: Hello${RESET}`);

      // Second chunk on same line does NOT get prefix
      const result2 = formatter.formatChunk(" world");
      expect(result2).toBe(" world");

      // Third chunk still no prefix
      const result3 = formatter.formatChunk("!");
      expect(result3).toBe("!");
    });

    test("should handle multiple word chunks correctly", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      const words = ["The", " quick", " brown", " fox"];
      const results: string[] = [];

      for (const word of words) {
        results.push(formatter.formatChunk(word));
      }

      expect(results[0]).toBe(`${GRAY}  subagent explore@123456: The${RESET}`);
      expect(results[1]).toBe(" quick");
      expect(results[2]).toBe(" brown");
      expect(results[3]).toBe(" fox");
    });
  });

  describe("Multi-line output", () => {
    test("should prefix each line when content has embedded newlines", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("Line 1\nLine 2\nLine 3");

      expect(result).toBe(
        `${GRAY}  subagent explore@123456: Line 1${RESET}\n` +
        `${GRAY}  subagent explore@123456: Line 2${RESET}\n` +
        `${GRAY}  subagent explore@123456: Line 3${RESET}`
      );
    });

    test("should handle chunks that span line boundaries", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      // First chunk ends mid-way through content (no newline)
      const result1 = formatter.formatChunk("First");
      expect(result1).toBe(`${GRAY}  subagent explore@123456: First${RESET}`);

      // Second chunk contains newline
      const result2 = formatter.formatChunk(" line\nSecond");
      expect(result2).toBe(" line\n" + `${GRAY}  subagent explore@123456: Second${RESET}`);

      // Third chunk continues on second line
      const result3 = formatter.formatChunk(" line");
      expect(result3).toBe(" line");
    });

    test("should handle newline at end of chunk followed by more content", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      // Chunk ending with newline - creates an empty line entry
      const result1 = formatter.formatChunk("First line\n");
      expect(result1).toBe(
        `${GRAY}  subagent explore@123456: First line${RESET}\n` +
        `${GRAY}  ${RESET}`
      );

      // Next chunk starts new line and gets prefix
      const result2 = formatter.formatChunk("Second line");
      expect(result2).toBe(`${GRAY}  subagent explore@123456: Second line${RESET}`);
    });

    test("should handle newline at start of chunk", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      // First chunk
      const result1 = formatter.formatChunk("Line 1");
      expect(result1).toBe(`${GRAY}  subagent explore@123456: Line 1${RESET}`);

      // Next chunk starts with newline, then content
      const result2 = formatter.formatChunk("\nLine 2");
      expect(result2).toBe("\n" + `${GRAY}  subagent explore@123456: Line 2${RESET}`);
    });
  });

  describe("Consecutive newlines", () => {
    test("should handle multiple consecutive newlines (empty lines)", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("Line 1\n\n\nLine 2");

      // Empty lines should still have the gray color and indent
      expect(result).toBe(
        `${GRAY}  subagent explore@123456: Line 1${RESET}\n` +
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  subagent explore@123456: Line 2${RESET}`
      );
    });

    test("should handle chunk with only newlines", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      // First establish we're mid-line
      formatter.formatChunk("Text");

      // Then send newlines
      const result = formatter.formatChunk("\n\n\n");
      expect(result).toBe(
        "\n" +
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  ${RESET}`
      );
    });

    test("should preserve formatting with mixed empty and content lines", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("A\n\nB\n\n\nC");

      expect(result).toBe(
        `${GRAY}  subagent explore@123456: A${RESET}\n` +
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  subagent explore@123456: B${RESET}\n` +
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  subagent explore@123456: C${RESET}`
      );
    });
  });

  describe("Edge cases", () => {
    test("should return empty string for empty input", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("");

      expect(result).toBe("");
    });

    test("should handle only whitespace content", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("   \t  ");

      // Whitespace is still content, so it gets prefix
      expect(result).toBe(`${GRAY}  subagent explore@123456:    \t  ${RESET}`);
    });

    test("should handle string ending with newline", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("Text ending with newline\n");

      // Split creates ["Text ending with newline", ""], so we get content line + empty line
      expect(result).toBe(
        `${GRAY}  subagent explore@123456: Text ending with newline${RESET}\n` +
        `${GRAY}  ${RESET}`
      );
    });

    test("should handle string starting with newline", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("\nText starting with newline");

      // Split creates ["", "Text starting..."], empty line gets formatted, then content
      expect(result).toBe(
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  subagent explore@123456: Text starting with newline${RESET}`
      );
    });

    test("should handle only newlines", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("\n\n\n");

      // Split("\n") on "\n\n\n" produces ["", "", "", ""]
      // Each empty string (except last) gets formatted + "\n", last gets formatted
      expect(result).toBe(
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  ${RESET}`
      );
    });

    test("should handle single newline character", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("\n");

      // Split("\n") on "\n" produces ["", ""]
      // First empty gets formatted, then newline separator, then last empty gets formatted
      expect(result).toBe(
        `${GRAY}  ${RESET}\n` +
        `${GRAY}  ${RESET}`
      );
    });
  });

  describe("Depth/Indentation", () => {
    test("should produce correct indentation for depth 1", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo({ depth: 1 }));
      const result = formatter.formatChunk("Test");

      expect(result).toBe(`${GRAY}  subagent explore@123456: Test${RESET}`);
      // 2 spaces for depth 1
      expect(result.indexOf("  subagent")).toBe(5); // After the GRAY code
    });

    test("should produce correct indentation for depth 2", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo({ depth: 2 }));
      const result = formatter.formatChunk("Test");

      expect(result).toBe(`${GRAY}    subagent explore@123456: Test${RESET}`);
      // 4 spaces for depth 2
      expect(result.indexOf("    subagent")).toBe(5); // After the GRAY code
    });

    test("should produce correct indentation for depth 3", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo({ depth: 3 }));
      const result = formatter.formatChunk("Test");

      expect(result).toBe(`${GRAY}      subagent explore@123456: Test${RESET}`);
      // 6 spaces for depth 3
      expect(result.indexOf("      subagent")).toBe(5); // After the GRAY code
    });

    test("should maintain indentation across multiple lines at depth 2", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo({ depth: 2 }));
      const result = formatter.formatChunk("Line 1\nLine 2");

      expect(result).toBe(
        `${GRAY}    subagent explore@123456: Line 1${RESET}\n` +
        `${GRAY}    subagent explore@123456: Line 2${RESET}`
      );
    });

    test("should handle depth 0 (no indentation)", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo({ depth: 0 }));
      const result = formatter.formatChunk("Test");

      expect(result).toBe(`${GRAY}subagent explore@123456: Test${RESET}`);
    });
  });

  describe("Reset functionality", () => {
    test("reset should cause next chunk to be prefixed", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      // First chunk
      formatter.formatChunk("First");

      // Second chunk (no prefix expected)
      const result2 = formatter.formatChunk(" second");
      expect(result2).toBe(" second");

      // Reset
      formatter.reset();

      // Third chunk should now get prefix again
      const result3 = formatter.formatChunk(" third");
      expect(result3).toBe(`${GRAY}  subagent explore@123456:  third${RESET}`);
    });

    test("reset should work after newline", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      formatter.formatChunk("Line 1\nLine 2");
      formatter.reset();

      // After reset, next chunk should be prefixed
      const result = formatter.formatChunk("Line 3");
      expect(result).toBe(`${GRAY}  subagent explore@123456: Line 3${RESET}`);
    });

    test("reset should work correctly at different depths", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo({ depth: 2 }));

      formatter.formatChunk("First");
      formatter.reset();

      const result = formatter.formatChunk("Second");
      expect(result).toBe(`${GRAY}    subagent explore@123456: Second${RESET}`);
    });
  });

  describe("Flush functionality", () => {
    test("flush should return empty string", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.flush();

      expect(result).toBe("");
    });

    test("flush should return empty string even after formatting chunks", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      formatter.formatChunk("Some content");
      formatter.formatChunk(" more content");

      const result = formatter.flush();
      expect(result).toBe("");
    });

    test("flush should not affect subsequent formatting", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());

      formatter.formatChunk("First");
      formatter.flush();

      // After flush, should still be mid-line (no prefix)
      const result = formatter.formatChunk(" second");
      expect(result).toBe(" second");
    });
  });

  describe("Integration scenarios", () => {
    test("should handle realistic streaming simulation", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo({ agentName: "code" }));
      const outputs: string[] = [];

      // Simulate streaming output word by word
      const words = ["Analyzing", " the", " codebase", "...\n", "Found", " 3", " issues", "\n", "Done"];
      for (const word of words) {
        outputs.push(formatter.formatChunk(word));
      }

      // Check the combined output makes sense
      const fullOutput = outputs.join("");
      expect(fullOutput).toContain("subagent code@123456: Analyzing");
      expect(fullOutput).toContain("the codebase");
      expect(fullOutput).toContain("Found");
      expect(fullOutput).toContain("issues");
      expect(fullOutput).toContain("Done");
    });

    test("should handle subagent with different agent name", () => {
      const formatter = new SubagentStreamingFormatter(
        createMockInfo({ agentName: "general", shortId: "abc123" })
      );
      const result = formatter.formatChunk("Output");

      expect(result).toContain("subagent general@abc123:");
    });

    test("should handle Windows-style line endings (CRLF)", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      // The formatter uses split("\n") so \r will be part of the content
      const result = formatter.formatChunk("Line 1\r\nLine 2");

      // \r becomes part of first line content, then newline, then second line
      expect(result).toContain("Line 1\r");
      expect(result).toContain("Line 2");
    });

    test("should handle tab characters in content", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("Column1\tColumn2\tColumn3");

      expect(result).toBe(`${GRAY}  subagent explore@123456: Column1\tColumn2\tColumn3${RESET}`);
    });

    test("should handle unicode content", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const result = formatter.formatChunk("Hello 世界 🌍");

      expect(result).toBe(`${GRAY}  subagent explore@123456: Hello 世界 🌍${RESET}`);
    });

    test("should handle long lines", () => {
      const formatter = new SubagentStreamingFormatter(createMockInfo());
      const longText = "A".repeat(1000);
      const result = formatter.formatChunk(longText);

      expect(result).toBe(`${GRAY}  subagent explore@123456: ${longText}${RESET}`);
    });
  });

  describe("State isolation", () => {
    test("multiple formatters should be independent", () => {
      const formatter1 = new SubagentStreamingFormatter(
        createMockInfo({ agentName: "agent1", shortId: "111" })
      );
      const formatter2 = new SubagentStreamingFormatter(
        createMockInfo({ agentName: "agent2", shortId: "222" })
      );

      const result1 = formatter1.formatChunk("Hello");
      const result2 = formatter2.formatChunk("World");

      expect(result1).toContain("agent1@111");
      expect(result2).toContain("agent2@222");
      expect(result1).not.toContain("agent2");
      expect(result2).not.toContain("agent1");
    });

    test("reset on one formatter should not affect another", () => {
      const formatter1 = new SubagentStreamingFormatter(createMockInfo({ shortId: "aaa" }));
      const formatter2 = new SubagentStreamingFormatter(createMockInfo({ shortId: "bbb" }));

      formatter1.formatChunk("Text");
      formatter1.reset();

      // formatter2 should still be at line start
      const result2 = formatter2.formatChunk("Other");
      expect(result2).toContain("bbb");
      expect(result2).toContain("Other");
    });
  });
});



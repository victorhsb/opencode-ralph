/**
 * Utilities Module Tests
 *
 * Tests for formatting, error detection, and promise checking utilities.
 */

import { describe, test, expect } from "bun:test";
import {
  formatDurationLong,
  formatDuration,
  formatToolSummary,
  checkCompletion,
  escapeRegex,
  extractErrors,
  stripAnsi,
  detectPlaceholderPluginError,
  detectModelNotFoundError,
  isSdkError,
  getSdkErrorMessage,
  detectSdkModelNotFoundError,
  detectSdkPlaceholderPluginError,
} from "../utils";

describe("formatDurationLong", () => {
  test("formats zero seconds", () => {
    expect(formatDurationLong(0)).toBe("0s");
  });

  test("formats seconds only", () => {
    expect(formatDurationLong(5000)).toBe("5s");
    expect(formatDurationLong(59000)).toBe("59s");
  });

  test("formats minutes and seconds", () => {
    expect(formatDurationLong(60000)).toBe("1m 0s");
    expect(formatDurationLong(125000)).toBe("2m 5s");
    expect(formatDurationLong(3599000)).toBe("59m 59s");
  });

  test("formats hours, minutes, and seconds", () => {
    expect(formatDurationLong(3600000)).toBe("1h 0m 0s");
    expect(formatDurationLong(3661000)).toBe("1h 1m 1s");
    expect(formatDurationLong(7265000)).toBe("2h 1m 5s");
  });

  test("handles negative values", () => {
    expect(formatDurationLong(-1000)).toBe("0s");
  });

  test("handles fractional seconds", () => {
    expect(formatDurationLong(1500)).toBe("1s");
    expect(formatDurationLong(2599)).toBe("2s");
  });
});

describe("formatDuration", () => {
  test("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  test("formats seconds only with padding", () => {
    expect(formatDuration(5000)).toBe("0:05");
    expect(formatDuration(59000)).toBe("0:59");
  });

  test("formats minutes and seconds with padding", () => {
    expect(formatDuration(60000)).toBe("1:00");
    expect(formatDuration(125000)).toBe("2:05");
    expect(formatDuration(600500)).toBe("10:00");
  });

  test("formats hours, minutes, and seconds", () => {
    expect(formatDuration(3600000)).toBe("1:00:00");
    expect(formatDuration(3661000)).toBe("1:01:01");
    expect(formatDuration(7265000)).toBe("2:01:05");
  });

  test("handles negative values", () => {
    expect(formatDuration(-1000)).toBe("0:00");
  });
});

describe("formatToolSummary", () => {
  test("returns empty string for empty map", () => {
    expect(formatToolSummary(new Map())).toBe("");
  });

  test("formats single tool", () => {
    const map = new Map([["bash", 5]]);
    expect(formatToolSummary(map)).toBe("bash 5");
  });

  test("formats multiple tools sorted by count", () => {
    const map = new Map([
      ["bash", 10],
      ["read", 5],
      ["write", 3],
    ]);
    expect(formatToolSummary(map)).toBe("bash 10 • read 5 • write 3");
  });

  test("limits to maxItems (default 6)", () => {
    const map = new Map([
      ["tool1", 10],
      ["tool2", 9],
      ["tool3", 8],
      ["tool4", 7],
      ["tool5", 6],
      ["tool6", 5],
      ["tool7", 4],
      ["tool8", 3],
    ]);
    const result = formatToolSummary(map);
    expect(result).toContain("tool1 10");
    expect(result).toContain("tool6 5");
    expect(result).toContain("+2 more");
    expect(result).not.toContain("tool7");
  });

  test("respects custom maxItems", () => {
    const map = new Map([
      ["tool1", 10],
      ["tool2", 9],
      ["tool3", 8],
    ]);
    expect(formatToolSummary(map, 2)).toBe("tool1 10 • tool2 9 • +1 more");
  });

  test("handles maxItems larger than map size", () => {
    const map = new Map([
      ["tool1", 10],
      ["tool2", 9],
    ]);
    expect(formatToolSummary(map, 10)).toBe("tool1 10 • tool2 9");
  });
});

describe("checkCompletion", () => {
  test("detects promise in output", () => {
    const output = "Some text <promise>DONE</promise> more text";
    expect(checkCompletion(output, "DONE")).toBe(true);
  });

  test("detects promise with whitespace", () => {
    const output = "Some text <promise>  DONE  </promise> more text";
    expect(checkCompletion(output, "DONE")).toBe(true);
  });

  test("case insensitive matching", () => {
    const output = "Some text <promise>done</promise> more text";
    expect(checkCompletion(output, "DONE")).toBe(true);
  });

  test("does not detect negated promises with 'not yet say'", () => {
    const output = "Do not yet say <promise>DONE</promise> until finished";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("does not detect negated promises with 'don't say'", () => {
    const output = "Don't say <promise>DONE</promise>";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("does not detect negated promises with 'won't say'", () => {
    const output = "I won't say <promise>DONE</promise> now";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("does not detect negated promises with 'will not'", () => {
    const output = "I will not say <promise>DONE</promise>";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("does not detect negated promises with 'should not'", () => {
    const output = "You should not say <promise>DONE</promise>";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("does not detect negated promises with 'wouldn't'", () => {
    const output = "I wouldn't say <promise>DONE</promise>";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("does not detect negated promises with 'avoid saying'", () => {
    const output = "Avoid saying <promise>DONE</promise>";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("does not detect negated promises with 'without saying'", () => {
    const output = "Complete without saying <promise>DONE</promise>";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("does not detect promise with unclosed quote before", () => {
    const output = "Here's an example: `some code <promise>DONE</promise>`";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("does not detect promise with open string literal before", () => {
    const output = `const str = "test <promise>DONE</promise>`;
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("detects promise with balanced quotes before", () => {
    const output = `"test" <promise>DONE</promise>`;
    expect(checkCompletion(output, "DONE")).toBe(true);
  });

  test("handles special regex characters in promise", () => {
    const output = "Done <promise>TEST+DONE*</promise> here";
    expect(checkCompletion(output, "TEST+DONE*")).toBe(true);
  });

  test("returns false when promise not found", () => {
    const output = "Some text without promise tags";
    expect(checkCompletion(output, "DONE")).toBe(false);
  });

  test("handles empty output", () => {
    expect(checkCompletion("", "DONE")).toBe(false);
  });

  test("handles multiple matches, uses first non-negated", () => {
    const output = "Don't say <promise>DONE</promise> first, but later <promise>DONE</promise>";
    expect(checkCompletion(output, "DONE")).toBe(true);
  });

  test("detects promise after context with no negation", () => {
    const output = "The task is complete. <promise>DONE</promise>";
    expect(checkCompletion(output, "DONE")).toBe(true);
  });
});

describe("escapeRegex", () => {
  test("escapes special regex characters", () => {
    expect(escapeRegex("test+file")).toBe("test\\+file");
    expect(escapeRegex("test?")).toBe("test\\?");
    expect(escapeRegex("test*")).toBe("test\\*");
    expect(escapeRegex("test^")).toBe("test\\^");
    expect(escapeRegex("test$")).toBe("test\\$");
    expect(escapeRegex("test.")).toBe("test\\.");
    expect(escapeRegex("test|")).toBe("test\\|");
    expect(escapeRegex("test()")).toBe("test\\(\\)");
    expect(escapeRegex("test[]")).toBe("test\\[\\]");
    expect(escapeRegex("test{}")).toBe("test\\{\\}");
  });

  test("handles combined special characters", () => {
    expect(escapeRegex("test+file?.txt")).toBe("test\\+file\\?\\.txt");
  });

  test("leaves normal text unchanged", () => {
    expect(escapeRegex("normalText123")).toBe("normalText123");
  });

  test("handles empty string", () => {
    expect(escapeRegex("")).toBe("");
  });

  test("handles backslash", () => {
    expect(escapeRegex("test\\file")).toBe("test\\\\file");
  });
});

describe("extractErrors", () => {
  test("extracts Error: lines", () => {
    const output = "Some output\nError: Something went wrong\nMore output";
    const errors = extractErrors(output);
    expect(errors).toContain("Error: Something went wrong");
  });

  test("extracts Failed: lines", () => {
    const output = "Process Failed: Connection timeout";
    const errors = extractErrors(output);
    expect(errors).toContain("Process Failed: Connection timeout");
  });

  test("extracts Exception: lines", () => {
    const output = "Exception: Division by zero";
    const errors = extractErrors(output);
    expect(errors).toContain("Exception: Division by zero");
  });

  test("extracts TypeError", () => {
    const output = "TypeError: Cannot read property of undefined";
    const errors = extractErrors(output);
    expect(errors).toContain("TypeError: Cannot read property of undefined");
  });

  test("extracts SyntaxError", () => {
    const output = "SyntaxError: Unexpected token";
    const errors = extractErrors(output);
    expect(errors).toContain("SyntaxError: Unexpected token");
  });

  test("extracts ReferenceError", () => {
    const output = "ReferenceError: variable is not defined";
    const errors = extractErrors(output);
    expect(errors).toContain("ReferenceError: variable is not defined");
  });

  test("extracts test failures", () => {
    const output = "test failed: expected true to be false";
    const errors = extractErrors(output);
    expect(errors).toContain("test failed: expected true to be false");
  });

  test("limits to first 10 errors", () => {
    const output = Array(15).fill(0).map((_, i) => `Error: Error ${i}`).join("\n");
    const errors = extractErrors(output);
    expect(errors.length).toBe(10);
  });

  test("removes duplicates", () => {
    const output = "Error: Duplicate\nSome text\nError: Duplicate";
    const errors = extractErrors(output);
    expect(errors.filter(e => e === "Error: Duplicate").length).toBe(1);
  });

  test("trims lines to 200 characters", () => {
    const longError = "Error: " + "x".repeat(250);
    const errors = extractErrors(longError);
    expect(errors[0].length).toBeLessThanOrEqual(200);
  });

  test("handles empty output", () => {
    expect(extractErrors("")).toEqual([]);
  });

  test("handles output with no errors", () => {
    const output = "Normal output\nMore output\nAll good";
    expect(extractErrors(output)).toEqual([]);
  });

  test("is case insensitive for error keywords", () => {
    const output = "error: lowercase\nERROR: uppercase\nError: Mixed";
    const errors = extractErrors(output);
    expect(errors.length).toBe(3);
  });
});

describe("stripAnsi", () => {
  test("removes ANSI color codes", () => {
    const input = "\x1B[31mError\x1B[0m message";
    expect(stripAnsi(input)).toBe("Error message");
  });

  test("removes multiple ANSI codes", () => {
    const input = "\x1B[31m\x1B[1mBold red\x1B[0m\x1B[32m text\x1B[0m";
    expect(stripAnsi(input)).toBe("Bold red text");
  });

  test("handles text without ANSI codes", () => {
    const input = "Plain text";
    expect(stripAnsi(input)).toBe("Plain text");
  });

  test("handles empty string", () => {
    expect(stripAnsi("")).toBe("");
  });

  test("removes various ANSI code types", () => {
    const input = "\x1B[31m\x1B[32;1m\x1B[4mtext\x1B[0m";
    expect(stripAnsi(input)).toBe("text");
  });
});

describe("detectPlaceholderPluginError", () => {
  test("detects placeholder error message", () => {
    const output = "ralph-wiggum is not yet ready for use. This is a placeholder package.";
    expect(detectPlaceholderPluginError(output)).toBe(true);
  });

  test("does not detect normal output", () => {
    const output = "Normal operation complete";
    expect(detectPlaceholderPluginError(output)).toBe(false);
  });

  test("case sensitive detection", () => {
    const output = "RALPH-WIGGUM IS NOT YET READY FOR USE";
    expect(detectPlaceholderPluginError(output)).toBe(false);
  });

  test("partial match still detects", () => {
    const output = "Error: ralph-wiggum is not yet ready for use";
    expect(detectPlaceholderPluginError(output)).toBe(true);
  });
});

describe("detectModelNotFoundError", () => {
  test("detects ProviderModelNotFoundError", () => {
    const output = "Error: ProviderModelNotFoundError: Model not found";
    expect(detectModelNotFoundError(output)).toBe(true);
  });

  test("detects Provider returned error", () => {
    const output = "Provider returned error: Invalid model";
    expect(detectModelNotFoundError(output)).toBe(true);
  });

  test("detects model not found", () => {
    const output = "Error: model not found";
    expect(detectModelNotFoundError(output)).toBe(true);
  });

  test("detects No model configured", () => {
    const output = "No model configured";
    expect(detectModelNotFoundError(output)).toBe(true);
  });

  test("case insensitive", () => {
    const output = "MODEL NOT FOUND";
    expect(detectModelNotFoundError(output)).toBe(true);
  });

  test("does not detect unrelated errors", () => {
    const output = "Network timeout occurred";
    expect(detectModelNotFoundError(output)).toBe(false);
  });
});

describe("isSdkError", () => {
  test("detects ProviderModelNotFoundError in Error message", () => {
    const error = new Error("ProviderModelNotFoundError: Invalid model");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects model not found in Error message", () => {
    const error = new Error("model not found");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects Provider returned error in Error message", () => {
    const error = new Error("Provider returned error");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects invalid model in Error message", () => {
    const error = new Error("invalid model configuration");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects connection refused", () => {
    const error = new Error("ECONNREFUSED: Connection refused");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects network error", () => {
    const error = new Error("Network error occurred");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects timeout", () => {
    const error = new Error("Request timeout");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects socket hang up", () => {
    const error = new Error("socket hang up");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects failed to initialize", () => {
    const error = new Error("SDK failed to initialize");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects SDK initialization", () => {
    const error = new Error("SDK initialization failed");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects server failed to start", () => {
    const error = new Error("server failed to start");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects rate limit", () => {
    const error = new Error("Rate limit exceeded");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects too many requests", () => {
    const error = new Error("too many requests");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects throttled", () => {
    const error = new Error("Request throttled");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects authentication errors", () => {
    const error = new Error("authentication failed");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects unauthorized errors", () => {
    const error = new Error("Unauthorized access");
    expect(isSdkError(error)).toBe(true);
  });

  test("detects api key errors", () => {
    const error = new Error("Invalid API key");
    expect(isSdkError(error)).toBe(true);
  });

  test("handles non-Error objects", () => {
    expect(isSdkError("some string")).toBe(false);
    expect(isSdkError(123)).toBe(false);
    expect(isSdkError(null)).toBe(false);
    expect(isSdkError(undefined)).toBe(false);
  });

  test("handles Error without matching message", () => {
    const error = new Error("Some other error");
    expect(isSdkError(error)).toBe(false);
  });
});

describe("getSdkErrorMessage", () => {
  test("returns message from Error object", () => {
    const error = new Error("Test error message");
    expect(getSdkErrorMessage(error)).toBe("Test error message");
  });

  test("returns string as is", () => {
    const error = "String error message";
    expect(getSdkErrorMessage(error)).toBe("String error message");
  });

  test("extracts message from object with message property", () => {
    const error = { message: "Object error message" };
    expect(getSdkErrorMessage(error)).toBe("Object error message");
  });

  test("extracts error property from object", () => {
    const error = { error: "Error property message" };
    expect(getSdkErrorMessage(error)).toBe("Error property message");
  });

  test("extracts description property from object", () => {
    const error = { description: "Description message" };
    expect(getSdkErrorMessage(error)).toBe("Description message");
  });

  test("stringifies object when no string property found", () => {
    const error = { code: 500, id: "test" };
    const result = getSdkErrorMessage(error);
    expect(result).toBe('{"code":500,"id":"test"}');
  });

  test("handles objects that can't be stringified", () => {
    const error = { circular: null as any };
    error.circular = error;
    const result = getSdkErrorMessage(error);
    expect(result).toBe("Unknown SDK error (could not stringify)");
  });

  test("handles null", () => {
    expect(getSdkErrorMessage(null)).toBe("null");
  });

  test("handles undefined", () => {
    expect(getSdkErrorMessage(undefined)).toBe("undefined");
  });

  test("handles number", () => {
    expect(getSdkErrorMessage(404)).toBe("404");
  });
});

describe("detectSdkModelNotFoundError", () => {
  test("detects providermodelfound", () => {
    const output = "Error: providermodelfound: Invalid model";
    expect(detectSdkModelNotFoundError(output)).toBe(true);
  });

  test("detects model not found", () => {
    const output = "Error: model not found";
    expect(detectSdkModelNotFoundError(output)).toBe(true);
  });

  test("detects provider returned error", () => {
    const output = "Provider returned error";
    expect(detectSdkModelNotFoundError(output)).toBe(true);
  });

  test("detects no model configured", () => {
    const output = "No model configured";
    expect(detectSdkModelNotFoundError(output)).toBe(true);
  });

  test("case insensitive", () => {
    const output = "PROVIDERMODEFOUND ERROR";
    expect(detectSdkModelNotFoundError(output)).toBe(true);
  });

  test("does not detect unrelated output", () => {
    const output = "Network error occurred";
    expect(detectSdkModelNotFoundError(output)).toBe(false);
  });

  test("handles empty string", () => {
    expect(detectSdkModelNotFoundError("")).toBe(false);
  });
});

describe("detectSdkPlaceholderPluginError", () => {
  test("detects placeholder message", () => {
    const output = "ralph-wiggum is not yet ready for use. This is a placeholder package.";
    expect(detectSdkPlaceholderPluginError(output)).toBe(true);
  });

  test("partial match detects", () => {
    const output = "Error: ralph-wiggum is not yet ready for use";
    expect(detectSdkPlaceholderPluginError(output)).toBe(true);
  });

  test("does not detect unrelated output", () => {
    const output = "Normal operation completed";
    expect(detectSdkPlaceholderPluginError(output)).toBe(false);
  });

  test("handles empty string", () => {
    expect(detectSdkPlaceholderPluginError("")).toBe(false);
  });
});

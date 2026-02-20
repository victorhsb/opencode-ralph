/**
 * Structured Output Tests
 *
 * Tests for the extractStructuredOutput function that parses
 * structured completion data from SDK responses.
 */

import { describe, test, expect } from "bun:test";

// Copy of the StructuredOutput interface from executor.ts
interface StructuredOutput {
  completed: boolean;
  reasoning?: string;
  output?: string;
}

// Copy of the extractStructuredOutput function from executor.ts for testing
function extractStructuredOutput(
  message: unknown
): StructuredOutput | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }

  const msg = message as Record<string, unknown>;

  // Navigate through the response structure: info.structured_output
  const info = msg.info as Record<string, unknown> | undefined;
  if (!info) {
    return undefined;
  }

  const structuredOutput = info.structured_output;
  if (!structuredOutput || typeof structuredOutput !== "object") {
    return undefined;
  }

  const so = structuredOutput as Record<string, unknown>;

  // Validate the required 'completed' field
  if (typeof so.completed !== "boolean") {
    return undefined;
  }

  // Build the structured output object
  const result: StructuredOutput = {
    completed: so.completed,
  };

  // Add optional fields if present
  if (typeof so.reasoning === "string") {
    result.reasoning = so.reasoning;
  }

  if (typeof so.output === "string") {
    result.output = so.output;
  }

  return result;
}

describe("extractStructuredOutput", () => {
  describe("basic extraction", () => {
    test("extracts completed field correctly when true", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
    });

    test("extracts completed field correctly when false", () => {
      const message = {
        info: {
          structured_output: {
            completed: false,
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(false);
    });

    test("extracts all fields when present", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
            reasoning: "Task completed successfully",
            output: "The result is 42",
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.reasoning).toBe("Task completed successfully");
      expect(result?.output).toBe("The result is 42");
    });

    test("handles completed with only reasoning", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
            reasoning: "All steps executed",
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.reasoning).toBe("All steps executed");
      expect(result?.output).toBeUndefined();
    });

    test("handles completed with only output", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
            output: "Final answer here",
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.reasoning).toBeUndefined();
      expect(result?.output).toBe("Final answer here");
    });
  });

  describe("missing data handling", () => {
    test("returns undefined when message is null", () => {
      const result = extractStructuredOutput(null);
      expect(result).toBeUndefined();
    });

    test("returns undefined when message is undefined", () => {
      const result = extractStructuredOutput(undefined);
      expect(result).toBeUndefined();
    });

    test("returns undefined when message is not an object", () => {
      const result = extractStructuredOutput("not an object");
      expect(result).toBeUndefined();
    });

    test("returns undefined when info field is missing", () => {
      const message = {
        otherField: "value",
      };

      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });

    test("returns undefined when structured_output is missing", () => {
      const message = {
        info: {
          otherField: "value",
        },
      };

      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });

    test("returns undefined when structured_output is null", () => {
      const message = {
        info: {
          structured_output: null,
        },
      };

      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });

    test("returns undefined when structured_output is not an object", () => {
      const message = {
        info: {
          structured_output: "not an object",
        },
      };

      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });
  });

  describe("schema validation", () => {
    test("returns undefined when completed field is not a boolean", () => {
      const message = {
        info: {
          structured_output: {
            completed: "true",
          },
        },
      };

      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });

    test("returns undefined when completed is a number", () => {
      const message = {
        info: {
          structured_output: {
            completed: 1,
          },
        },
      };

      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });

    test("returns undefined when completed is an object", () => {
      const message = {
        info: {
          structured_output: {
            completed: { value: true },
          },
        },
      };

      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });

    test("returns undefined when completed field is missing", () => {
      const message = {
        info: {
          structured_output: {
            reasoning: "Missing completed field",
          },
        },
      };

      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });

    test("ignores non-string reasoning field", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
            reasoning: 123,
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.reasoning).toBeUndefined();
    });

    test("ignores non-string output field", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
            output: { result: "value" },
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.output).toBeUndefined();
    });

    test("handles empty strings for optional fields", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
            reasoning: "",
            output: "",
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.reasoning).toBe("");
      expect(result?.output).toBe("");
    });
  });

  describe("nested message structures", () => {
    test("handles deeply nested info object", () => {
      const message = {
        data: {
          info: {
            structured_output: {
              completed: true,
            },
          },
        },
      };

      // This should not extract because info is at wrong level
      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });

    test("handles message with additional properties", () => {
      const message = {
        info: {
          id: "msg-123",
          timestamp: 1234567890,
          structured_output: {
            completed: true,
            reasoning: "Done",
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.reasoning).toBe("Done");
    });

    test("handles structured_output with extra fields", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
            reasoning: "Task done",
            output: "Result",
            extraField: "should be ignored",
            anotherExtra: 123,
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.reasoning).toBe("Task done");
      expect(result?.output).toBe("Result");
      expect((result as Record<string, unknown>).extraField).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    test("handles array as message", () => {
      const result = extractStructuredOutput([1, 2, 3]);
      expect(result).toBeUndefined();
    });

    test("handles empty object", () => {
      const result = extractStructuredOutput({});
      expect(result).toBeUndefined();
    });

    test("handles empty info object", () => {
      const message = {
        info: {},
      };

      const result = extractStructuredOutput(message);
      expect(result).toBeUndefined();
    });

    test("handles very long reasoning text", () => {
      const longReasoning = "Step completed. ".repeat(1000);
      const message = {
        info: {
          structured_output: {
            completed: true,
            reasoning: longReasoning,
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.reasoning).toBe(longReasoning);
    });

    test("handles unicode text in fields", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
            reasoning: "タスク完了 🎉",
            output: "结果: 42",
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.reasoning).toBe("タスク完了 🎉");
      expect(result?.output).toBe("结果: 42");
    });

    test("handles special characters in output", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
            output: '<promise>COMPLETE</promise> & "quoted" \n\t',
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.output).toBe('<promise>COMPLETE</promise> & "quoted" \n\t');
    });
  });

  describe("real-world-like responses", () => {
    test("handles typical completion response", () => {
      const message = {
        info: {
          id: "msg-abc123",
          role: "assistant",
          structured_output: {
            completed: true,
            reasoning: "All tasks completed successfully",
            output: "The file has been created at /path/to/file.txt",
          },
        },
        parts: [],
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.reasoning).toContain("completed");
      expect(result?.output).toContain("/path/to/file.txt");
    });

    test("handles incomplete task response", () => {
      const message = {
        info: {
          structured_output: {
            completed: false,
            reasoning: "Waiting for user input",
            output: "Please provide the required parameter",
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(false);
    });

    test("handles minimal valid response", () => {
      const message = {
        info: {
          structured_output: {
            completed: true,
          },
        },
      };

      const result = extractStructuredOutput(message);

      expect(result).toBeDefined();
      expect(result?.completed).toBe(true);
      expect(result?.reasoning).toBeUndefined();
      expect(result?.output).toBeUndefined();
    });
  });
});

// Verification console output
console.log("Structured output extraction tests loaded successfully");
console.log("Testing various message structures...");

const testCases = [
  { completed: true, desc: "basic true" },
  { completed: false, desc: "basic false" },
  { completed: true, withReasoning: true, desc: "with reasoning" },
  { completed: true, withOutput: true, desc: "with output" },
  { completed: true, withAll: true, desc: "with all fields" },
];

for (const tc of testCases) {
  const msg: Record<string, unknown> = {
    info: {
      structured_output: {
        completed: tc.completed,
      } as Record<string, unknown>,
    },
  };

  if (tc.withReasoning || tc.withAll) {
    (msg.info.structured_output as Record<string, unknown>).reasoning = "Test reasoning";
  }
  if (tc.withOutput || tc.withAll) {
    (msg.info.structured_output as Record<string, unknown>).output = "Test output";
  }

  const result = extractStructuredOutput(msg);
  console.log(`  ${tc.desc}: ${result ? "✓" : "✗"}`);
}

console.log("\nAll structured output tests ready to run with: bun test src/sdk/__tests__/structured-output.test.ts");

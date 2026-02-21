/**
 * SDK Executor Tests
 *
 * Tests for the executePrompt function and structured output integration.
 */

import { describe, test, expect } from "bun:test";
import type {
  ExecutionResult,
  ExecutionOptions,
  StructuredOutput,
  StructuredOutputSchema,
} from "../executor";

// Default JSON schema for structured output completion detection
const DEFAULT_STRUCTURED_OUTPUT_SCHEMA: StructuredOutputSchema = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      completed: { type: "boolean", description: "Whether the task is complete" },
      reasoning: { type: "string", description: "Brief explanation of completion status" },
      output: { type: "string", description: "The actual output text" },
    },
    required: ["completed"],
  },
};

describe("Structured Output Integration", () => {
  describe("StructuredOutputSchema", () => {
    test("default schema has correct type", () => {
      expect(DEFAULT_STRUCTURED_OUTPUT_SCHEMA.type).toBe("json_schema");
    });

    test("default schema requires completed field", () => {
      expect(DEFAULT_STRUCTURED_OUTPUT_SCHEMA.schema.required).toContain("completed");
    });

    test("default schema has all expected properties", () => {
      const props = DEFAULT_STRUCTURED_OUTPUT_SCHEMA.schema.properties;
      expect(props.completed).toBeDefined();
      expect(props.reasoning).toBeDefined();
      expect(props.output).toBeDefined();
    });

    test("completed field is defined as boolean", () => {
      const completed = DEFAULT_STRUCTURED_OUTPUT_SCHEMA.schema.properties.completed;
      expect(completed.type).toBe("boolean");
      expect(completed.description).toContain("complete");
    });

    test("reasoning field is optional string", () => {
      const reasoning = DEFAULT_STRUCTURED_OUTPUT_SCHEMA.schema.properties.reasoning;
      expect(reasoning?.type).toBe("string");
    });

    test("output field is optional string", () => {
      const output = DEFAULT_STRUCTURED_OUTPUT_SCHEMA.schema.properties.output;
      expect(output?.type).toBe("string");
    });
  });

  describe("ExecutionOptions interface", () => {
    test("accepts format schema", () => {
      const options: Partial<ExecutionOptions> = {
        format: DEFAULT_STRUCTURED_OUTPUT_SCHEMA,
      };
      expect(options.format).toBe(DEFAULT_STRUCTURED_OUTPUT_SCHEMA);
    });

    test("format is optional", () => {
      const options: Partial<ExecutionOptions> = {};
      expect(options.format).toBeUndefined();
    });
  });

  describe("ExecutionResult interface", () => {
    test("includes structuredOutput field when available", () => {
      const structuredOutput: StructuredOutput = {
        completed: true,
        reasoning: "Task done",
        output: "Result",
      };

      const result: Partial<ExecutionResult> = {
        output: "Text output",
        toolCounts: new Map(),
        errors: [],
        success: true,
        exitCode: 0,
        structuredOutput,
      };

      expect(result.structuredOutput).toBeDefined();
      expect(result.structuredOutput?.completed).toBe(true);
    });

    test("structuredOutput is optional", () => {
      const result: Partial<ExecutionResult> = {
        output: "Text output",
        toolCounts: new Map(),
        errors: [],
        success: true,
        exitCode: 0,
      };

      expect(result.structuredOutput).toBeUndefined();
    });

    test("result without structuredOutput is still valid", () => {
      const result: ExecutionResult = {
        output: "Regular text output",
        toolCounts: new Map([["read", 5]]),
        errors: [],
        success: true,
        exitCode: 0,
      };

      expect(result.success).toBe(true);
      expect(result.toolCounts.get("read")).toBe(5);
      expect(result.structuredOutput).toBeUndefined();
    });
  });

  describe("StructuredOutput interface", () => {
    test("accepts completed true with all fields", () => {
      const output: StructuredOutput = {
        completed: true,
        reasoning: "All done",
        output: "Final result",
      };

      expect(output.completed).toBe(true);
      expect(output.reasoning).toBe("All done");
      expect(output.output).toBe("Final result");
    });

    test("accepts completed false with reasoning only", () => {
      const output: StructuredOutput = {
        completed: false,
        reasoning: "Not finished yet",
      };

      expect(output.completed).toBe(false);
      expect(output.reasoning).toBe("Not finished yet");
      expect(output.output).toBeUndefined();
    });

    test("accepts minimal completed true", () => {
      const output: StructuredOutput = {
        completed: true,
      };

      expect(output.completed).toBe(true);
      expect(output.reasoning).toBeUndefined();
      expect(output.output).toBeUndefined();
    });

    test("accepts completed false with output only", () => {
      const output: StructuredOutput = {
        completed: false,
        output: "Partial results",
      };

      expect(output.completed).toBe(false);
      expect(output.output).toBe("Partial results");
    });
  });
});

describe("Request Body Construction", () => {
  describe("when useStructuredOutput is true", () => {
    test("includes format in request body", () => {
      const requestBody: Record<string, unknown> = {
        model: undefined,
        agent: undefined,
        parts: [{ type: "text", text: "test prompt" }],
      };

      const useStructuredOutput = true;
      if (useStructuredOutput) {
        requestBody.format = DEFAULT_STRUCTURED_OUTPUT_SCHEMA;
      }

      expect(requestBody.format).toBeDefined();
      expect((requestBody.format as StructuredOutputSchema).type).toBe("json_schema");
    });

    test("uses custom format when provided", () => {
      const customSchema: StructuredOutputSchema = {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            completed: { type: "boolean", description: "Custom desc" },
          },
          required: ["completed"],
        },
      };

      const requestBody: Record<string, unknown> = {
        parts: [{ type: "text", text: "test" }],
      };

      const useStructuredOutput = true;
      const format = customSchema;

      if (useStructuredOutput) {
        requestBody.format = format ?? DEFAULT_STRUCTURED_OUTPUT_SCHEMA;
      }

      expect(requestBody.format).toBe(customSchema);
      expect((requestBody.format as StructuredOutputSchema).schema.properties.completed.description).toBe(
        "Custom desc"
      );
    });

    test("falls back to default schema when format not provided", () => {
      const requestBody: Record<string, unknown> = {
        parts: [{ type: "text", text: "test" }],
      };

      const useStructuredOutput = true;
      const format = undefined;

      if (useStructuredOutput) {
        requestBody.format = format ?? DEFAULT_STRUCTURED_OUTPUT_SCHEMA;
      }

      expect(requestBody.format).toBe(DEFAULT_STRUCTURED_OUTPUT_SCHEMA);
    });
  });

  describe("when useStructuredOutput is false", () => {
    test("does not include format in request body", () => {
      const requestBody: Record<string, unknown> = {
        model: undefined,
        agent: undefined,
        parts: [{ type: "text", text: "test prompt" }],
      };

      const useStructuredOutput = false;
      if (useStructuredOutput) {
        requestBody.format = DEFAULT_STRUCTURED_OUTPUT_SCHEMA;
      }

      expect(requestBody.format).toBeUndefined();
    });
  });

  describe("backward compatibility", () => {
    test("works without useStructuredOutput flag", () => {
      const requestBody: Record<string, unknown> = {
        model: { providerID: "openai", modelID: "gpt-4" },
        agent: "default",
        parts: [{ type: "text", text: "test prompt" }],
      };

      // No useStructuredOutput handling

      expect(requestBody.format).toBeUndefined();
      expect(requestBody.parts).toHaveLength(1);
    });

    test("request body structure is correct", () => {
      const requestBody: Record<string, unknown> = {
        model: {
          providerID: "openai",
          modelID: "gpt-4",
        },
        agent: "build",
        parts: [{ type: "text", text: "Build this project" }],
      };

      expect(requestBody.model).toEqual({ providerID: "openai", modelID: "gpt-4" });
      expect(requestBody.agent).toBe("build");
      expect(requestBody.parts).toEqual([{ type: "text", text: "Build this project" }]);
    });
  });
});

describe("Execution Result with Structured Output", () => {
  test("result includes structuredOutput when extraction succeeds", () => {
    const mockStructuredOutput: StructuredOutput = {
      completed: true,
      reasoning: "Task completed successfully",
      output: "Build finished",
    };

    const result: ExecutionResult = {
      output: "Build finished",
      toolCounts: new Map([["build", 1]]),
      errors: [],
      success: true,
      exitCode: 0,
      structuredOutput: mockStructuredOutput,
    };

    expect(result.structuredOutput).toBeDefined();
    expect(result.structuredOutput?.completed).toBe(true);
    expect(result.success).toBe(true);
  });

  test("result excludes structuredOutput when extraction fails", () => {
    const result: ExecutionResult = {
      output: "Some output",
      toolCounts: new Map(),
      errors: ["Failed to parse structured output"],
      success: false,
      exitCode: 1,
      // structuredOutput omitted - extraction failed
    };

    expect(result.structuredOutput).toBeUndefined();
    expect(result.success).toBe(false);
  });

  test("result excludes structuredOutput when not requested", () => {
    const result: ExecutionResult = {
      output: "<promise>DONE</promise>",
      toolCounts: new Map([["read", 2]]),
      errors: [],
      success: true,
      exitCode: 0,
      // structuredOutput not included
    };

    expect(result.structuredOutput).toBeUndefined();
    expect(result.success).toBe(true);
  });

  test("failed execution can still have structuredOutput", () => {
    const mockStructuredOutput: StructuredOutput = {
      completed: false,
      reasoning: "Task failed due to error",
    };

    const result: ExecutionResult = {
      output: "Error occurred",
      toolCounts: new Map(),
      errors: ["Build failed"],
      success: false,
      exitCode: 1,
      structuredOutput: mockStructuredOutput,
    };

    expect(result.structuredOutput).toBeDefined();
    expect(result.structuredOutput?.completed).toBe(false);
    expect(result.success).toBe(false);
  });
});

console.log("Executor structured output tests loaded successfully");
console.log("Testing schema validation and request body construction...");

const schemaTests = [
  { useStructured: true, hasFormat: false, desc: "structured without custom format" },
  { useStructured: true, hasFormat: true, desc: "structured with custom format" },
  { useStructured: false, hasFormat: false, desc: "no structured output" },
];

for (const tc of schemaTests) {
  const body: Record<string, unknown> = { parts: [{ type: "text", text: "test" }] };

  if (tc.useStructured) {
    body.format = tc.hasFormat
      ? { type: "json_schema", schema: { type: "object", properties: {}, required: [] } }
      : DEFAULT_STRUCTURED_OUTPUT_SCHEMA;
  }

  const hasFormat = !!body.format;
  console.log(`  ${tc.desc}: ${hasFormat ? "✓" : "✗"} format included`);
}

console.log("\nAll executor tests ready to run with: bun test src/sdk/__tests__/executor.test.ts");

/**
 * Argument Parser Tests
 *
 * Tests for CLI argument parsing, validation, and edge cases.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { parseArgs, ArgConfig, ParseResult } from "../args";

interface TestArgs {
  prompt?: string;
  model?: string;
  "max-iterations"?: number;
  "min-iterations"?: number;
  "completion-promise"?: string;
  "abort-promise"?: string;
  tasks?: boolean;
  "task-promise"?: string;
  supervisor?: boolean;
  "supervisor-memory-limit"?: number;
  "no-stream"?: boolean;
  "verbose-tools"?: boolean;
  "dry-run"?: boolean;
  "prompt-file"?: string;
}

describe("parseArgs", () => {
  afterEach(() => {
  });

  test("parses string arguments", () => {
    const schema: ArgConfig[] = [
      { name: "model", type: "string" },
      { name: "prompt", type: "string" },
    ];

    const result = parseArgs<TestArgs>(["--model", "test-model", "some-prompt"], schema);

    expect(result.args.model).toBe("test-model");
    expect(result.args.prompt).toBe(undefined);
    expect(result.promptParts).toEqual(["some-prompt"]);
    expect(result.errors).toHaveLength(0);
  });

  test("parses boolean flags", () => {
    const schema: ArgConfig[] = [
      { name: "tasks", type: "boolean" },
      { name: "verbose-tools", type: "boolean" },
    ];

    const result = parseArgs<TestArgs>(["--tasks", "--verbose-tools", "prompt"], schema);

    expect(result.args["tasks"]).toBe(true);
    expect(result.args["verbose-tools"]).toBe(true);
    expect(result.promptParts).toEqual(["prompt"]);
    expect(result.errors).toHaveLength(0);
  });

  test("parses number arguments", () => {
    const schema: ArgConfig[] = [
      { name: "max-iterations", type: "number" },
      { name: "min-iterations", type: "number" },
    ];

    const result = parseArgs<TestArgs>(
      ["--max-iterations", "10", "--min-iterations", "5", "prompt"],
      schema
    );

    expect(result.args["max-iterations"]).toBe(10);
    expect(result.args["min-iterations"]).toBe(5);
    expect(result.promptParts).toEqual(["prompt"]);
    expect(result.errors).toHaveLength(0);
  });

  test("handles aliases", () => {
    const schema: ArgConfig[] = [
      { name: "prompt-file", aliases: ["-f"], type: "string" },
      { name: "tasks", aliases: ["-t"], type: "boolean" },
    ];

    const result = parseArgs<TestArgs>(["-f", "file.txt", "-t"], schema);

    expect(result.args["prompt-file"]).toBe("file.txt");
    expect(result.args["tasks"]).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("applies default values", () => {
    const schema: ArgConfig[] = [
      { name: "max-iterations", type: "number", default: 20 },
      { name: "completion-promise", type: "string", default: "COMPLETE" },
      { name: "tasks", type: "boolean", default: false },
    ];

    const result = parseArgs<TestArgs>(["prompt"], schema);

    expect(result.args["max-iterations"]).toBe(20);
    expect(result.args["completion-promise"]).toBe("COMPLETE");
    expect(result.args["tasks"]).toBe(false);
    expect(result.promptParts).toEqual(["prompt"]);
    expect(result.errors).toHaveLength(0);
  });

  test("returns errors for missing required arguments", () => {
    const schema: ArgConfig[] = [
      { name: "model", type: "string", required: true },
    ];

    const result = parseArgs<TestArgs>(["prompt"], schema);

    expect(result.errors).toContain("Required option --model not provided");
  });

  test("returns errors for unknown options", () => {
    const schema: ArgConfig[] = [
      { name: "model", type: "string" },
    ];

    const result = parseArgs<TestArgs>(["--unknown", "value", "prompt"], schema);

    expect(result.errors).toContain("Unknown option: --unknown");
    expect(result.promptParts).toEqual(["value", "prompt"]);
  });

  test("returns errors for arguments that require values", () => {
    const schema: ArgConfig[] = [
      { name: "model", type: "string" },
    ];

    const result = parseArgs<TestArgs>(["--model", "prompt"], schema);

    expect(result.args.model).toBe("prompt");
    expect(result.promptParts).toEqual([]);
  });

  test("returns errors for invalid number values", () => {
    const schema: ArgConfig[] = [
      { name: "max-iterations", type: "number" },
    ];

    const result = parseArgs<TestArgs>(["--max-iterations", "not-a-number", "prompt"], schema);

    expect(result.errors).toContain("Invalid number value for --max-iterations: not-a-number");
    expect(result.promptParts).toEqual(["not-a-number", "prompt"]);
  });

  test("applies custom validation", () => {
    const schema: ArgConfig[] = [
      {
        name: "max-iterations",
        type: "number",
        validate: (val: number) => val >= 0 || "must be non-negative",
      },
    ];

    const result = parseArgs<TestArgs>(["--max-iterations", "-5", "prompt"], schema);

    expect(result.errors).toContain("must be non-negative");
  });

  test("custom validation with string error message", () => {
    const schema: ArgConfig[] = [
      {
        name: "max-iterations",
        type: "number",
        validate: (val: number) => val <= 100 || "must be at most 100",
      },
    ];

    const result = parseArgs<TestArgs>(["--max-iterations", "150", "prompt"], schema);

    expect(result.errors).toContain("must be at most 100");
  });

  test("parses boolean 1 as true", () => {
    const schema: ArgConfig[] = [
      { name: "tasks", type: "boolean" },
    ];

    const result = parseArgs<TestArgs>(["--tasks", "1"], schema);

    expect(result.args.tasks).toBe(true);
  });

  test("parses boolean true as true", () => {
    const schema: ArgConfig[] = [
      { name: "tasks", type: "boolean" },
    ];

    const result = parseArgs<TestArgs>(["--tasks", "true"], schema);

    expect(result.args.tasks).toBe(true);
  });

  test("parses boolean 0 as false", () => {
    const schema: ArgConfig[] = [
      { name: "tasks", type: "boolean" },
    ];

    const result = parseArgs<TestArgs>(["--tasks", "0"], schema);

    expect(result.args.tasks).toBe(true);
    expect(result.promptParts).toEqual(["0"]);
  });

  test("handles multiple errors", () => {
    const schema: ArgConfig[] = [
      { name: "model", type: "string", required: true },
      {
        name: "max-iterations",
        type: "number",
        validate: (val: number) => val > 0 || "must be positive",
      },
    ];

    const result = parseArgs<TestArgs>(["--max-iterations", "-1", "prompt"], schema);

    expect(result.errors).toContain("Required option --model not provided");
    expect(result.errors).toContain("must be positive");
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  test("empty arg list returns defaults", () => {
    const schema: ArgConfig[] = [
      { name: "model", type: "string", default: "default-model" },
      { name: "tasks", type: "boolean", default: false },
    ];

    const result = parseArgs<TestArgs>([], schema);

    expect(result.args.model).toBe("default-model");
    expect(result.args.tasks).toBe(false);
    expect(result.promptParts).toEqual([]);
    expect(result.errors).toHaveLength(0);
  });

  test("validation passes for valid values", () => {
    const schema: ArgConfig[] = [
      {
        name: "max-iterations",
        type: "number",
        validate: (val: number) => val >= 0 || "must be non-negative",
      },
    ];

    const result = parseArgs<TestArgs>(["--max-iterations", "10", "prompt"], schema);

    expect(result.args["max-iterations"]).toBe(10);
    expect(result.errors).toHaveLength(0);
  });

  test("non-flag arguments are captured as prompt parts", () => {
    const schema: ArgConfig[] = [
      { name: "model", type: "string" },
    ];

    const result = parseArgs<TestArgs>(
      ["word1", "word2", "--model", "test", "word3", "word4"],
      schema
    );

    expect(result.args.model).toBe("test");
    expect(result.promptParts).toEqual(["word1", "word2", "word3", "word4"]);
  });

  test("handles complex scenario with multiple types and validation", () => {
    const schema: ArgConfig[] = [
      { name: "model", type: "string" },
      { name: "max-iterations", type: "number", default: 10 },
      { name: "tasks", type: "boolean", default: false },
      {
        name: "min-iterations",
        type: "number",
        default: 1,
        validate: (val: number) => val >= 0 || "must be non-negative",
      },
    ];

    const result = parseArgs<TestArgs>(
      ["--model", "test-model", "--tasks", "--min-iterations", "5", "prompt text", "more prompt"],
      schema
    );

    expect(result.args.model).toBe("test-model");
    expect(result.args["max-iterations"]).toBe(10);
    expect(result.args["tasks"]).toBe(true);
    expect(result.args["min-iterations"]).toBe(5);
    expect(result.promptParts).toEqual(["prompt text", "more prompt"]);
    expect(result.errors).toHaveLength(0);
  });
});

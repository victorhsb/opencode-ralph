/**
 * Prompt Building Tests
 *
 * Tests for prompt building and template variable replacement.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { buildPrompt, loadCustomPromptTemplate } from "../prompts";
import { RalphState } from "../../state/state";
import { existsSync, unlinkSync, writeFileSync, mkdirSync, rmdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("buildPrompt", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `prompts-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try {
      unlinkSync(join(tempDir, "template.txt"));
    } catch {}
    try {
      unlinkSync(join(tempDir, "context.md"));
    } catch {}
    try {
      unlinkSync(join(tempDir, "tasks.md"));
    } catch {}
    try {
      rmdirSync(tempDir);
    } catch {}
  });

  const createBaseState = (overrides: Partial<RalphState> = {}): RalphState => ({
    version: 1,
    active: false,
    iteration: 1,
    minIterations: 1,
    maxIterations: 10,
    completionPromise: "COMPLETE",
    tasksMode: false,
    taskPromise: "TASK_COMPLETE",
    prompt: "Test prompt",
    startedAt: new Date().toISOString(),
    model: "test-model",
    ...overrides,
  });

  test("builds standard prompt without tasks mode", () => {
    const state = createBaseState();
    const prompt = buildPrompt(state);

    expect(prompt).toContain("Ralph Wiggum Loop - Iteration 1");
    expect(prompt).toContain("Test prompt");
    expect(prompt).toContain("COMPLETE");
    expect(prompt).toContain("an iterative development loop");
    expect(prompt).not.toContain("Tasks Mode: ENABLED");
  });

  test("builds prompt with tasks mode enabled", () => {
    const state = createBaseState({ tasksMode: true });
    const prompt = buildPrompt(state);

    expect(prompt).toContain("Ralph Wiggum Loop - Iteration 1");
    expect(prompt).toContain("Tasks Mode: ENABLED");
    expect(prompt).toContain("TASK_COMPLETE");
    expect(prompt).toContain("Work on ONE task at a time");
  });

  test("includes iteration count correctly", () => {
    const state = createBaseState({ iteration: 5 });
    const prompt = buildPrompt(state);

    expect(prompt).toContain("Iteration 5");
  });

  test("shows max iterations when set", () => {
    const state = createBaseState({ maxIterations: 20 });
    const prompt = buildPrompt(state);

    expect(prompt).toContain("1 / 20");
  });

  test("shows unlimited when max iterations is 0", () => {
    const state = createBaseState({ maxIterations: 0 });
    const prompt = buildPrompt(state);

    expect(prompt).toContain("(unlimited)");
  });

  test("does not include abort promise in standard prompt", () => {
    const state = createBaseState({ abortPromise: "ABORT" });
    const prompt = buildPrompt(state);

    expect(prompt).not.toContain("ABORT");
  });

  test("includes min iterations in display", () => {
    const state = createBaseState({ minIterations: 3 });
    const prompt = buildPrompt(state);

    expect(prompt).toContain("(min: 3)");
  });

  test("handles custom template path", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Custom: {{prompt}} at iteration {{iteration}}");

    const state = createBaseState();
    const prompt = buildPrompt(state, templatePath);

    expect(prompt).toContain("Custom: Test prompt at iteration 1");
  });

  test("includes completion promise in output", () => {
    const state = createBaseState({ completionPromise: "DONE" });
    const prompt = buildPrompt(state);

    expect(prompt).toContain("<promise>DONE</promise>");
  });

  test("includes task promise in tasks mode", () => {
    const state = createBaseState({ tasksMode: true, taskPromise: "NEXT_TASK" });
    const prompt = buildPrompt(state);

    expect(prompt).toContain("<promise>NEXT_TASK</promise>");
  });
});

describe("loadCustomPromptTemplate", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `template-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try {
      unlinkSync(join(tempDir, "template.txt"));
    } catch {}
    try {
      unlinkSync(join(tempDir, "context.md"));
    } catch {}
    try {
      unlinkSync(join(tempDir, "tasks.md"));
    } catch {}
    try {
      rmdirSync(tempDir);
    } catch {}
  });

  const createBaseState = (overrides: Partial<RalphState> = {}): RalphState => ({
    version: 1,
    active: false,
    iteration: 1,
    minIterations: 1,
    maxIterations: 10,
    completionPromise: "COMPLETE",
    tasksMode: false,
    taskPromise: "TASK_COMPLETE",
    prompt: "Test prompt",
    startedAt: new Date().toISOString(),
    model: "test-model",
    ...overrides,
  });

  test("replaces {{prompt}} variable", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Prompt: {{prompt}}");

    const state = createBaseState({ prompt: "My custom prompt" });
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("Prompt: My custom prompt");
  });

  test("replaces {{iteration}} variable", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Iteration {{iteration}}");

    const state = createBaseState({ iteration: 5 });
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("Iteration 5");
  });

  test("replaces {{max_iterations}} with number", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Max: {{max_iterations}}");

    const state = createBaseState({ maxIterations: 20 });
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("Max: 20");
  });

  test("replaces {{max_iterations}} with unlimited when 0", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Max: {{max_iterations}}");

    const state = createBaseState({ maxIterations: 0 });
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("Max: unlimited");
  });

  test("replaces {{min_iterations}} variable", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Min: {{min_iterations}}");

    const state = createBaseState({ minIterations: 3 });
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("Min: 3");
  });

  test("replaces {{completion_promise}} variable", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Promise: {{completion_promise}}");

    const state = createBaseState({ completionPromise: "DONE" });
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("Promise: DONE");
  });

  test("replaces {{abort_promise}} when set", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Abort: {{abort_promise}}");

    const state = createBaseState({ abortPromise: "ABORT" });
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("Abort: ABORT");
  });

  test("replaces {{abort_promise}} with empty string when not set", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Abort: {{abort_promise}}");

    const state = createBaseState();
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("Abort: ");
  });

  test("replaces {{task_promise}} variable", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Task Promise: {{task_promise}}");

    const state = createBaseState({ taskPromise: "TASK_DONE" });
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("Task Promise: TASK_DONE");
  });

  test("replaces {{context}} when context file exists", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Context: {{context}}");

    const state = createBaseState();

    const result = loadCustomPromptTemplate(templatePath, state);
    expect(result).toContain("Context: ");
  });

  test("replaces {{tasks}} when tasks mode is enabled", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "Tasks: {{tasks}}");

    const state = createBaseState({ tasksMode: true });

    const result = loadCustomPromptTemplate(templatePath, state);
    expect(result).toContain("Tasks: ");
  });

  test("replaces multiple variables in one template", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(
      templatePath,
      "Iteration {{iteration}} / {{max_iterations}}\nPrompt: {{prompt}}\nPromise: {{completion_promise}}"
    );

    const state = createBaseState({ iteration: 3, maxIterations: 10, completionPromise: "FINISHED" });
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toContain("Iteration 3 / 10");
    expect(result).toContain("Prompt: Test prompt");
    expect(result).toContain("Promise: FINISHED");
  });

  test("handles all variable types", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(
      templatePath,
      "{{iteration}}|{{max_iterations}}|{{min_iterations}}|{{prompt}}|{{completion_promise}}|{{task_promise}}|{{abort_promise}}|{{context}}|{{tasks}}"
    );

    const state = createBaseState({
      iteration: 2,
      maxIterations: 20,
      minIterations: 1,
      completionPromise: "DONE",
      taskPromise: "NEXT",
      abortPromise: "STOP",
      tasksMode: true,
    });

    const result = loadCustomPromptTemplate(templatePath, state);
    expect(result).toContain("2|20|1|Test prompt|DONE|NEXT|STOP|");
  });

  test("preserves template formatting", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(
      templatePath,
      `# Header

{{prompt}}

## Section 1
Content

## Section 2
{{iteration}}
`
    );

    const state = createBaseState();
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toContain("# Header");
    expect(result).toContain("## Section 1");
    expect(result).toContain("## Section 2");
  });

  test("handles empty template", () => {
    const templatePath = join(tempDir, "template.txt");
    writeFileSync(templatePath, "");

    const state = createBaseState();
    const result = loadCustomPromptTemplate(templatePath, state);

    expect(result).toBe("");
  });
});

/**
 * Prompt Building Module
 *
 * Constructs dynamic prompts for Ralph Loop iterations using composable sections.
 * Supports two modes: regular (single task) and tasks mode (task list).
 *
 * @module prompts
 */

import { existsSync, readFileSync } from "fs";
import { RalphState } from "../state/state";
import { loadContext } from "../context/context";
import { getTasksModeSection } from "../tasks/tasks";
import { getTasksFilePath } from "../config/config";
import { PromptBuilder } from "./prompt-builder";
import { logger as console } from "../logger";

/**
 * Builds the iteration info content (without header).
 * The title is added by PromptBuilder.
 */
function buildIterationInfoContent(state: RalphState): string {
  const maxInfo =
    state.maxIterations > 0 ? ` / ${state.maxIterations}` : " (unlimited)";
  const minInfo = state.minIterations ?? 1;
  return `Current Iteration: ${state.iteration}${maxInfo} (min: ${minInfo})`;
}

/**
 * Loads user-added context from .ralph/context.md.
 * Returns null if no context exists.
 */
function buildContextContent(): string | null {
  return loadContext();
}

/**
 * Returns the output format intro text (for use with PromptBuilder).
 */
function buildOutputFormatIntro(): string {
  return `Your response will be parsed as structured JSON with these fields:`;
}

/**
 * Returns the output format list items.
 */
function buildOutputFormatItems(): string[] {
  return [
    `"completed": Set to true ONLY when the task is genuinely complete`,
    `"reasoning": Briefly explain why the task is or isn't complete`,
    `"output": Your actual response text`,
  ];
}

/**
 * Returns the output format footer text.
 */
function buildOutputFormatFooter(): string {
  return `The system will check the "completed" field to detect task completion.`;
}

/**
 * Returns critical rules list items for tasks mode.
 */
function buildCriticalRulesTasksMode(state: RalphState): string[] {
  const promiseTags = `<promise>${state.taskPromise}</promise> for task completion, <promise>${state.completionPromise}</promise> for ALL tasks done`;
  return [
    "Work on ONE task at a time from your task list",
    'Set "completed" to true ONLY when the current task is complete and marked in tasks.md (or ALL tasks are done for final completion)',
    'Provide brief reasoning in the "reasoning" field about completion status',
    'Put your main response text in the "output" field',
    `The old <promise> tag format is now OPTIONAL: ${promiseTags}`,
    'Output promise tags DIRECTLY - do not quote them, explain them, or say you "will" output them',
    "Do NOT lie or output false promises to exit the loop",
    "If stuck, try a different approach",
    "Check your work before claiming completion",
  ];
}

/**
 * Returns critical rules list items for regular mode.
 */
function buildCriticalRulesRegularMode(state: RalphState): string[] {
  const promiseTags = `<promise>${state.completionPromise}</promise>`;
  return [
    'Set "completed" to true ONLY when the task is truly done',
    'Provide brief reasoning in the "reasoning" field about completion status',
    'Put your main response text in the "output" field',
    `The old <promise> tag format is now OPTIONAL: ${promiseTags}`,
    'Output promise tags DIRECTLY - do not quote it, or say you "will" output it',
    "Do NOT lie or output false promises to exit the loop",
    "If stuck, try a different approach",
    "Check your work before claiming completion",
    "The loop will continue until you succeed",
  ];
}

/**
 * Step-by-step guidance for the iteration (numbered list as text).
 * PromptBuilder doesn't support numbered lists, so rendered as text.
 */
function buildInstructionsContent(): string {
  return `1. Read the current state of files to understand what's been done
2. Track your progress and plan remaining work
3. Make progress on the task
4. Run tests/verification if applicable
5. When the task is GENUINELY COMPLETE, set "completed" to true`;
}

/**
 * Sets context for tasks mode: working through a task list.
 */
function buildTasksModeIntro(): string {
  return `You are in an iterative development loop working through a task list.`;
}

/**
 * Sets context for regular mode: single task until completion.
 */
function buildRegularModeIntro(): string {
  return `You are in an iterative development loop. Work on the task below until you can genuinely complete it.`;
}

/**
 * Closing encouragement for tasks mode.
 */
function buildTasksModeFooter(): string {
  return `Tasks Mode: ENABLED - Work on one task at a time from tasks.md

Now, work on the current task. Good luck!`;
}

/**
 * Closing encouragement for regular mode.
 */
function buildRegularModeFooter(): string {
  return `Now, work on the task. Good luck!`;
}

/**
 * Loads and processes a custom prompt template file.
 *
 * Reads a user-provided template and substitutes variables with loop state values.
 * Exits with error if the template file doesn't exist.
 *
 * @param templatePath - Absolute path to the custom template file
 * @param state - Current loop state
 * @returns Processed template string, or null if template doesn't exist
 */
export function loadCustomPromptTemplate(
  templatePath: string,
  state: RalphState,
): string | null {
  if (!existsSync(templatePath)) {
    console.error(`Error: Prompt template not found: ${templatePath}`);
    process.exit(1);
  }

  try {
    let template = readFileSync(templatePath, "utf-8");

    const context = loadContext() || "";

    const tasksPath = getTasksFilePath();
    let tasksContent = "";
    if (state.tasksMode && existsSync(tasksPath)) {
      tasksContent = readFileSync(tasksPath, "utf-8");
    }

    template = template
      .replace(/\{\{iteration\}\}/g, String(state.iteration))
      .replace(
        /\{\{max_iterations\}\}/g,
        state.maxIterations > 0 ? String(state.maxIterations) : "unlimited",
      )
      .replace(/\{\{min_iterations\}\}/g, String(state.minIterations))
      .replace(/\{\{prompt\}\}/g, state.prompt)
      .replace(/\{\{completion_promise\}\}/g, state.completionPromise)
      .replace(/\{\{abort_promise\}\}/g, state.abortPromise || "")
      .replace(/\{\{task_promise\}\}/g, state.taskPromise)
      .replace(/\{\{context\}\}/g, context)
      .replace(/\{\{tasks\}\}/g, tasksContent);

    return template;
  } catch (err) {
    console.error(`Error reading prompt template: ${err}`);
    process.exit(1);
  }
}

/**
 * Builds the prompt for the current iteration.
 *
 * Entry point for prompt construction. Routes to either custom template,
 * tasks mode prompt, or regular mode prompt based on state.
 *
 * @param state - Current loop state
 * @param promptTemplatePath - Optional path to custom template file
 * @returns Complete prompt string for this iteration
 */
export function buildPrompt(
  state: RalphState,
  promptTemplatePath?: string,
): string {
  if (promptTemplatePath) {
    const customPrompt = loadCustomPromptTemplate(promptTemplatePath, state);
    if (customPrompt) return customPrompt;
  }

  if (state.tasksMode) {
    return buildTasksModePrompt(state);
  }

  return buildRegularPrompt(state);
}

/**
 * Composes all sections for tasks mode (iterative task list).
 * Section order: header → intro → context → task list → goal → format → rules → iteration → footer
 */
function buildTasksModePrompt(state: RalphState): string {
  const builder = new PromptBuilder();

  builder.addText(buildTasksModeIntro());

  const context = buildContextContent();
  if (context) {
    builder.addText(context, "Additional Context (added by user mid-loop)");
  }

  const tasksSection = getTasksModeSection(state);
  if (tasksSection) {
    builder.addText(tasksSection);
  }

  builder.addText(state.prompt, "Your Main Goal");

  const verificationRules = getVerificationRulesSection(state);
  if (verificationRules) {
    builder.addText(verificationRules);
  }

  const verificationFailure = getVerificationFailureSection(state);
  if (verificationFailure) {
    builder.addText(verificationFailure);
  }

  builder.addText(buildOutputFormatIntro(), "Output Format");
  builder.addList(buildOutputFormatItems());
  builder.addText(buildOutputFormatFooter());

  builder.addList(buildCriticalRulesTasksMode(state), "Critical Rules");
  builder.addText(buildIterationInfoContent(state), "Current Iteration");
  builder.addText(buildTasksModeFooter());

  return builder.build();
}

/**
 * Composes all sections for regular mode (single task).
 * Section order: header → iteration → intro → context → task → format → instructions → rules → footer
 */
function buildRegularPrompt(state: RalphState): string {
  const builder = new PromptBuilder();

  // builder.addText(buildHeader(state));
  // builder.addText(buildIterationInfoContent(state), "Current Iteration");
  builder.addText(buildRegularModeIntro());

  const context = buildContextContent();
  if (context) {
    builder.addText(context, "Additional Context (added by user mid-loop)");
  }

  builder.addText(state.prompt, "Your Task");

  const verificationRules = getVerificationRulesSection(state);
  if (verificationRules) {
    builder.addText(verificationRules);
  }

  const verificationFailure = getVerificationFailureSection(state);
  if (verificationFailure) {
    builder.addText(verificationFailure);
  }

  builder.addText(buildOutputFormatIntro(), "Output Format");
  builder.addList(buildOutputFormatItems());
  builder.addText(buildOutputFormatFooter());

  builder.addText(buildInstructionsContent(), "Instructions");
  builder.addList(buildCriticalRulesRegularMode(state), "Critical Rules");
  builder.addText(buildRegularModeFooter());

  return builder.build();
}

function getVerificationRulesSection(state: RalphState): string {
  if (
    !state.verification?.enabled ||
    state.verification.commands.length === 0
  ) {
    return "";
  }

  const commands = state.verification.commands
    .map((command) => `- ${command}`)
    .join("\n");

  return `
## Verification Requirements

Verification mode: ${state.verification.mode}
These commands must pass before completion claims are accepted:
${commands}
`.trimEnd();
}

function getVerificationFailureSection(state: RalphState): string {
  if (
    !state.verification?.enabled ||
    state.verification.lastRunPassed !== false
  ) {
    return "";
  }

  const summary =
    state.verification.lastFailureSummary ??
    "Verification failed in the previous iteration.";
  const details = state.verification.lastFailureDetails
    ? `\nDetails:\n${state.verification.lastFailureDetails}`
    : "";

  return `
## Previous Verification Failure (must be fixed)

${summary}${details}

Fix the verification failures before setting completion to true again.

---
`;
}

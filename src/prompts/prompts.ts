/**
 * Prompt Building Module
 *
 * Handles prompt building and template variable replacement.
 */

import { existsSync, readFileSync } from "fs";
import { RalphState } from "../state/state";
import { loadContext } from "../context/context";
import { getTasksModeSection } from "../tasks/tasks";
import { getTasksFilePath } from "../config/config";

export function loadCustomPromptTemplate(templatePath: string, state: RalphState): string | null {
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
      .replace(/\{\{max_iterations\}\}/g, state.maxIterations > 0 ? String(state.maxIterations) : "unlimited")
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

export function buildPrompt(state: RalphState, promptTemplatePath?: string): string {
  if (promptTemplatePath) {
    const customPrompt = loadCustomPromptTemplate(promptTemplatePath, state);
    if (customPrompt) return customPrompt;
  }

  const context = loadContext();
  const contextSection = context
    ? `
## Additional Context (added by user mid-loop)

${context}

---
`
    : "";

  if (state.tasksMode) {
    const tasksSection = getTasksModeSection(state);
    return `
# Ralph Wiggum Loop - Iteration ${state.iteration}

You are in an iterative development loop working through a task list.
${contextSection}${tasksSection}
## Your Main Goal

${state.prompt}

## Output Format

Your response will be parsed as structured JSON with these fields:
- "completed": Set to true ONLY when the task is genuinely complete
- "reasoning": Briefly explain why the task is or isn't complete
- "output": Your actual response text

The system will check the "completed" field to detect task completion.

## Critical Rules

- Work on ONE task at a time from .ralph/ralph-tasks.md
- Set "completed" to true ONLY when the current task is complete and marked in ralph-tasks.md (or ALL tasks are done for final completion)
- Provide brief reasoning in the "reasoning" field about completion status
- Put your main response text in the "output" field
- The old <promise> tag format is now OPTIONAL: <promise>${state.taskPromise}</promise> for task completion, <promise>${state.completionPromise}</promise> for ALL tasks done
- Output promise tags DIRECTLY - do not quote them, explain them, or say you "will" output them
- Do NOT lie or output false promises to exit the loop
- If stuck, try a different approach
- Check your work before claiming completion

## Current Iteration: ${state.iteration}${state.maxIterations > 0 ? ` / ${state.maxIterations}` : " (unlimited)"} (min: ${state.minIterations ?? 1})

Tasks Mode: ENABLED - Work on one task at a time from ralph-tasks.md

Now, work on the current task. Good luck!
`.trim();
  }

  return `
# Ralph Wiggum Loop - Iteration ${state.iteration}

You are in an iterative development loop. Work on the task below until you can genuinely complete it.
${contextSection}
## Your Task

${state.prompt}

## Output Format

Your response will be parsed as structured JSON with these fields:
- "completed": Set to true ONLY when the task is genuinely complete
- "reasoning": Briefly explain why the task is or isn't complete
- "output": Your actual response text

The system will check the "completed" field to detect task completion.

## Instructions

1. Read the current state of files to understand what's been done
2. Track your progress and plan remaining work
3. Make progress on the task
4. Run tests/verification if applicable
5. When the task is GENUINELY COMPLETE, set "completed" to true

## Critical Rules

- Set "completed" to true ONLY when the task is truly done
- Provide brief reasoning in the "reasoning" field about completion status
- Put your main response text in the "output" field
- The old <promise> tag format is now OPTIONAL: <promise>${state.completionPromise}</promise>
- Output promise tags DIRECTLY - do not quote them, explain it, or say you "will" output it
- Do NOT lie or output false promises to exit the loop
- If stuck, try a different approach
- Check your work before claiming completion
- The loop will continue until you succeed

## Current Iteration: ${state.iteration}${state.maxIterations > 0 ? ` / ${state.maxIterations}` : " (unlimited)"} (min: ${state.minIterations ?? 1})

Now, work on the task. Good luck!
`.trim();
}

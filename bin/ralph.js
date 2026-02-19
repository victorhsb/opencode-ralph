#!/usr/bin/env bun
// @bun
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// src/config/config.ts
var exports_config = {};
__export(exports_config, {
  getTasksFilePath: () => getTasksFilePath,
  getSupervisorSuggestionsFilePath: () => getSupervisorSuggestionsFilePath,
  getSupervisorPollInterval: () => getSupervisorPollInterval,
  getSupervisorMemoryFilePath: () => getSupervisorMemoryFilePath,
  getStateFilePath: () => getStateFilePath,
  getStateDir: () => getStateDir,
  getHistoryFilePath: () => getHistoryFilePath,
  getContextFilePath: () => getContextFilePath,
  TOOL_SUMMARY_INTERVAL_MS: () => TOOL_SUMMARY_INTERVAL_MS,
  TASKS_FILE: () => TASKS_FILE,
  SUPERVISOR_TRUNCATION_CHARS: () => SUPERVISOR_TRUNCATION_CHARS,
  SUPERVISOR_SUGGESTIONS_FILE: () => SUPERVISOR_SUGGESTIONS_FILE,
  SUPERVISOR_MEMORY_SLICE: () => SUPERVISOR_MEMORY_SLICE,
  SUPERVISOR_MEMORY_FILE: () => SUPERVISOR_MEMORY_FILE,
  SUPERVISOR_DECISION_POLL_INTERVAL_MS: () => SUPERVISOR_DECISION_POLL_INTERVAL_MS,
  STATE_FILE: () => STATE_FILE,
  STATE_DIR_NAME: () => STATE_DIR_NAME,
  SHORT_ITERATION_THRESHOLD_MS: () => SHORT_ITERATION_THRESHOLD_MS,
  MAX_TOOLS_IN_SUMMARY: () => MAX_TOOLS_IN_SUMMARY,
  MAX_ERRORS_TO_DISPLAY: () => MAX_ERRORS_TO_DISPLAY,
  HISTORY_FILE: () => HISTORY_FILE,
  HEARTBEAT_INTERVAL_MS: () => HEARTBEAT_INTERVAL_MS,
  EVENT_SUBSCRIPTION_DELAY_MS: () => EVENT_SUBSCRIPTION_DELAY_MS,
  EVENT_STREAM_TIMEOUT_MS: () => EVENT_STREAM_TIMEOUT_MS,
  ERROR_ITERATIONS_DELAY_MS: () => ERROR_ITERATIONS_DELAY_MS,
  DEFAULT_TASK_PROMISE: () => DEFAULT_TASK_PROMISE,
  DEFAULT_SUPERVISOR_SUGGESTION_PROMISE: () => DEFAULT_SUPERVISOR_SUGGESTION_PROMISE,
  DEFAULT_SUPERVISOR_NO_ACTION_PROMISE: () => DEFAULT_SUPERVISOR_NO_ACTION_PROMISE,
  DEFAULT_SUPERVISOR_MEMORY_LIMIT: () => DEFAULT_SUPERVISOR_MEMORY_LIMIT,
  DEFAULT_MAX_ITERATIONS: () => DEFAULT_MAX_ITERATIONS,
  DEFAULT_ITERATIONS: () => DEFAULT_ITERATIONS,
  DEFAULT_COMPLETION_PROMISE: () => DEFAULT_COMPLETION_PROMISE,
  CONTEXT_FILE: () => CONTEXT_FILE,
  BETWEEN_ITERATIONS_DELAY_MS: () => BETWEEN_ITERATIONS_DELAY_MS
});
import { join as join2 } from "path";
function getConfig(envVar, defaultValue) {
  if (envVar !== undefined) {
    const value = parseInt(envVar, 10);
    if (!isNaN(value)) {
      return value;
    }
  }
  return defaultValue;
}
function getSupervisorPollInterval() {
  return getConfig(process.env.RALPH_SUPERVISOR_POLL_INTERVAL, SUPERVISOR_DECISION_POLL_INTERVAL_MS);
}
function getStateDir() {
  return join2(process.cwd(), STATE_DIR_NAME);
}
function getStateFilePath() {
  return join2(getStateDir(), STATE_FILE);
}
function getHistoryFilePath() {
  return join2(getStateDir(), HISTORY_FILE);
}
function getContextFilePath() {
  return join2(getStateDir(), CONTEXT_FILE);
}
function getTasksFilePath() {
  return join2(getStateDir(), TASKS_FILE);
}
function getSupervisorMemoryFilePath() {
  return join2(getStateDir(), SUPERVISOR_MEMORY_FILE);
}
function getSupervisorSuggestionsFilePath() {
  return join2(getStateDir(), SUPERVISOR_SUGGESTIONS_FILE);
}
var STATE_DIR_NAME = ".ralph", STATE_FILE = "ralph-loop.state.json", HISTORY_FILE = "ralph-history.json", CONTEXT_FILE = "ralph-context.md", TASKS_FILE = "ralph-tasks.md", SUPERVISOR_MEMORY_FILE = "supervisor-memory.md", SUPERVISOR_SUGGESTIONS_FILE = "supervisor-suggestions.json", DEFAULT_ITERATIONS = 1, DEFAULT_MAX_ITERATIONS = 0, DEFAULT_COMPLETION_PROMISE = "COMPLETE", DEFAULT_TASK_PROMISE = "READY_FOR_NEXT_TASK", DEFAULT_SUPERVISOR_NO_ACTION_PROMISE = "NO_ACTION_NEEDED", DEFAULT_SUPERVISOR_SUGGESTION_PROMISE = "USER_DECISION_REQUIRED", DEFAULT_SUPERVISOR_MEMORY_LIMIT = 20, TOOL_SUMMARY_INTERVAL_MS = 3000, HEARTBEAT_INTERVAL_MS = 1e4, EVENT_STREAM_TIMEOUT_MS = 30000, EVENT_SUBSCRIPTION_DELAY_MS = 100, BETWEEN_ITERATIONS_DELAY_MS = 1000, ERROR_ITERATIONS_DELAY_MS = 2000, SHORT_ITERATION_THRESHOLD_MS = 30000, SUPERVISOR_DECISION_POLL_INTERVAL_MS = 2000, MAX_ERRORS_TO_DISPLAY = 10, MAX_TOOLS_IN_SUMMARY = 6, SUPERVISOR_TRUNCATION_CHARS = 6000, SUPERVISOR_MEMORY_SLICE = 10;
var init_config = () => {};

// src/state/state.ts
var exports_state = {};
__export(exports_state, {
  saveState: () => saveState,
  saveHistory: () => saveHistory,
  loadState: () => loadState,
  loadHistory: () => loadHistory,
  getStateDir: () => getStateDir,
  ensureStateDir: () => ensureStateDir,
  clearState: () => clearState,
  clearHistory: () => clearHistory
});
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync, mkdirSync } from "fs";
function ensureStateDir() {
  const dir = getStateDir();
  if (!existsSync2(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
function saveState(state) {
  ensureStateDir();
  writeFileSync(getStateFilePath(), JSON.stringify(state, null, 2));
}
function loadState() {
  const path = getStateFilePath();
  if (!existsSync2(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync2(path, "utf-8"));
  } catch {
    return null;
  }
}
function clearState() {
  const path = getStateFilePath();
  if (existsSync2(path)) {
    try {
      __require("fs").unlinkSync(path);
    } catch {}
  }
}
function loadHistory() {
  const path = getHistoryFilePath();
  if (!existsSync2(path)) {
    return {
      iterations: [],
      totalDurationMs: 0,
      struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
    };
  }
  try {
    return JSON.parse(readFileSync2(path, "utf-8"));
  } catch {
    return {
      iterations: [],
      totalDurationMs: 0,
      struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
    };
  }
}
function saveHistory(history) {
  ensureStateDir();
  writeFileSync(getHistoryFilePath(), JSON.stringify(history, null, 2));
}
function clearHistory() {
  const path = getHistoryFilePath();
  if (existsSync2(path)) {
    try {
      __require("fs").unlinkSync(path);
    } catch {}
  }
}
var init_state = __esm(() => {
  init_config();
});

// src/tasks/tasks.ts
import { existsSync as existsSync3, readFileSync as readFileSync3, writeFileSync as writeFileSync2, mkdirSync as mkdirSync2 } from "fs";
function getTasksPath() {
  return getTasksFilePath();
}
function ensureTasksFile() {
  const path = getTasksFilePath();
  const dir = getStateDir();
  if (!existsSync3(path)) {
    if (!existsSync3(dir)) {
      mkdirSync2(dir, { recursive: true });
    }
    writeFileSync2(path, `# Ralph Tasks

Add your tasks below using: \`ralph --add-task "description"\`
`);
  }
}
function loadTasks() {
  const path = getTasksFilePath();
  if (!existsSync3(path))
    return [];
  try {
    const content = readFileSync3(path, "utf-8");
    return parseTasks(content);
  } catch {
    return [];
  }
}
function parseTasks(content) {
  const tasks = [];
  const lines = content.split(`
`);
  let currentTask = null;
  for (const line of lines) {
    const topLevelMatch = line.match(/^- \[([ x\/])\]\s*(.+)/);
    if (topLevelMatch) {
      if (currentTask) {
        tasks.push(currentTask);
      }
      const [, statusChar, text] = topLevelMatch;
      let status = "todo";
      if (statusChar === "x")
        status = "complete";
      else if (statusChar === "/")
        status = "in-progress";
      currentTask = { text, status, subtasks: [], originalLine: line };
      continue;
    }
    const subtaskMatch = line.match(/^\s+- \[([ x\/])\]\s*(.+)/);
    if (subtaskMatch && currentTask) {
      const [, statusChar, text] = subtaskMatch;
      let status = "todo";
      if (statusChar === "x")
        status = "complete";
      else if (statusChar === "/")
        status = "in-progress";
      currentTask.subtasks.push({ text, status, subtasks: [], originalLine: line });
    }
  }
  if (currentTask) {
    tasks.push(currentTask);
  }
  return tasks;
}
function findCurrentTask(tasks) {
  for (const task of tasks) {
    if (task.status === "in-progress") {
      return task;
    }
  }
  return null;
}
function findNextTask(tasks) {
  for (const task of tasks) {
    if (task.status === "todo") {
      return task;
    }
  }
  return null;
}
function allTasksComplete(tasks) {
  return tasks.length > 0 && tasks.every((t) => t.status === "complete");
}
function appendTask(taskDescription) {
  const stateDirPath = getStateDir();
  const tasksFilePath = getTasksFilePath();
  if (!existsSync3(stateDirPath)) {
    mkdirSync2(stateDirPath, { recursive: true });
  }
  let tasksContent = "";
  if (existsSync3(tasksFilePath)) {
    tasksContent = readFileSync3(tasksFilePath, "utf-8");
  } else {
    tasksContent = `# Ralph Tasks

`;
  }
  const newTaskContent = tasksContent.trimEnd() + `
` + `- [ ] ${taskDescription}
`;
  writeFileSync2(tasksFilePath, newTaskContent);
}
function removeTask(taskIndex) {
  const tasksFilePath = getTasksFilePath();
  if (!existsSync3(tasksFilePath)) {
    throw new Error("No tasks file found");
  }
  const tasksContent = readFileSync3(tasksFilePath, "utf-8");
  const tasks = parseTasks(tasksContent);
  if (taskIndex < 1 || taskIndex > tasks.length) {
    throw new Error(`Task index ${taskIndex} is out of range (1-${tasks.length})`);
  }
  const lines = tasksContent.split(`
`);
  const newLines = [];
  let inRemovedTask = false;
  let currentTaskLine = 0;
  for (const line of lines) {
    if (line.match(/^- \[/)) {
      currentTaskLine++;
      if (currentTaskLine === taskIndex) {
        inRemovedTask = true;
        continue;
      } else {
        inRemovedTask = false;
      }
    }
    if (inRemovedTask && line.match(/^\s+/) && line.trim() !== "") {
      continue;
    }
    newLines.push(line);
  }
  writeFileSync2(tasksFilePath, newLines.join(`
`));
}
function displayTasksWithIndices(tasks) {
  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }
  console.log("Current tasks:");
  for (let i = 0;i < tasks.length; i++) {
    const task = tasks[i];
    const statusIcon = task.status === "complete" ? "\u2705" : task.status === "in-progress" ? "\uD83D\uDD04" : "\u23F8\uFE0F";
    console.log(`${i + 1}. ${statusIcon} ${task.text}`);
    for (const subtask of task.subtasks) {
      const subStatusIcon = subtask.status === "complete" ? "\u2705" : subtask.status === "in-progress" ? "\uD83D\uDD04" : "\u23F8\uFE0F";
      console.log(`   ${subStatusIcon} ${subtask.text}`);
    }
  }
}
function getTasksModeSection(state) {
  const path = getTasksFilePath();
  if (!existsSync3(path)) {
    return `
## TASKS MODE: Enabled (no tasks file found)

Create .ralph/ralph-tasks.md with your task list, or use \`ralph --add-task "description"\` to add tasks.
`;
  }
  try {
    const tasksContent = readFileSync3(path, "utf-8");
    const tasks = parseTasks(tasksContent);
    const currentTask = findCurrentTask(tasks);
    const nextTask = findNextTask(tasks);
    let taskInstructions = "";
    if (currentTask) {
      taskInstructions = `
\uD83D\uDD04 CURRENT TASK: "${currentTask.text}"
   Focus on completing this specific task.
   When done: Mark as [x] in .ralph/ralph-tasks.md and output <promise>${state.taskPromise}</promise>`;
    } else if (nextTask) {
      taskInstructions = `
\uD83D\uDCCD NEXT TASK: "${nextTask.text}"
   Mark as [/] in .ralph/ralph-tasks.md before starting.
   When done: Mark as [x] and output <promise>${state.taskPromise}</promise>`;
    } else if (allTasksComplete(tasks)) {
      taskInstructions = `
\u2705 ALL TASKS COMPLETE!
   Output <promise>${state.completionPromise}</promise> to finish.`;
    } else {
      taskInstructions = `
\uD83D\uDCCB No tasks found. Add tasks to .ralph/ralph-tasks.md or use \`ralph --add-task\``;
    }
    return `
## TASKS MODE: Working through task list

Current tasks from .ralph/ralph-tasks.md:
\`\`\`markdown
${tasksContent.trim()}
\`\`\`
${taskInstructions}

### Task Workflow
1. Find any task marked [/] (in progress). If none, pick the first [ ] task.
2. Mark the task as [/] in ralph-tasks.md before starting.
3. Complete the task.
4. Mark as [x] when verified complete.
5. Output <promise>${state.taskPromise}</promise> to move to the next task.
6. Only output <promise>${state.completionPromise}</promise> when ALL tasks are [x].

---
`;
  } catch {
    return `
## TASKS MODE: Error reading tasks file

Unable to read .ralph/ralph-tasks.md
`;
  }
}
var init_tasks = __esm(() => {
  init_config();
});

// src/context/context.ts
var exports_context = {};
__export(exports_context, {
  loadContext: () => loadContext,
  getContextPath: () => getContextPath,
  clearContext: () => clearContext,
  appendContext: () => appendContext
});
import { existsSync as existsSync4, mkdirSync as mkdirSync3, readFileSync as readFileSync4, unlinkSync, writeFileSync as writeFileSync3 } from "fs";
function getContextPath() {
  return getContextFilePath();
}
function loadContext() {
  const path = getContextPath();
  if (!existsSync4(path)) {
    return null;
  }
  try {
    const content = readFileSync4(path, "utf-8").trim();
    return content.length > 0 ? content : null;
  } catch {
    return null;
  }
}
function appendContext(text) {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return;
  }
  const stateDir = getStateDir();
  if (!existsSync4(stateDir)) {
    mkdirSync3(stateDir, { recursive: true });
  }
  const path = getContextPath();
  try {
    const current = existsSync4(path) ? readFileSync4(path, "utf-8").trim() : "";
    const nextContent = current ? `${current}
${trimmedText}` : trimmedText;
    writeFileSync3(path, nextContent);
  } catch {}
}
function clearContext() {
  const path = getContextPath();
  if (existsSync4(path)) {
    try {
      unlinkSync(path);
    } catch {}
  }
}
var init_context = __esm(() => {
  init_config();
});

// src/utils/utils.ts
function formatDurationLong(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
function formatToolSummary(toolCounts, maxItems = 6) {
  if (!toolCounts.size)
    return "";
  const entries = Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, maxItems);
  const remaining = entries.length - shown.length;
  const parts = shown.map(([name, count]) => `${name} ${count}`);
  if (remaining > 0) {
    parts.push(`+${remaining} more`);
  }
  return parts.join(" \u2022 ");
}
function printIterationSummary(params) {
  const toolSummary = formatToolSummary(params.toolCounts);
  const duration = formatDuration(params.elapsedMs);
  console.log(`Iteration ${params.iteration} completed in ${duration} (${params.model})`);
  console.log(`
Iteration Summary`);
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log(`Iteration: ${params.iteration}`);
  console.log(`Elapsed:   ${duration} (${params.model})`);
  if (toolSummary) {
    console.log(`Tools:     ${toolSummary}`);
  } else {
    console.log("Tools:     none");
  }
  console.log(`Exit code: ${params.exitCode}`);
  console.log(`Completion promise: ${params.completionDetected ? "detected" : "not detected"}`);
}
function checkCompletion(output, promise) {
  const escapedPromise = escapeRegex(promise);
  const promisePattern = new RegExp(`<promise>\\s*${escapedPromise}\\s*</promise>`, "gi");
  const matches = output.match(promisePattern);
  if (!matches)
    return false;
  for (const match of matches) {
    const matchIndex = output.indexOf(match);
    const contextBefore = output.substring(Math.max(0, matchIndex - 100), matchIndex).toLowerCase();
    const negationPatterns = [
      /\bnot\s+(yet\s+)?(say|output|write|respond|print)/,
      /\bdon'?t\s+(say|output|write|respond|print)/,
      /\bwon'?t\s+(say|output|write|respond|print)/,
      /\bwill\s+not\s+(say|output|write|respond|print)/,
      /\bshould\s+not\s+(say|output|write|respond|print)/,
      /\bwouldn'?t\s+(say|output|write|respond|print)/,
      /\bavoid\s+(saying|outputting|writing)/,
      /\bwithout\s+(saying|outputting|writing)/,
      /\bbefore\s+(saying|outputting|I\s+say)/,
      /\buntil\s+(I\s+)?(say|output|can\s+say)/
    ];
    const hasNegation = negationPatterns.some((pattern) => pattern.test(contextBefore));
    if (hasNegation)
      continue;
    const quotesBefore = (contextBefore.match(/["'`]/g) || []).length;
    if (quotesBefore % 2 === 1)
      continue;
    return true;
  }
  return false;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function extractErrors(output) {
  const errors = [];
  const lines = output.split(`
`);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("error:") || lower.includes("failed:") || lower.includes("exception:") || lower.includes("typeerror") || lower.includes("syntaxerror") || lower.includes("referenceerror") || lower.includes("test") && lower.includes("fail")) {
      const cleaned = line.trim().substring(0, 200);
      if (cleaned && !errors.includes(cleaned)) {
        errors.push(cleaned);
      }
    }
  }
  return errors.slice(0, 10);
}
function detectPlaceholderPluginError(output) {
  return output.includes("ralph-wiggum is not yet ready for use. This is a placeholder package.");
}
function detectSdkModelNotFoundError(output) {
  const lowerOutput = output.toLowerCase();
  return lowerOutput.includes("providermodelfound") || lowerOutput.includes("model not found") || lowerOutput.includes("provider returned error") || lowerOutput.includes("no model configured");
}
function detectSdkPlaceholderPluginError(output) {
  return output.includes("ralph-wiggum is not yet ready for use");
}

// src/sdk/executor.ts
var exports_executor = {};
__export(exports_executor, {
  executePrompt: () => executePrompt
});
async function executePrompt(options) {
  const { client: client3, prompt, model, onEvent, signal } = options;
  const toolCounts = new Map;
  const errors = [];
  let output = "";
  try {
    const sessionResponse = await client3.session.create({
      body: { title: `Ralph iteration ${Date.now()}` }
    });
    if (sessionResponse.error || !sessionResponse.data) {
      errors.push(`Failed to create session: ${sessionResponse.error ?? "Unknown error"}`);
      return {
        output,
        toolCounts,
        errors,
        success: false,
        exitCode: 1
      };
    }
    const sessionId = sessionResponse.data.id;
    const eventSubscription = await client3.event.subscribe();
    await new Promise((resolve) => setTimeout(resolve, 100));
    let sessionComplete = false;
    const eventPromise = (async () => {
      try {
        for await (const event of eventSubscription.stream) {
          if (signal?.aborted)
            break;
          const eventType = event?.type;
          if (eventType === "session.idle" || eventType === "session.error") {
            sessionComplete = true;
          }
          const sdkEvent = parseSdkEvent(event);
          if (sdkEvent.type === "tool_start" && sdkEvent.toolName) {
            toolCounts.set(sdkEvent.toolName, (toolCounts.get(sdkEvent.toolName) ?? 0) + 1);
          }
          if (sdkEvent.type === "text" && sdkEvent.content) {
            output += sdkEvent.content;
          }
          onEvent?.(sdkEvent);
          if (sessionComplete) {
            break;
          }
        }
      } catch (error) {
        errors.push(`Event stream error: ${error}`);
      }
    })();
    const modelConfig = model ? {
      providerID: model.split("/")[0] || "openai",
      modelID: model.split("/")[1] || model
    } : undefined;
    const promptResponse = await client3.session.prompt({
      path: { id: sessionId },
      body: {
        model: modelConfig,
        parts: [{ type: "text", text: prompt }]
      }
    });
    if (promptResponse.error) {
      errors.push(`Prompt failed: ${promptResponse.error}`);
      return {
        output,
        toolCounts,
        errors,
        success: false,
        exitCode: 1
      };
    }
    const result = promptResponse.data;
    let timeoutId = null;
    const abortHandler = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = null;
    };
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        reject(new Error("Event stream timeout"));
      }, 30000);
      signal?.addEventListener("abort", () => {
        abortHandler();
        reject(new Error("Aborted"));
      });
    });
    try {
      await Promise.race([eventPromise, timeoutPromise]);
    } catch (error) {
      if (String(error).includes("Aborted")) {
        throw error;
      }
    } finally {
      abortHandler();
    }
    const finalOutput = extractOutputFromMessage(result);
    return {
      output: finalOutput || output,
      toolCounts,
      errors,
      success: true,
      exitCode: 0
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      output,
      toolCounts,
      errors,
      success: false,
      exitCode: 1
    };
  }
}
function parseSdkEvent(event) {
  const timestamp = Date.now();
  if (!event || typeof event !== "object") {
    return {
      type: "text",
      content: "",
      timestamp
    };
  }
  const eventObj = event;
  const eventType = typeof eventObj.type === "string" ? eventObj.type : "";
  const props = eventObj.properties || {};
  if (eventType === "message.part.delta") {
    const delta = typeof props.delta === "string" ? props.delta : "";
    const field = typeof props.field === "string" ? props.field : "";
    if (field === "text" && delta) {
      return {
        type: "text",
        content: delta,
        timestamp
      };
    }
    return {
      type: "text",
      content: "",
      timestamp
    };
  }
  if (eventType === "message.part.updated") {
    const part = props.part || {};
    const partType = typeof part.type === "string" ? part.type : "";
    if (partType === "tool_use") {
      const toolName = typeof part.name === "string" ? part.name : "unknown";
      return {
        type: "tool_start",
        toolName,
        timestamp
      };
    }
    if (partType === "tool_result") {
      const toolName = typeof part.name === "string" ? part.name : "unknown";
      return {
        type: "tool_end",
        toolName,
        timestamp
      };
    }
    if (partType === "text") {
      const text = typeof part.text === "string" ? part.text : "";
      const role = typeof part.role === "string" ? part.role : "";
      if (text && role === "assistant") {
        return {
          type: "text",
          content: text,
          timestamp
        };
      }
    }
    if (partType === "reasoning" || partType === "thinking") {
      const text = typeof part.text === "string" ? part.text : "";
      if (text) {
        return {
          type: "thinking",
          content: text,
          timestamp
        };
      }
    }
  }
  if (eventType === "session.error") {
    const error = props.error || {};
    const errorMessage = typeof error.data?.message === "string" ? error.data.message : typeof error.message === "string" ? error.message : "Unknown error";
    return {
      type: "error",
      content: errorMessage,
      timestamp
    };
  }
  return {
    type: "text",
    content: "",
    timestamp
  };
}
function extractOutputFromMessage(message) {
  if (!message || typeof message !== "object") {
    return "";
  }
  const msg = message;
  const output = [];
  if (Array.isArray(msg.parts)) {
    for (const part of msg.parts) {
      if (typeof part === "object" && part !== null) {
        const partObj = part;
        if (partObj.type === "text" && typeof partObj.text === "string") {
          output.push(partObj.text);
        }
        if (partObj.type === "thinking" && typeof partObj.thinking === "string") {
          output.push(`[Thinking: ${partObj.thinking}]`);
        }
        if (partObj.type === "tool_result" && typeof partObj.name === "string") {
          output.push(`[Tool ${partObj.name} executed]`);
        }
      }
    }
  }
  if (output.length === 0 && Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (typeof part === "object" && part !== null) {
        const partObj = part;
        if (partObj.type === "text" && typeof partObj.text === "string") {
          output.push(partObj.text);
        }
        if (partObj.type === "thinking" && typeof partObj.thinking === "string") {
          output.push(`[Thinking: ${partObj.thinking}]`);
        }
        if (partObj.type === "tool_result" && typeof partObj.name === "string") {
          output.push(`[Tool ${partObj.name} executed]`);
        }
      }
    }
  }
  if (output.length === 0 && typeof msg.text === "string") {
    output.push(msg.text);
  }
  return output.join(`
`);
}

// src/supervisor/supervisor.ts
var exports_supervisor = {};
__export(exports_supervisor, {
  waitForSupervisorDecisionIfNeeded: () => waitForSupervisorDecisionIfNeeded,
  truncateForPrompt: () => truncateForPrompt,
  saveSupervisorSuggestions: () => saveSupervisorSuggestions,
  saveSupervisorMemory: () => saveSupervisorMemory,
  runSupervisorOnce: () => runSupervisorOnce,
  parseSupervisorOutput: () => parseSupervisorOutput,
  parseSupervisorMemory: () => parseSupervisorMemory,
  loadSupervisorSuggestions: () => loadSupervisorSuggestions,
  loadCustomSupervisorPromptTemplate: () => loadCustomSupervisorPromptTemplate,
  displaySupervisorSuggestions: () => displaySupervisorSuggestions,
  buildSupervisorSuggestionId: () => buildSupervisorSuggestionId,
  buildSupervisorPrompt: () => buildSupervisorPrompt,
  applyApprovedSuggestion: () => applyApprovedSuggestion,
  appendSupervisorMemory: () => appendSupervisorMemory
});
import { existsSync as existsSync5, readFileSync as readFileSync5, writeFileSync as writeFileSync4, mkdirSync as mkdirSync4 } from "fs";
function loadSupervisorSuggestions(path) {
  const filePath = path ?? getSupervisorSuggestionsFilePath();
  if (!existsSync5(filePath)) {
    return { suggestions: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync5(filePath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.suggestions)) {
      return { suggestions: [] };
    }
    const suggestions = parsed.suggestions.filter((item) => item && typeof item === "object");
    return { suggestions };
  } catch {
    return { suggestions: [], parseError: `Could not parse suggestions file at ${filePath}` };
  }
}
function saveSupervisorSuggestions(store, path) {
  const dir = getStateDir();
  const filePath = path ?? getSupervisorSuggestionsFilePath();
  if (!existsSync5(dir)) {
    mkdirSync4(dir, { recursive: true });
  }
  writeFileSync4(filePath, JSON.stringify(store, null, 2));
}
function parseSupervisorMemory(path) {
  const filePath = path ?? getSupervisorMemoryFilePath();
  if (!existsSync5(filePath))
    return [];
  const content = readFileSync5(filePath, "utf-8").trim();
  if (!content)
    return [];
  const sections = content.split(/\n(?=## )/g);
  const entries = [];
  for (const section of sections) {
    const lines = section.split(`
`);
    if (!lines[0]?.startsWith("## "))
      continue;
    const header = lines[0].replace(/^##\s+/, "").trim();
    const headerMatch = header.match(/^(.+?)\s+\|\s+Iteration\s+(\d+)$/i);
    if (!headerMatch)
      continue;
    const timestamp = headerMatch[1].trim();
    const iteration = parseInt(headerMatch[2], 10);
    const summaryLine = lines.find((line) => line.startsWith("- Summary: "));
    const decisionLine = lines.find((line) => line.startsWith("- Decision: "));
    if (!summaryLine || !decisionLine || Number.isNaN(iteration))
      continue;
    entries.push({
      iteration,
      summary: summaryLine.replace("- Summary: ", "").trim(),
      decision: decisionLine.replace("- Decision: ", "").trim(),
      timestamp
    });
  }
  return entries;
}
function saveSupervisorMemory(entries, path) {
  const dir = getStateDir();
  const filePath = path ?? getSupervisorMemoryFilePath();
  if (!existsSync5(dir)) {
    mkdirSync4(dir, { recursive: true });
  }
  const content = [
    "# Supervisor Memory",
    "",
    ...entries.flatMap((entry) => [
      `## ${entry.timestamp} | Iteration ${entry.iteration}`,
      `- Summary: ${entry.summary}`,
      `- Decision: ${entry.decision}`,
      ""
    ])
  ].join(`
`).trimEnd() + `
`;
  writeFileSync4(filePath, content);
}
function appendSupervisorMemory(entry, memoryLimit, path) {
  const filePath = path ?? getSupervisorMemoryFilePath();
  const existing = parseSupervisorMemory(filePath);
  const boundedLimit = Number.isFinite(memoryLimit) && memoryLimit > 0 ? Math.floor(memoryLimit) : 20;
  const next = [...existing, entry].slice(-boundedLimit);
  saveSupervisorMemory(next, filePath);
}
function buildSupervisorSuggestionId(iteration) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `sup-${iteration}-${Date.now()}-${rand}`;
}
function displaySupervisorSuggestions(store) {
  if (store.suggestions.length === 0) {
    console.log("No supervisor suggestions found.");
    return;
  }
  console.log("Supervisor suggestions:");
  for (const suggestion of store.suggestions) {
    console.log(`- ${suggestion.id} [${suggestion.status}] iteration ${suggestion.iteration}`);
    console.log(`  ${suggestion.kind}: ${suggestion.title}`);
    if (suggestion.details) {
      console.log(`  details: ${suggestion.details}`);
    }
  }
}
function applyApprovedSuggestion(suggestion) {
  try {
    if (suggestion.kind === "add_task") {
      const taskText = suggestion.proposedChanges.task ?? suggestion.details;
      if (!taskText?.trim()) {
        return { ok: false, error: "missing task text in suggestion payload" };
      }
      appendTask(taskText.trim());
      return { ok: true };
    }
    if (suggestion.kind === "add_context") {
      const contextText = suggestion.proposedChanges.context ?? suggestion.details;
      if (!contextText?.trim()) {
        return { ok: false, error: "missing context text in suggestion payload" };
      }
      appendContext(contextText.trim());
      return { ok: true };
    }
    return { ok: false, error: `unsupported suggestion kind: ${suggestion.kind}` };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
function truncateForPrompt(text, maxChars) {
  if (text.length <= maxChars)
    return text;
  return `${text.slice(0, Math.max(0, maxChars - 20))}
...[truncated]`;
}
function loadCustomSupervisorPromptTemplate(templatePath, state, coderOutput, history) {
  if (!existsSync5(templatePath)) {
    console.error(`Error: Supervisor prompt template not found: ${templatePath}`);
    process.exit(1);
  }
  const context = loadContext() || "";
  const tasksFilePath = (init_config(), __toCommonJS(exports_config)).getTasksFilePath();
  const tasksContent = existsSync5(tasksFilePath) ? readFileSync5(tasksFilePath, "utf-8") : "";
  const memoryEntries = parseSupervisorMemory().slice(-SUPERVISOR_MEMORY_SLICE);
  const memoryText = memoryEntries.map((m) => `${m.timestamp} [iter ${m.iteration}] ${m.summary} (${m.decision})`).join(`
`);
  let template = readFileSync5(templatePath, "utf-8");
  template = template.replace(/\{\{iteration\}\}/g, String(state.iteration)).replace(/\{\{prompt\}\}/g, state.prompt).replace(/\{\{coder_output\}\}/g, coderOutput).replace(/\{\{context\}\}/g, context).replace(/\{\{tasks\}\}/g, tasksContent).replace(/\{\{supervisor_memory\}\}/g, memoryText).replace(/\{\{no_progress_iterations\}\}/g, String(history.struggleIndicators.noProgressIterations)).replace(/\{\{short_iterations\}\}/g, String(history.struggleIndicators.shortIterations));
  return template;
}
function buildSupervisorPrompt(state, supervisorConfig, coderOutput, history) {
  if (supervisorConfig.promptTemplate) {
    const template = loadCustomSupervisorPromptTemplate(supervisorConfig.promptTemplate, state, coderOutput, history);
    if (template)
      return template;
  }
  const context = loadContext() || "(none)";
  const tasksFilePath = (init_config(), __toCommonJS(exports_config)).getTasksFilePath();
  const tasksContent = existsSync5(tasksFilePath) ? readFileSync5(tasksFilePath, "utf-8") : "(no tasks file)";
  const memoryEntries = parseSupervisorMemory().slice(-SUPERVISOR_MEMORY_SLICE);
  const memoryText = memoryEntries.length > 0 ? memoryEntries.map((m) => `- ${m.timestamp} (iteration ${m.iteration}): ${m.summary} | ${m.decision}`).join(`
`) : "- no prior supervisor memory";
  const truncatedOutput = truncateForPrompt(coderOutput, SUPERVISOR_TRUNCATION_CHARS);
  return `
# Ralph Supervisor - Iteration ${state.iteration}

You are supervising a coding agent loop. Review the latest coder execution and suggest improvements if needed.
You must not modify files or take actions. You can only communicate recommendations to the user.

## Supervisor Protocol (strict)

If no action is needed, output exactly:
<promise>${supervisorConfig.noActionPromise}</promise>

If action is needed, output:
<promise>${supervisorConfig.suggestionPromise}</promise>
<supervisor_suggestion>{"kind":"add_task"|"add_context","title":"...","details":"...","proposedChanges":{"task":"..."} or {"context":"..."}}</supervisor_suggestion>

Only allowed kinds: add_task, add_context.
Return exactly one suggestion block when suggesting action.

## User Prompt
${state.prompt}

## Current Context
${context}

## Current Tasks
\`\`\`markdown
${tasksContent}
\`\`\`

## Recent Supervisor Memory
${memoryText}

## Latest Coder Output
\`\`\`
${truncatedOutput}
\`\`\`

## Struggle Signals
- no progress iterations: ${history.struggleIndicators.noProgressIterations}
- short iterations: ${history.struggleIndicators.shortIterations}
`.trim();
}
function parseSupervisorOutput(output, noActionPromise, suggestionPromise, iteration) {
  const noActionDetected = checkCompletion(output, noActionPromise);
  const suggestionDetected = checkCompletion(output, suggestionPromise);
  if (noActionDetected && !suggestionDetected) {
    return { ok: true, noAction: true, rawOutput: output };
  }
  if (!suggestionDetected) {
    return {
      ok: false,
      noAction: false,
      rawOutput: output,
      error: "supervisor output missing required promise tag"
    };
  }
  const match = output.match(/<supervisor_suggestion>\s*([\s\S]*?)\s*<\/supervisor_suggestion>/i);
  if (!match) {
    return {
      ok: false,
      noAction: false,
      rawOutput: output,
      error: "suggestion promise found, but missing <supervisor_suggestion> JSON block"
    };
  }
  try {
    const parsed = JSON.parse(match[1]);
    const kind = parsed?.kind;
    const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
    const details = typeof parsed?.details === "string" ? parsed.details.trim() : "";
    const proposedChanges = parsed?.proposedChanges && typeof parsed.proposedChanges === "object" ? parsed.proposedChanges : {};
    if (kind !== "add_task" && kind !== "add_context") {
      return { ok: false, noAction: false, rawOutput: output, error: `invalid suggestion kind: ${String(kind)}` };
    }
    if (!title) {
      return { ok: false, noAction: false, rawOutput: output, error: "suggestion title is required" };
    }
    if (kind === "add_task" && !proposedChanges.task?.trim()) {
      return { ok: false, noAction: false, rawOutput: output, error: "add_task suggestion requires proposedChanges.task" };
    }
    if (kind === "add_context" && !proposedChanges.context?.trim()) {
      return { ok: false, noAction: false, rawOutput: output, error: "add_context suggestion requires proposedChanges.context" };
    }
    return {
      ok: true,
      noAction: false,
      rawOutput: output,
      suggestion: {
        iteration,
        kind,
        title,
        details,
        proposedChanges
      }
    };
  } catch (error) {
    return {
      ok: false,
      noAction: false,
      rawOutput: output,
      error: `invalid supervisor suggestion JSON: ${String(error)}`
    };
  }
}
async function runSupervisorOnce(state, supervisorConfig, history, coderOutput, sdkClient) {
  try {
    const supervisorPrompt = buildSupervisorPrompt(state, supervisorConfig, coderOutput, history);
    const { executePrompt: executePrompt2 } = __toCommonJS(exports_executor);
    const result = await executePrompt2({
      client: sdkClient.client,
      prompt: supervisorPrompt,
      model: supervisorConfig.model,
      onEvent: (event) => {}
    });
    if (!result.success) {
      return {
        ok: false,
        noAction: false,
        rawOutput: result.output,
        error: result.errors.join("; ") || "SDK execution failed"
      };
    }
    return parseSupervisorOutput(result.output, supervisorConfig.noActionPromise, supervisorConfig.suggestionPromise, state.iteration);
  } catch (error) {
    return {
      ok: false,
      noAction: false,
      rawOutput: "",
      error: String(error)
    };
  }
}
async function waitForSupervisorDecisionIfNeeded(state, iteration) {
  let printedHint = false;
  while (true) {
    const store = loadSupervisorSuggestions();
    if (store.parseError) {
      if (!printedHint) {
        console.warn(`\u26A0\uFE0F  ${store.parseError}`);
        console.warn("   Fix the file or reject pending suggestions once readable.");
        printedHint = true;
      }
      await new Promise((r) => setTimeout(r, getSupervisorPollInterval()));
      continue;
    }
    const pending = store.suggestions.filter((s) => s.iteration === iteration && s.status === "pending");
    if (pending.length === 0) {
      const approvedApplied = store.suggestions.filter((s) => s.iteration === iteration && (s.status === "approved" || s.status === "applied")).length;
      const { saveState: saveState2, loadState: reloadState } = (init_state(), __toCommonJS(exports_state));
      const reloadedState = reloadState();
      if (reloadedState && reloadedState.supervisorState) {
        reloadedState.supervisorState.pausedForDecision = false;
        reloadedState.supervisorState.pauseIteration = undefined;
        reloadedState.supervisorState.pauseReason = undefined;
        saveState2(reloadedState);
      }
      return { approvedAppliedCount: approvedApplied };
    }
    if (!printedHint) {
      console.log("\u23F8\uFE0F  Waiting for supervisor decision...");
      for (const item of pending) {
        console.log(`   - Approve: ralph --approve-suggestion ${item.id}`);
        console.log(`   - Reject:  ralph --reject-suggestion ${item.id}`);
      }
      printedHint = true;
    }
    await new Promise((r) => setTimeout(r, getSupervisorPollInterval()));
  }
}
var init_supervisor = __esm(() => {
  init_context();
  init_tasks();
  init_config();
});

// ralph.ts
import { existsSync as existsSync10, readFileSync as readFileSync9 } from "fs";
import { join as join3 } from "path";
// node_modules/@opencode-ai/sdk/dist/gen/core/serverSentEvents.gen.js
var createSseClient = ({ onSseError, onSseEvent, responseTransformer, responseValidator, sseDefaultRetryDelay, sseMaxRetryAttempts, sseMaxRetryDelay, sseSleepFn, url, ...options }) => {
  let lastEventId;
  const sleep = sseSleepFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const createStream = async function* () {
    let retryDelay = sseDefaultRetryDelay ?? 3000;
    let attempt = 0;
    const signal = options.signal ?? new AbortController().signal;
    while (true) {
      if (signal.aborted)
        break;
      attempt++;
      const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
      if (lastEventId !== undefined) {
        headers.set("Last-Event-ID", lastEventId);
      }
      try {
        const response = await fetch(url, { ...options, headers, signal });
        if (!response.ok)
          throw new Error(`SSE failed: ${response.status} ${response.statusText}`);
        if (!response.body)
          throw new Error("No body in SSE response");
        const reader = response.body.pipeThrough(new TextDecoderStream).getReader();
        let buffer = "";
        const abortHandler = () => {
          try {
            reader.cancel();
          } catch {}
        };
        signal.addEventListener("abort", abortHandler);
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            buffer += value;
            const chunks = buffer.split(`

`);
            buffer = chunks.pop() ?? "";
            for (const chunk of chunks) {
              const lines = chunk.split(`
`);
              const dataLines = [];
              let eventName;
              for (const line of lines) {
                if (line.startsWith("data:")) {
                  dataLines.push(line.replace(/^data:\s*/, ""));
                } else if (line.startsWith("event:")) {
                  eventName = line.replace(/^event:\s*/, "");
                } else if (line.startsWith("id:")) {
                  lastEventId = line.replace(/^id:\s*/, "");
                } else if (line.startsWith("retry:")) {
                  const parsed = Number.parseInt(line.replace(/^retry:\s*/, ""), 10);
                  if (!Number.isNaN(parsed)) {
                    retryDelay = parsed;
                  }
                }
              }
              let data;
              let parsedJson = false;
              if (dataLines.length) {
                const rawData = dataLines.join(`
`);
                try {
                  data = JSON.parse(rawData);
                  parsedJson = true;
                } catch {
                  data = rawData;
                }
              }
              if (parsedJson) {
                if (responseValidator) {
                  await responseValidator(data);
                }
                if (responseTransformer) {
                  data = await responseTransformer(data);
                }
              }
              onSseEvent?.({
                data,
                event: eventName,
                id: lastEventId,
                retry: retryDelay
              });
              if (dataLines.length) {
                yield data;
              }
            }
          }
        } finally {
          signal.removeEventListener("abort", abortHandler);
          reader.releaseLock();
        }
        break;
      } catch (error) {
        onSseError?.(error);
        if (sseMaxRetryAttempts !== undefined && attempt >= sseMaxRetryAttempts) {
          break;
        }
        const backoff = Math.min(retryDelay * 2 ** (attempt - 1), sseMaxRetryDelay ?? 30000);
        await sleep(backoff);
      }
    }
  };
  const stream = createStream();
  return { stream };
};

// node_modules/@opencode-ai/sdk/dist/gen/core/auth.gen.js
var getAuthToken = async (auth, callback) => {
  const token = typeof callback === "function" ? await callback(auth) : callback;
  if (!token) {
    return;
  }
  if (auth.scheme === "bearer") {
    return `Bearer ${token}`;
  }
  if (auth.scheme === "basic") {
    return `Basic ${btoa(token)}`;
  }
  return token;
};

// node_modules/@opencode-ai/sdk/dist/gen/core/bodySerializer.gen.js
var jsonBodySerializer = {
  bodySerializer: (body) => JSON.stringify(body, (_key, value) => typeof value === "bigint" ? value.toString() : value)
};

// node_modules/@opencode-ai/sdk/dist/gen/core/pathSerializer.gen.js
var separatorArrayExplode = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var separatorArrayNoExplode = (style) => {
  switch (style) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
};
var separatorObjectExplode = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var serializeArrayParam = ({ allowReserved, explode, name, style, value }) => {
  if (!explode) {
    const joinedValues2 = (allowReserved ? value : value.map((v) => encodeURIComponent(v))).join(separatorArrayNoExplode(style));
    switch (style) {
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      case "simple":
        return joinedValues2;
      default:
        return `${name}=${joinedValues2}`;
    }
  }
  const separator = separatorArrayExplode(style);
  const joinedValues = value.map((v) => {
    if (style === "label" || style === "simple") {
      return allowReserved ? v : encodeURIComponent(v);
    }
    return serializePrimitiveParam({
      allowReserved,
      name,
      value: v
    });
  }).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};
var serializePrimitiveParam = ({ allowReserved, name, value }) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "object") {
    throw new Error("Deeply-nested arrays/objects aren\u2019t supported. Provide your own `querySerializer()` to handle these.");
  }
  return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
};
var serializeObjectParam = ({ allowReserved, explode, name, style, value, valueOnly }) => {
  if (value instanceof Date) {
    return valueOnly ? value.toISOString() : `${name}=${value.toISOString()}`;
  }
  if (style !== "deepObject" && !explode) {
    let values = [];
    Object.entries(value).forEach(([key, v]) => {
      values = [...values, key, allowReserved ? v : encodeURIComponent(v)];
    });
    const joinedValues2 = values.join(",");
    switch (style) {
      case "form":
        return `${name}=${joinedValues2}`;
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      default:
        return joinedValues2;
    }
  }
  const separator = separatorObjectExplode(style);
  const joinedValues = Object.entries(value).map(([key, v]) => serializePrimitiveParam({
    allowReserved,
    name: style === "deepObject" ? `${name}[${key}]` : key,
    value: v
  })).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};

// node_modules/@opencode-ai/sdk/dist/gen/core/utils.gen.js
var PATH_PARAM_RE = /\{[^{}]+\}/g;
var defaultPathSerializer = ({ path, url: _url }) => {
  let url = _url;
  const matches = _url.match(PATH_PARAM_RE);
  if (matches) {
    for (const match of matches) {
      let explode = false;
      let name = match.substring(1, match.length - 1);
      let style = "simple";
      if (name.endsWith("*")) {
        explode = true;
        name = name.substring(0, name.length - 1);
      }
      if (name.startsWith(".")) {
        name = name.substring(1);
        style = "label";
      } else if (name.startsWith(";")) {
        name = name.substring(1);
        style = "matrix";
      }
      const value = path[name];
      if (value === undefined || value === null) {
        continue;
      }
      if (Array.isArray(value)) {
        url = url.replace(match, serializeArrayParam({ explode, name, style, value }));
        continue;
      }
      if (typeof value === "object") {
        url = url.replace(match, serializeObjectParam({
          explode,
          name,
          style,
          value,
          valueOnly: true
        }));
        continue;
      }
      if (style === "matrix") {
        url = url.replace(match, `;${serializePrimitiveParam({
          name,
          value
        })}`);
        continue;
      }
      const replaceValue = encodeURIComponent(style === "label" ? `.${value}` : value);
      url = url.replace(match, replaceValue);
    }
  }
  return url;
};
var getUrl = ({ baseUrl, path, query, querySerializer, url: _url }) => {
  const pathUrl = _url.startsWith("/") ? _url : `/${_url}`;
  let url = (baseUrl ?? "") + pathUrl;
  if (path) {
    url = defaultPathSerializer({ path, url });
  }
  let search = query ? querySerializer(query) : "";
  if (search.startsWith("?")) {
    search = search.substring(1);
  }
  if (search) {
    url += `?${search}`;
  }
  return url;
};

// node_modules/@opencode-ai/sdk/dist/gen/client/utils.gen.js
var createQuerySerializer = ({ allowReserved, array, object } = {}) => {
  const querySerializer = (queryParams) => {
    const search = [];
    if (queryParams && typeof queryParams === "object") {
      for (const name in queryParams) {
        const value = queryParams[name];
        if (value === undefined || value === null) {
          continue;
        }
        if (Array.isArray(value)) {
          const serializedArray = serializeArrayParam({
            allowReserved,
            explode: true,
            name,
            style: "form",
            value,
            ...array
          });
          if (serializedArray)
            search.push(serializedArray);
        } else if (typeof value === "object") {
          const serializedObject = serializeObjectParam({
            allowReserved,
            explode: true,
            name,
            style: "deepObject",
            value,
            ...object
          });
          if (serializedObject)
            search.push(serializedObject);
        } else {
          const serializedPrimitive = serializePrimitiveParam({
            allowReserved,
            name,
            value
          });
          if (serializedPrimitive)
            search.push(serializedPrimitive);
        }
      }
    }
    return search.join("&");
  };
  return querySerializer;
};
var getParseAs = (contentType) => {
  if (!contentType) {
    return "stream";
  }
  const cleanContent = contentType.split(";")[0]?.trim();
  if (!cleanContent) {
    return;
  }
  if (cleanContent.startsWith("application/json") || cleanContent.endsWith("+json")) {
    return "json";
  }
  if (cleanContent === "multipart/form-data") {
    return "formData";
  }
  if (["application/", "audio/", "image/", "video/"].some((type) => cleanContent.startsWith(type))) {
    return "blob";
  }
  if (cleanContent.startsWith("text/")) {
    return "text";
  }
  return;
};
var checkForExistence = (options, name) => {
  if (!name) {
    return false;
  }
  if (options.headers.has(name) || options.query?.[name] || options.headers.get("Cookie")?.includes(`${name}=`)) {
    return true;
  }
  return false;
};
var setAuthParams = async ({ security, ...options }) => {
  for (const auth of security) {
    if (checkForExistence(options, auth.name)) {
      continue;
    }
    const token = await getAuthToken(auth, options.auth);
    if (!token) {
      continue;
    }
    const name = auth.name ?? "Authorization";
    switch (auth.in) {
      case "query":
        if (!options.query) {
          options.query = {};
        }
        options.query[name] = token;
        break;
      case "cookie":
        options.headers.append("Cookie", `${name}=${token}`);
        break;
      case "header":
      default:
        options.headers.set(name, token);
        break;
    }
  }
};
var buildUrl = (options) => getUrl({
  baseUrl: options.baseUrl,
  path: options.path,
  query: options.query,
  querySerializer: typeof options.querySerializer === "function" ? options.querySerializer : createQuerySerializer(options.querySerializer),
  url: options.url
});
var mergeConfigs = (a, b) => {
  const config = { ...a, ...b };
  if (config.baseUrl?.endsWith("/")) {
    config.baseUrl = config.baseUrl.substring(0, config.baseUrl.length - 1);
  }
  config.headers = mergeHeaders(a.headers, b.headers);
  return config;
};
var mergeHeaders = (...headers) => {
  const mergedHeaders = new Headers;
  for (const header of headers) {
    if (!header || typeof header !== "object") {
      continue;
    }
    const iterator = header instanceof Headers ? header.entries() : Object.entries(header);
    for (const [key, value] of iterator) {
      if (value === null) {
        mergedHeaders.delete(key);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          mergedHeaders.append(key, v);
        }
      } else if (value !== undefined) {
        mergedHeaders.set(key, typeof value === "object" ? JSON.stringify(value) : value);
      }
    }
  }
  return mergedHeaders;
};

class Interceptors {
  _fns;
  constructor() {
    this._fns = [];
  }
  clear() {
    this._fns = [];
  }
  getInterceptorIndex(id) {
    if (typeof id === "number") {
      return this._fns[id] ? id : -1;
    } else {
      return this._fns.indexOf(id);
    }
  }
  exists(id) {
    const index = this.getInterceptorIndex(id);
    return !!this._fns[index];
  }
  eject(id) {
    const index = this.getInterceptorIndex(id);
    if (this._fns[index]) {
      this._fns[index] = null;
    }
  }
  update(id, fn) {
    const index = this.getInterceptorIndex(id);
    if (this._fns[index]) {
      this._fns[index] = fn;
      return id;
    } else {
      return false;
    }
  }
  use(fn) {
    this._fns = [...this._fns, fn];
    return this._fns.length - 1;
  }
}
var createInterceptors = () => ({
  error: new Interceptors,
  request: new Interceptors,
  response: new Interceptors
});
var defaultQuerySerializer = createQuerySerializer({
  allowReserved: false,
  array: {
    explode: true,
    style: "form"
  },
  object: {
    explode: true,
    style: "deepObject"
  }
});
var defaultHeaders = {
  "Content-Type": "application/json"
};
var createConfig = (override = {}) => ({
  ...jsonBodySerializer,
  headers: defaultHeaders,
  parseAs: "auto",
  querySerializer: defaultQuerySerializer,
  ...override
});

// node_modules/@opencode-ai/sdk/dist/gen/client/client.gen.js
var createClient = (config = {}) => {
  let _config = mergeConfigs(createConfig(), config);
  const getConfig = () => ({ ..._config });
  const setConfig = (config2) => {
    _config = mergeConfigs(_config, config2);
    return getConfig();
  };
  const interceptors = createInterceptors();
  const beforeRequest = async (options) => {
    const opts = {
      ..._config,
      ...options,
      fetch: options.fetch ?? _config.fetch ?? globalThis.fetch,
      headers: mergeHeaders(_config.headers, options.headers),
      serializedBody: undefined
    };
    if (opts.security) {
      await setAuthParams({
        ...opts,
        security: opts.security
      });
    }
    if (opts.requestValidator) {
      await opts.requestValidator(opts);
    }
    if (opts.body && opts.bodySerializer) {
      opts.serializedBody = opts.bodySerializer(opts.body);
    }
    if (opts.serializedBody === undefined || opts.serializedBody === "") {
      opts.headers.delete("Content-Type");
    }
    const url = buildUrl(opts);
    return { opts, url };
  };
  const request = async (options) => {
    const { opts, url } = await beforeRequest(options);
    const requestInit = {
      redirect: "follow",
      ...opts,
      body: opts.serializedBody
    };
    let request2 = new Request(url, requestInit);
    for (const fn of interceptors.request._fns) {
      if (fn) {
        request2 = await fn(request2, opts);
      }
    }
    const _fetch = opts.fetch;
    let response = await _fetch(request2);
    for (const fn of interceptors.response._fns) {
      if (fn) {
        response = await fn(response, request2, opts);
      }
    }
    const result = {
      request: request2,
      response
    };
    if (response.ok) {
      if (response.status === 204 || response.headers.get("Content-Length") === "0") {
        return opts.responseStyle === "data" ? {} : {
          data: {},
          ...result
        };
      }
      const parseAs = (opts.parseAs === "auto" ? getParseAs(response.headers.get("Content-Type")) : opts.parseAs) ?? "json";
      let data;
      switch (parseAs) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          data = await response[parseAs]();
          break;
        case "stream":
          return opts.responseStyle === "data" ? response.body : {
            data: response.body,
            ...result
          };
      }
      if (parseAs === "json") {
        if (opts.responseValidator) {
          await opts.responseValidator(data);
        }
        if (opts.responseTransformer) {
          data = await opts.responseTransformer(data);
        }
      }
      return opts.responseStyle === "data" ? data : {
        data,
        ...result
      };
    }
    const textError = await response.text();
    let jsonError;
    try {
      jsonError = JSON.parse(textError);
    } catch {}
    const error = jsonError ?? textError;
    let finalError = error;
    for (const fn of interceptors.error._fns) {
      if (fn) {
        finalError = await fn(error, response, request2, opts);
      }
    }
    finalError = finalError || {};
    if (opts.throwOnError) {
      throw finalError;
    }
    return opts.responseStyle === "data" ? undefined : {
      error: finalError,
      ...result
    };
  };
  const makeMethod = (method) => {
    const fn = (options) => request({ ...options, method });
    fn.sse = async (options) => {
      const { opts, url } = await beforeRequest(options);
      return createSseClient({
        ...opts,
        body: opts.body,
        headers: opts.headers,
        method,
        url
      });
    };
    return fn;
  };
  return {
    buildUrl,
    connect: makeMethod("CONNECT"),
    delete: makeMethod("DELETE"),
    get: makeMethod("GET"),
    getConfig,
    head: makeMethod("HEAD"),
    interceptors,
    options: makeMethod("OPTIONS"),
    patch: makeMethod("PATCH"),
    post: makeMethod("POST"),
    put: makeMethod("PUT"),
    request,
    setConfig,
    trace: makeMethod("TRACE")
  };
};
// node_modules/@opencode-ai/sdk/dist/gen/core/params.gen.js
var extraPrefixesMap = {
  $body_: "body",
  $headers_: "headers",
  $path_: "path",
  $query_: "query"
};
var extraPrefixes = Object.entries(extraPrefixesMap);
// node_modules/@opencode-ai/sdk/dist/gen/client.gen.js
var client = createClient(createConfig({
  baseUrl: "http://localhost:4096"
}));

// node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.js
class _HeyApiClient {
  _client = client;
  constructor(args) {
    if (args?.client) {
      this._client = args.client;
    }
  }
}

class Project extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/project",
      ...options
    });
  }
  current(options) {
    return (options?.client ?? this._client).get({
      url: "/project/current",
      ...options
    });
  }
}

class Config extends _HeyApiClient {
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/config",
      ...options
    });
  }
  update(options) {
    return (options?.client ?? this._client).patch({
      url: "/config",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  providers(options) {
    return (options?.client ?? this._client).get({
      url: "/config/providers",
      ...options
    });
  }
}

class Tool extends _HeyApiClient {
  ids(options) {
    return (options?.client ?? this._client).get({
      url: "/experimental/tool/ids",
      ...options
    });
  }
  list(options) {
    return (options.client ?? this._client).get({
      url: "/experimental/tool",
      ...options
    });
  }
}

class Path extends _HeyApiClient {
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/path",
      ...options
    });
  }
}

class Session extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/session",
      ...options
    });
  }
  create(options) {
    return (options?.client ?? this._client).post({
      url: "/session",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  delete(options) {
    return (options.client ?? this._client).delete({
      url: "/session/{id}",
      ...options
    });
  }
  get(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}",
      ...options
    });
  }
  update(options) {
    return (options.client ?? this._client).patch({
      url: "/session/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  children(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/children",
      ...options
    });
  }
  todo(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/todo",
      ...options
    });
  }
  init(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/init",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  fork(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/fork",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  abort(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/abort",
      ...options
    });
  }
  unshare(options) {
    return (options.client ?? this._client).delete({
      url: "/session/{id}/share",
      ...options
    });
  }
  share(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/share",
      ...options
    });
  }
  diff(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/diff",
      ...options
    });
  }
  summarize(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/summarize",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  messages(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/message",
      ...options
    });
  }
  prompt(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/message",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  message(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/message/{messageID}",
      ...options
    });
  }
  command(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/command",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  shell(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/shell",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  revert(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/revert",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  unrevert(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/unrevert",
      ...options
    });
  }
}

class Command extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/command",
      ...options
    });
  }
}

class Find extends _HeyApiClient {
  text(options) {
    return (options.client ?? this._client).get({
      url: "/find",
      ...options
    });
  }
  files(options) {
    return (options.client ?? this._client).get({
      url: "/find/file",
      ...options
    });
  }
  symbols(options) {
    return (options.client ?? this._client).get({
      url: "/find/symbol",
      ...options
    });
  }
}

class File extends _HeyApiClient {
  list(options) {
    return (options.client ?? this._client).get({
      url: "/file",
      ...options
    });
  }
  read(options) {
    return (options.client ?? this._client).get({
      url: "/file/content",
      ...options
    });
  }
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/file/status",
      ...options
    });
  }
}

class App extends _HeyApiClient {
  log(options) {
    return (options?.client ?? this._client).post({
      url: "/log",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  agents(options) {
    return (options?.client ?? this._client).get({
      url: "/agent",
      ...options
    });
  }
}

class Mcp extends _HeyApiClient {
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/mcp",
      ...options
    });
  }
}

class Control extends _HeyApiClient {
  next(options) {
    return (options?.client ?? this._client).get({
      url: "/tui/control/next",
      ...options
    });
  }
  response(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/control/response",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
}

class Tui extends _HeyApiClient {
  appendPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/append-prompt",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  openHelp(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-help",
      ...options
    });
  }
  openSessions(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-sessions",
      ...options
    });
  }
  openThemes(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-themes",
      ...options
    });
  }
  openModels(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-models",
      ...options
    });
  }
  submitPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/submit-prompt",
      ...options
    });
  }
  clearPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/clear-prompt",
      ...options
    });
  }
  executeCommand(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/execute-command",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  showToast(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/show-toast",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  control = new Control({ client: this._client });
}

class Auth extends _HeyApiClient {
  set(options) {
    return (options.client ?? this._client).put({
      url: "/auth/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
}

class Event extends _HeyApiClient {
  subscribe(options) {
    return (options?.client ?? this._client).get.sse({
      url: "/event",
      ...options
    });
  }
}

class OpencodeClient extends _HeyApiClient {
  postSessionIdPermissionsPermissionId(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/permissions/{permissionID}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  project = new Project({ client: this._client });
  config = new Config({ client: this._client });
  tool = new Tool({ client: this._client });
  path = new Path({ client: this._client });
  session = new Session({ client: this._client });
  command = new Command({ client: this._client });
  find = new Find({ client: this._client });
  file = new File({ client: this._client });
  app = new App({ client: this._client });
  mcp = new Mcp({ client: this._client });
  tui = new Tui({ client: this._client });
  auth = new Auth({ client: this._client });
  event = new Event({ client: this._client });
}

// node_modules/@opencode-ai/sdk/dist/client.js
function createOpencodeClient(config) {
  const client2 = createClient(config);
  return new OpencodeClient({ client: client2 });
}
// node_modules/@opencode-ai/sdk/dist/server.js
import { spawn } from "child_process";
async function createOpencodeServer(options) {
  options = Object.assign({
    hostname: "127.0.0.1",
    port: 4096,
    timeout: 5000
  }, options ?? {});
  const proc = spawn(`opencode`, [`serve`, `--hostname=${options.hostname}`, `--port=${options.port}`], {
    signal: options.signal,
    env: {
      ...process.env,
      OPENCODE_CONFIG_CONTENT: JSON.stringify(options.config ?? {})
    }
  });
  const url = await new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`Timeout waiting for server to start after ${options.timeout}ms`));
    }, options.timeout);
    let output = "";
    proc.stdout?.on("data", (chunk) => {
      output += chunk.toString();
      const lines = output.split(`
`);
      for (const line of lines) {
        if (line.startsWith("opencode server listening")) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/);
          if (!match) {
            throw new Error(`Failed to parse server url from output: ${line}`);
          }
          clearTimeout(id);
          resolve(match[1]);
          return;
        }
      }
    });
    proc.stderr?.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.on("exit", (code) => {
      clearTimeout(id);
      let msg = `Server exited with code ${code}`;
      if (output.trim()) {
        msg += `
Server output: ${output}`;
      }
      reject(new Error(msg));
    });
    proc.on("error", (error) => {
      clearTimeout(id);
      reject(error);
    });
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        clearTimeout(id);
        reject(new Error("Aborted"));
      });
    }
  });
  return {
    url,
    close() {
      proc.kill();
    }
  };
}
// node_modules/@opencode-ai/sdk/dist/index.js
async function createOpencode(options) {
  const server2 = await createOpencodeServer({
    ...options
  });
  const client3 = createOpencodeClient({
    baseUrl: server2.url
  });
  return {
    client: client3,
    server: server2
  };
}

// src/sdk/client.ts
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createServer } from "net";
function loadPluginsFromConfig(configPath) {
  if (!existsSync(configPath)) {
    return [];
  }
  try {
    const raw = readFileSync(configPath, "utf-8");
    const withoutBlock = raw.replace(/\/\*[\s\S]*?\*\//g, "");
    const withoutLine = withoutBlock.replace(/^\s*\/\/.*$/gm, "");
    const parsed = JSON.parse(withoutLine);
    const plugins = parsed?.plugin;
    return Array.isArray(plugins) ? plugins.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}
function loadPluginsFromExistingConfigs() {
  const userConfigPath = join(process.env.XDG_CONFIG_HOME ?? join(process.env.HOME ?? "", ".config"), "opencode", "opencode.json");
  const projectConfigPath = join(process.cwd(), ".ralph", "opencode.json");
  const legacyProjectConfigPath = join(process.cwd(), ".opencode", "opencode.json");
  const plugins = [
    ...loadPluginsFromConfig(userConfigPath),
    ...loadPluginsFromConfig(projectConfigPath),
    ...loadPluginsFromConfig(legacyProjectConfigPath)
  ];
  return Array.from(new Set(plugins));
}
async function findAvailablePort(hostname, preferredPort) {
  const listenOnce = (port) => {
    return new Promise((resolve, reject) => {
      const server2 = createServer();
      server2.unref();
      server2.once("error", reject);
      server2.listen(port, hostname, () => {
        const address = server2.address();
        const resolvedPort = typeof address === "object" && address ? address.port : port;
        server2.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }
          resolve(resolvedPort);
        });
      });
    });
  };
  try {
    return await listenOnce(preferredPort);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code && code !== "EADDRINUSE") {
      throw error;
    }
    return await listenOnce(0);
  }
}
async function createSdkClient(options) {
  if (process.env.RALPH_FAKE_SDK === "1") {
    const output = process.env.RALPH_FAKE_OUTPUT ?? "<promise>COMPLETE</promise>";
    const client3 = {
      session: {
        create: async () => ({
          data: { id: "fake-session" },
          error: undefined
        }),
        prompt: async () => ({
          data: {
            parts: [{ type: "text", text: output }]
          },
          error: undefined
        })
      },
      event: {
        subscribe: async () => ({
          stream: async function* () {
            yield { type: "session.idle" };
          }()
        })
      }
    };
    return {
      client: client3,
      server: {
        url: "http://127.0.0.1:0",
        close: () => {}
      }
    };
  }
  const hostname = options.hostname ?? "127.0.0.1";
  const requestedPort = options.port ?? 4096;
  const port = await findAvailablePort(hostname, requestedPort);
  const config = {
    model: options.model
  };
  if (options.allowAllPermissions) {
    config.permission = {
      read: "allow",
      edit: "allow",
      glob: "allow",
      grep: "allow",
      list: "allow",
      bash: "allow",
      task: "allow",
      webfetch: "allow",
      websearch: "allow",
      codesearch: "allow",
      todowrite: "allow",
      todoread: "allow",
      question: "allow",
      lsp: "allow",
      external_directory: "allow"
    };
  }
  if (options.filterPlugins) {
    const plugins = loadPluginsFromExistingConfigs();
    config.plugin = plugins.filter((p) => /auth/i.test(p));
  }
  const opencode = await createOpencode({
    hostname,
    port,
    timeout: 1e4,
    config
  });
  return {
    client: opencode.client,
    server: opencode.server
  };
}

// src/loop/loop.ts
init_state();
init_tasks();
init_context();
init_supervisor();
var {$: $2 } = globalThis.Bun;
import { existsSync as existsSync7 } from "fs";

// src/prompts/prompts.ts
init_context();
init_tasks();
init_config();
import { existsSync as existsSync6, readFileSync as readFileSync6 } from "fs";
function loadCustomPromptTemplate(templatePath, state) {
  if (!existsSync6(templatePath)) {
    console.error(`Error: Prompt template not found: ${templatePath}`);
    process.exit(1);
  }
  try {
    let template = readFileSync6(templatePath, "utf-8");
    const context = loadContext() || "";
    const tasksPath = getTasksFilePath();
    let tasksContent = "";
    if (state.tasksMode && existsSync6(tasksPath)) {
      tasksContent = readFileSync6(tasksPath, "utf-8");
    }
    template = template.replace(/\{\{iteration\}\}/g, String(state.iteration)).replace(/\{\{max_iterations\}\}/g, state.maxIterations > 0 ? String(state.maxIterations) : "unlimited").replace(/\{\{min_iterations\}\}/g, String(state.minIterations)).replace(/\{\{prompt\}\}/g, state.prompt).replace(/\{\{completion_promise\}\}/g, state.completionPromise).replace(/\{\{abort_promise\}\}/g, state.abortPromise || "").replace(/\{\{task_promise\}\}/g, state.taskPromise).replace(/\{\{context\}\}/g, context).replace(/\{\{tasks\}\}/g, tasksContent);
    return template;
  } catch (err) {
    console.error(`Error reading prompt template: ${err}`);
    process.exit(1);
  }
}
function buildPrompt(state, promptTemplatePath) {
  if (promptTemplatePath) {
    const customPrompt = loadCustomPromptTemplate(promptTemplatePath, state);
    if (customPrompt)
      return customPrompt;
  }
  const context = loadContext();
  const contextSection = context ? `
## Additional Context (added by user mid-loop)

${context}

---
` : "";
  if (state.tasksMode) {
    const tasksSection = getTasksModeSection(state);
    return `
# Ralph Wiggum Loop - Iteration ${state.iteration}

You are in an iterative development loop working through a task list.
${contextSection}${tasksSection}
## Your Main Goal

${state.prompt}

## Critical Rules

- Work on ONE task at a time from .ralph/ralph-tasks.md
- ONLY output <promise>${state.taskPromise}</promise> when the current task is complete and marked in ralph-tasks.md
- ONLY output <promise>${state.completionPromise}</promise> when ALL tasks are truly done
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

## Instructions

1. Read the current state of files to understand what's been done
2. Track your progress and plan remaining work
3. Make progress on the task
4. Run tests/verification if applicable
5. When the task is GENUINELY COMPLETE, output:
   <promise>${state.completionPromise}</promise>

## Critical Rules

- ONLY output <promise>${state.completionPromise}</promise> when the task is truly done
- Output the promise tag DIRECTLY - do not quote it, explain it, or say you "will" output it
- Do NOT lie or output false promises to exit the loop
- If stuck, try a different approach
- Check your work before claiming completion
- The loop will continue until you succeed

## Current Iteration: ${state.iteration}${state.maxIterations > 0 ? ` / ${state.maxIterations}` : " (unlimited)"} (min: ${state.minIterations ?? 1})

Now, work on the task. Good luck!
`.trim();
}
// src/fs-tracker/fs-tracker.ts
var {$ } = globalThis.Bun;
async function captureFileSnapshot() {
  const files = new Map;
  try {
    const status = await $`git status --porcelain`.text();
    const trackedFiles = await $`git ls-files`.text();
    const allFiles = new Set;
    for (const line of status.split(`
`)) {
      if (line.trim()) {
        allFiles.add(line.substring(3).trim());
      }
    }
    for (const file of trackedFiles.split(`
`)) {
      if (file.trim()) {
        allFiles.add(file.trim());
      }
    }
    for (const file of allFiles) {
      try {
        const hash = await $`git hash-object ${file} 2>/dev/null || stat -f '%m' ${file} 2>/dev/null || echo ''`.text();
        files.set(file, hash.trim());
      } catch {}
    }
  } catch {}
  return { files };
}
function getModifiedFilesSinceSnapshot(before, after) {
  const changedFiles = [];
  for (const [file, hash] of after.files) {
    const prevHash = before.files.get(file);
    if (prevHash !== hash) {
      changedFiles.push(file);
    }
  }
  for (const [file] of before.files) {
    if (!after.files.has(file)) {
      changedFiles.push(file);
    }
  }
  return changedFiles;
}

// src/loop/iteration.ts
async function executeSdkIteration(options) {
  const { client: client3, prompt, model, streamOutput, compactTools } = options;
  const toolCounts = new Map;
  const errors = [];
  let output = "";
  let lastPrintedAt = Date.now();
  let lastToolSummaryAt = 0;
  const toolSummaryIntervalMs = 3000;
  const heartbeatIntervalMs = 1e4;
  const maybePrintToolSummary = (force = false) => {
    if (!compactTools || toolCounts.size === 0)
      return;
    const now = Date.now();
    if (!force && now - lastToolSummaryAt < toolSummaryIntervalMs) {
      return;
    }
    const summary = formatToolSummary2(toolCounts);
    if (summary) {
      console.log(`| Tools    ${summary}`);
      lastPrintedAt = now;
      lastToolSummaryAt = now;
    }
  };
  const heartbeatTimer = setInterval(() => {
    const now = Date.now();
    if (now - lastPrintedAt >= heartbeatIntervalMs) {
      console.log("| ...");
      lastPrintedAt = now;
    }
  }, heartbeatIntervalMs);
  try {
    const result = await executePrompt({
      client: client3.client,
      prompt,
      model,
      onEvent: (event) => {
        if (!streamOutput)
          return;
        if (event.type === "tool_start" && event.toolName) {
          toolCounts.set(event.toolName, (toolCounts.get(event.toolName) ?? 0) + 1);
          if (compactTools) {
            maybePrintToolSummary();
          } else {
            console.log(`| ${event.type === "tool_start" ? `\uD83D\uDD27 ${event.toolName}...` : ""}`);
          }
          lastPrintedAt = Date.now();
        }
        if (event.type === "text" && event.content) {
          process.stdout.write(event.content);
          lastPrintedAt = Date.now();
        }
      }
    });
    clearInterval(heartbeatTimer);
    process.stdout.write(`
`);
    output = result.output;
    for (const [tool, count] of result.toolCounts) {
      toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + count);
    }
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
    if (compactTools) {
      maybePrintToolSummary(true);
    }
    return {
      output,
      toolCounts,
      exitCode: result.exitCode,
      errors
    };
  } catch (error) {
    clearInterval(heartbeatTimer);
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      output,
      toolCounts,
      exitCode: 1,
      errors
    };
  }
}
function formatToolSummary2(toolCounts, maxItems = 6) {
  if (!toolCounts.size)
    return "";
  const entries = Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, maxItems);
  const remaining = entries.length - shown.length;
  const parts = shown.map(([name, count]) => `${name} ${count}`);
  if (remaining > 0) {
    parts.push(`+${remaining} more`);
  }
  return parts.join(" \u2022 ");
}

// src/loop/loop.ts
async function runRalphLoop(options) {
  const {
    prompt,
    promptTemplatePath,
    model,
    supervisorModel,
    supervisorEnabled,
    supervisorNoActionPromise,
    supervisorSuggestionPromise,
    supervisorMemoryLimit,
    supervisorPromptTemplatePath,
    minIterations,
    maxIterations,
    completionPromise,
    abortPromise,
    tasksMode,
    taskPromise,
    streamOutput,
    verboseTools,
    autoCommit,
    allowAllPermissions,
    sdkClient
  } = options;
  const existingState = loadState();
  const resuming = !!existingState?.active;
  if (resuming) {
    console.log(`\uD83D\uDD04 Resuming Ralph loop from ${getStateDir()}`);
  }
  const initialModel = model;
  const effectiveSupervisorModel = supervisorModel || initialModel;
  const supervisorConfig = {
    enabled: supervisorEnabled,
    model: effectiveSupervisorModel,
    noActionPromise: supervisorNoActionPromise,
    suggestionPromise: supervisorSuggestionPromise,
    memoryLimit: supervisorMemoryLimit,
    promptTemplate: supervisorPromptTemplatePath || undefined
  };
  console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                    Ralph Wiggum Loop                            \u2551
\u2551         Iterative AI Development with OpenCode                    \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  const state = resuming && existingState ? existingState : {
    active: true,
    iteration: 1,
    minIterations,
    maxIterations,
    completionPromise,
    abortPromise: abortPromise || undefined,
    tasksMode,
    taskPromise,
    prompt,
    promptTemplate: promptTemplatePath || undefined,
    startedAt: new Date().toISOString(),
    model: initialModel,
    supervisor: supervisorConfig,
    supervisorState: {
      enabled: supervisorConfig.enabled,
      pausedForDecision: false
    }
  };
  if (resuming && existingState) {
    state.supervisor = supervisorConfig;
    state.supervisorState = existingState.supervisorState ?? {
      enabled: supervisorConfig.enabled,
      pausedForDecision: false
    };
  }
  if (!resuming) {
    saveState(state);
  }
  const tasksPath = getTasksPath();
  if (tasksMode && !existsSync7(tasksPath)) {
    ensureTasksFile();
    console.log(`\uD83D\uDCCB Created tasks file: ${tasksPath}`);
  }
  const history = resuming ? loadHistory() : {
    iterations: [],
    totalDurationMs: 0,
    struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
  };
  if (!resuming) {
    saveHistory(history);
  }
  if (!resuming) {
    const promptPreview = prompt.replace(/\s+/g, " ").substring(0, 80) + (prompt.length > 80 ? "..." : "");
    console.log(`Task: ${promptPreview}`);
    console.log(`Completion promise: ${completionPromise}`);
    if (tasksMode) {
      console.log(`Tasks mode: ENABLED`);
      console.log(`Task promise: ${taskPromise}`);
    }
    console.log(`Min iterations: ${minIterations}`);
    console.log(`Max iterations: ${maxIterations > 0 ? maxIterations : "unlimited"}`);
    if (initialModel)
      console.log(`Model: ${initialModel}`);
    if (supervisorConfig.enabled) {
      console.log(`Supervisor: ENABLED${supervisorConfig.model ? ` / ${supervisorConfig.model}` : ""}`);
    }
    if (options.disablePlugins) {
      console.log("OpenCode plugins: non-auth plugins disabled");
    }
    if (allowAllPermissions)
      console.log("Permissions: auto-approve all tools");
    console.log("");
    console.log("Starting loop... (Ctrl+C to stop)");
    console.log("\u2550".repeat(68));
  }
  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) {
      console.log(`
Force stopping...`);
      process.exit(1);
    }
    stopping = true;
    console.log(`
Gracefully stopping Ralph loop...`);
    try {
      console.log("\uD83E\uDDF9 Closing SDK server...");
      sdkClient.server.close();
    } catch {}
    clearState();
    console.log("Loop cancelled.");
    process.exit(0);
  });
  if (state.supervisorState?.pausedForDecision && state.supervisorState.pauseIteration) {
    console.log(`\u23F8\uFE0F  Resuming in supervisor-decision wait mode (iteration ${state.supervisorState.pauseIteration})`);
    const pausedIteration = state.supervisorState.pauseIteration;
    const decisionResult = await waitForSupervisorDecisionIfNeeded(state, pausedIteration);
    if (state.supervisorState.pauseReason === "completion_detected_with_pending_supervisor_suggestion") {
      if (decisionResult.approvedAppliedCount > 0) {
        console.log("\uD83D\uDD04 Supervisor-approved changes were applied while paused. Continuing loop.");
        state.iteration++;
        saveState(state);
      } else {
        console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557`);
        console.log(`\u2551  \u2705 Completion promise confirmed after supervisor decisions`);
        console.log(`\u2551  Task completed in ${state.iteration} iteration(s)`);
        console.log(`\u2551  Total time: ${formatDurationLong(history.totalDurationMs)}`);
        console.log(`\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D`);
        clearState();
        clearHistory();
        clearContext();
        return;
      }
    }
  }
  while (true) {
    if (maxIterations > 0 && state.iteration > maxIterations) {
      console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557`);
      console.log(`\u2551  Max iterations (${maxIterations}) reached. Loop stopped.`);
      console.log(`\u2551  Total time: ${formatDurationLong(history.totalDurationMs)}`);
      console.log(`\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D`);
      clearState();
      break;
    }
    const iterInfo = maxIterations > 0 ? ` / ${maxIterations}` : "";
    const minInfo = minIterations > 1 && state.iteration < minIterations ? ` (min: ${minIterations})` : "";
    console.log(`
\uD83D\uDD04 Iteration ${state.iteration}${iterInfo}${minInfo}`);
    console.log("\u2500".repeat(68));
    const contextAtStart = loadContext();
    const snapshotBefore = await captureFileSnapshot();
    let currentModel = state.model;
    const fullPrompt = buildPrompt(state, promptTemplatePath);
    const iterationStart = Date.now();
    try {
      console.log("\uD83D\uDE80 Using OpenCode SDK for execution...");
      const sdkResult = await executeSdkIteration({
        client: sdkClient,
        prompt: fullPrompt,
        model: currentModel,
        streamOutput,
        compactTools: !verboseTools
      });
      const result = sdkResult.output;
      const toolCounts = sdkResult.toolCounts;
      const exitCode = sdkResult.exitCode;
      const stderr = sdkResult.errors.join(`
`);
      if (stderr && !streamOutput) {
        console.error(stderr);
      }
      if (result && !streamOutput) {
        console.log(result);
      }
      const combinedOutput = `${result}
${stderr}`;
      const completionDetected = checkCompletion(combinedOutput, completionPromise);
      const abortDetected = abortPromise ? checkCompletion(combinedOutput, abortPromise) : false;
      const taskCompletionDetected = tasksMode ? checkCompletion(combinedOutput, taskPromise) : false;
      let shouldComplete = completionDetected;
      const iterationDuration = Date.now() - iterationStart;
      printIterationSummary({
        iteration: state.iteration,
        elapsedMs: iterationDuration,
        toolCounts,
        exitCode,
        completionDetected,
        model: currentModel
      });
      const snapshotAfter = await captureFileSnapshot();
      const filesModified = getModifiedFilesSinceSnapshot(snapshotBefore, snapshotAfter);
      const errors = extractErrors(combinedOutput);
      const iterationRecord = {
        iteration: state.iteration,
        startedAt: new Date(iterationStart).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: iterationDuration,
        model: currentModel,
        toolsUsed: Object.fromEntries(toolCounts),
        filesModified,
        exitCode,
        completionDetected,
        errors
      };
      history.iterations.push(iterationRecord);
      history.totalDurationMs += iterationDuration;
      if (filesModified.length === 0) {
        history.struggleIndicators.noProgressIterations++;
      } else {
        history.struggleIndicators.noProgressIterations = 0;
      }
      if (iterationDuration < 30000) {
        history.struggleIndicators.shortIterations++;
      } else {
        history.struggleIndicators.shortIterations = 0;
      }
      if (errors.length === 0) {
        history.struggleIndicators.repeatedErrors = {};
      } else {
        for (const error of errors) {
          const key = error.substring(0, 100);
          history.struggleIndicators.repeatedErrors[key] = (history.struggleIndicators.repeatedErrors[key] || 0) + 1;
        }
      }
      saveHistory(history);
      const struggle = history.struggleIndicators;
      if (state.iteration > 2 && (struggle.noProgressIterations >= 3 || struggle.shortIterations >= 3)) {
        console.log(`
\u26A0\uFE0F  Potential struggle detected:`);
        if (struggle.noProgressIterations >= 3) {
          console.log(`   - No file changes in ${struggle.noProgressIterations} iterations`);
        }
        if (struggle.shortIterations >= 3) {
          console.log(`   - ${struggle.shortIterations} very short iterations`);
        }
        console.log(`   \uD83D\uDCA1 Tip: Use 'ralph --add-context "hint"' in another terminal to guide the agent`);
      }
      if (detectPlaceholderPluginError(combinedOutput) || detectSdkPlaceholderPluginError(combinedOutput)) {
        console.error(`
\u274C OpenCode tried to load legacy 'ralph-wiggum' plugin. This package is CLI-only.`);
        console.error("Remove 'ralph-wiggum' from your opencode.json plugin list, or re-run with --no-plugins.");
        clearState();
        process.exit(1);
      }
      if (detectSdkModelNotFoundError(combinedOutput)) {
        console.error(`
\u274C Model configuration error detected.`);
        console.error("   The agent could not find a valid model to use.");
        console.error(`
   To fix this:`);
        console.error("   1. Set a default model in ~/.config/opencode/opencode.json:");
        console.error('      { "model": "your-provider/model-name" }');
        console.error('   2. Or use --model flag: ralph "task" --model provider/model');
        console.error(`
   See OpenCode documentation for available models.`);
        clearState();
        process.exit(1);
      }
      if (exitCode !== 0) {
        console.warn(`
\u26A0\uFE0F  OpenCode exited with code ${exitCode}. Continuing to next iteration.`);
      }
      const supervisorCfg = state.supervisor;
      if (supervisorCfg?.enabled) {
        console.log(`
\uD83D\uDD75\uFE0F  Running supervisor${supervisorCfg.model ? ` / ${supervisorCfg.model}` : ""}...`);
        const supervisorResult = await runSupervisorOnce(state, supervisorCfg, history, combinedOutput, sdkClient);
        const lastRunAt = new Date().toISOString();
        state.supervisorState = {
          ...state.supervisorState ?? { enabled: true, pausedForDecision: false },
          enabled: true,
          lastRunAt,
          lastRunIteration: state.iteration
        };
        if (!supervisorResult.ok) {
          console.warn(`\u26A0\uFE0F  Supervisor failed: ${supervisorResult.error}`);
          appendSupervisorMemory({
            iteration: state.iteration,
            summary: "Supervisor run failed",
            decision: supervisorResult.error ?? "unknown error",
            timestamp: lastRunAt
          }, supervisorCfg.memoryLimit);
        } else if (supervisorResult.noAction) {
          console.log("\u2705 Supervisor: no action needed");
          appendSupervisorMemory({
            iteration: state.iteration,
            summary: "No additional actions suggested",
            decision: "no_action",
            timestamp: lastRunAt
          }, supervisorCfg.memoryLimit);
        } else if (supervisorResult.suggestion) {
          const suggestion = {
            id: buildSupervisorSuggestionId(state.iteration),
            iteration: state.iteration,
            kind: supervisorResult.suggestion.kind,
            title: supervisorResult.suggestion.title,
            details: supervisorResult.suggestion.details,
            proposedChanges: supervisorResult.suggestion.proposedChanges,
            status: "pending",
            createdAt: lastRunAt
          };
          const suggestionStore = loadSupervisorSuggestions();
          if (suggestionStore.parseError) {
            console.warn(`\u26A0\uFE0F  Could not save suggestion: ${suggestionStore.parseError}`);
          } else {
            suggestionStore.suggestions.push(suggestion);
            saveSupervisorSuggestions(suggestionStore);
            console.log(`\uD83D\uDCCC Supervisor suggestion created: ${suggestion.id}`);
            console.log(`   Approve: ralph --approve-suggestion ${suggestion.id}`);
            console.log(`   Reject:  ralph --reject-suggestion ${suggestion.id}`);
            appendSupervisorMemory({
              iteration: state.iteration,
              summary: `${suggestion.kind}: ${suggestion.title}`,
              decision: "pending_user_decision",
              timestamp: lastRunAt
            }, supervisorCfg.memoryLimit);
            if (completionDetected) {
              state.supervisorState = {
                ...state.supervisorState ?? { enabled: true, pausedForDecision: false },
                enabled: true,
                pausedForDecision: true,
                pauseIteration: state.iteration,
                pauseReason: "completion_detected_with_pending_supervisor_suggestion",
                lastRunAt,
                lastRunIteration: state.iteration
              };
              saveState(state);
              const decisionResult = await waitForSupervisorDecisionIfNeeded(state, state.iteration);
              if (decisionResult.approvedAppliedCount > 0) {
                shouldComplete = false;
                console.log("\uD83D\uDD04 Supervisor-approved changes detected. Continuing loop instead of exiting.");
              } else {
                console.log("\u2705 All supervisor suggestions resolved without approved changes.");
              }
            }
          }
        }
      }
      if (abortDetected) {
        console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557`);
        console.log(`\u2551  \u26D4 Abort signal detected: <promise>${abortPromise}</promise>`);
        console.log(`\u2551  Loop aborted after ${state.iteration} iteration(s)`);
        console.log(`\u2551  Total time: ${formatDurationLong(history.totalDurationMs)}`);
        console.log(`\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D`);
        clearState();
        clearHistory();
        clearContext();
        process.exit(1);
      }
      if (taskCompletionDetected && !completionDetected) {
        console.log(`
\uD83D\uDD04 Task completion detected: <promise>${taskPromise}</promise>`);
        console.log(`   Moving to next task in iteration ${state.iteration + 1}...`);
      }
      if (shouldComplete) {
        if (state.iteration < minIterations) {
          console.log(`
\u23F3 Completion promise detected, but minimum iterations (${minIterations}) not yet reached.`);
          console.log(`   Continuing to iteration ${state.iteration + 1}...`);
        } else {
          console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557`);
          console.log(`\u2551  \u2705 Completion promise detected: <promise>${completionPromise}</promise>`);
          console.log(`\u2551  Task completed in ${state.iteration} iteration(s)`);
          console.log(`\u2551  Total time: ${formatDurationLong(history.totalDurationMs)}`);
          console.log(`\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D`);
          clearState();
          clearHistory();
          clearContext();
          break;
        }
      }
      if (contextAtStart) {
        console.log(`\uD83D\uDCDD Context was consumed this iteration`);
        clearContext();
      }
      if (autoCommit) {
        try {
          const status = await $2`git status --porcelain`.text();
          if (status.trim()) {
            await $2`git add -A`;
            await $2`git commit -m "Ralph iteration ${state.iteration}: work in progress"`.quiet();
            console.log(`\uD83D\uDCDD Auto-committed changes`);
          }
        } catch {}
      }
      state.iteration++;
      saveState(state);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      console.error(`
\u274C Error in iteration ${state.iteration}:`, error);
      console.log("Continuing to next iteration...");
      const iterationDuration = Date.now() - iterationStart;
      const errorRecord = {
        iteration: state.iteration,
        startedAt: new Date(iterationStart).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: iterationDuration,
        model: currentModel,
        toolsUsed: {},
        filesModified: [],
        exitCode: -1,
        completionDetected: false,
        errors: [String(error).substring(0, 200)]
      };
      history.iterations.push(errorRecord);
      history.totalDurationMs += iterationDuration;
      saveHistory(history);
      state.iteration++;
      saveState(state);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  try {
    console.log("\uD83E\uDDF9 Closing SDK server...");
    sdkClient.server.close();
  } catch {}
}

// src/io/files.ts
import { existsSync as existsSync8, readFileSync as readFileSync7 } from "fs";
import { statSync } from "fs";
function readPromptFile(path) {
  if (!existsSync8(path)) {
    console.error(`Error: Prompt file not found: ${path}`);
    process.exit(1);
  }
  try {
    const stat = statSync(path);
    if (!stat.isFile()) {
      console.error(`Error: Prompt path is not a file: ${path}`);
      process.exit(1);
    }
  } catch {
    console.error(`Error: Unable to stat prompt file: ${path}`);
    process.exit(1);
  }
  try {
    const content = readFileSync7(path, "utf-8");
    if (!content.trim()) {
      console.error(`Error: Prompt file is empty: ${path}`);
      process.exit(1);
    }
    return content;
  } catch {
    console.error(`Error: Unable to read prompt file: ${path}`);
    process.exit(1);
  }
}

// src/cli/args.ts
function buildArgMap(configs) {
  const map = new Map;
  for (const config of configs) {
    map.set(`--${config.name}`, config);
    if (config.aliases) {
      for (const alias of config.aliases) {
        map.set(alias, config);
      }
    }
  }
  return map;
}
function parseValue(value, type, name) {
  if (type === "boolean") {
    return value === "true" || value === "1";
  }
  if (type === "number") {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid number value for ${name}: ${value}`);
    }
    return parsed;
  }
  return value;
}
function parseArgs(argList, schema) {
  const argMap = buildArgMap(schema);
  const args = {};
  const promptParts = [];
  const errors = [];
  const doubleDashIndex = argList.indexOf("--");
  const argsToProcess = doubleDashIndex !== -1 ? argList.slice(0, doubleDashIndex) : argList;
  let i = 0;
  while (i < argsToProcess.length) {
    const arg = argsToProcess[i];
    if (!arg.startsWith("-")) {
      promptParts.push(arg);
      i++;
      continue;
    }
    const config = argMap.get(arg);
    if (!config) {
      errors.push(`Unknown option: ${arg}`);
      i++;
      continue;
    }
    const key = config.name;
    if (config.type === "boolean") {
      args[key] = true;
      i++;
    } else {
      const nextArg = argsToProcess[i + 1];
      if (!nextArg) {
        errors.push(`Option ${arg} requires a value`);
        i++;
        continue;
      }
      try {
        args[key] = parseValue(nextArg, config.type, arg);
        i += 2;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        i++;
      }
    }
  }
  for (const config of schema) {
    const key = config.name;
    if (args[key] === undefined) {
      if (config.default !== undefined) {
        args[key] = config.default;
      } else if (config.required) {
        errors.push(`Required option --${config.name} not provided`);
      }
    } else if (config.validate) {
      const validation = config.validate(args[key]);
      if (validation !== true) {
        errors.push(validation || `Invalid value for --${config.name}`);
      }
    }
  }
  return {
    args,
    promptParts,
    errors
  };
}
function displayHelp(version, schema) {
  const lines = [
    `Ralph Wiggum Loop - Iterative AI development with OpenCode`,
    ``,
    `Usage:`,
    `  ralph "<prompt>" [options]`,
    `  ralph --prompt-file <path> [options]`,
    ``,
    `Arguments:`,
    `  prompt              Task description for the AI to work on`,
    ``,
    `Options:`
  ];
  for (const config of schema) {
    const aliases = config.aliases ? config.aliases.join(", ") : "";
    const flags = [aliases, `--${config.name}`].filter(Boolean).join(", ");
    const typeLabel = config.type === "boolean" ? "" : ` <${config.type}>`;
    const defaultLabel = config.default !== undefined ? ` (default: ${config.default})` : "";
    lines.push(`  ${flags}${typeLabel}    ${config.description || ""}${defaultLabel}`);
  }
  lines.push(``, `Commands:`, `  --status            Show current Ralph loop status and history`, `  --status --tasks    Show status including current task list`, `  --add-context TEXT  Add context for the next iteration (or edit .ralph/ralph-context.md)`, `  --clear-context     Clear any pending context`, `  --list-tasks        Display the current task list with indices`, `  --add-task "desc"   Add a new task to the list`, `  --remove-task N     Remove task at index N (including subtasks)`, `  --list-suggestions  Show supervisor suggestions and statuses`, `  --approve-suggestion ID  Approve and apply a pending supervisor suggestion`, `  --reject-suggestion ID   Reject a pending supervisor suggestion`, ``, `Examples:`, `  ralph "Build a REST API for todos"`, `  ralph "Fix the auth bug" --max-iterations 10`, `  ralph "Add tests" --completion-promise "ALL TESTS PASS" --model anthropic/claude-sonnet-4`, `  ralph --prompt-file ./prompt.md --max-iterations 5`, `  ralph --status                                        # Check loop status`, `  ralph --add-context "Focus on the auth module first"  # Add hint for next iteration`, ``, `How it works:`, `  1. Sends your prompt to OpenCode via SDK`, `  2. OpenCode works on the task`, `  3. Checks output for completion promise`, `  4. If not complete, repeats with same prompt`, `  5. OpenCode sees its previous work in files`, `  6. Continues until promise detected or max iterations`, ``, `To stop manually: Ctrl+C`, ``, `Learn more: https://ghuntley.com/ralph/`, ``);
  console.log(lines.join(`
`));
}
var RALPH_ARGS_SCHEMA = [
  {
    name: "model",
    type: "string",
    description: "Model to use (e.g., anthropic/claude-sonnet-4)"
  },
  {
    name: "min-iterations",
    type: "number",
    description: "Minimum iterations before completion allowed",
    default: 1,
    validate: (val) => val >= 0 || "--min-iterations must be non-negative"
  },
  {
    name: "max-iterations",
    type: "number",
    description: "Maximum iterations before stopping (0 = unlimited)",
    default: 0,
    validate: (val) => val >= 0 || "--max-iterations must be non-negative"
  },
  {
    name: "completion-promise",
    type: "string",
    description: "Phrase that signals completion",
    default: "COMPLETE"
  },
  {
    name: "abort-promise",
    type: "string",
    description: "Phrase that signals early abort (e.g., precondition failed)"
  },
  {
    name: "tasks",
    aliases: ["-t"],
    type: "boolean",
    description: "Enable Tasks Mode for structured task tracking"
  },
  {
    name: "task-promise",
    type: "string",
    description: "Phrase that signals task completion",
    default: "READY_FOR_NEXT_TASK"
  },
  {
    name: "supervisor",
    type: "boolean",
    description: "Enable post-iteration supervisor loop"
  },
  {
    name: "supervisor-model",
    type: "string",
    description: "Supervisor model"
  },
  {
    name: "supervisor-no-action-promise",
    type: "string",
    description: "Promise for no-op supervisor run",
    default: "NO_ACTION_NEEDED"
  },
  {
    name: "supervisor-suggestion-promise",
    type: "string",
    description: "Promise when supervisor suggests change",
    default: "USER_DECISION_REQUIRED"
  },
  {
    name: "supervisor-memory-limit",
    type: "number",
    description: "Number of supervisor memory entries to keep",
    default: 20,
    validate: (val) => val > 0 || "--supervisor-memory-limit must be greater than 0"
  },
  {
    name: "supervisor-prompt-template",
    type: "string",
    description: "Custom prompt template for supervisor"
  },
  {
    name: "prompt-file",
    aliases: ["--file", "-f"],
    type: "string",
    description: "Read prompt content from a file"
  },
  {
    name: "prompt-template",
    type: "string",
    description: "Use custom prompt template (supports variables)"
  },
  {
    name: "no-stream",
    type: "boolean",
    description: "Buffer output and print at the end"
  },
  {
    name: "verbose-tools",
    type: "boolean",
    description: "Print every tool line (disable compact tool summary)"
  },
  {
    name: "no-commit",
    type: "boolean",
    description: "Don't auto-commit after each iteration"
  },
  {
    name: "no-plugins",
    type: "boolean",
    description: "Disable non-auth OpenCode plugins for this run"
  },
  {
    name: "allow-all",
    type: "boolean",
    description: "Auto-approve all tool permissions"
  },
  {
    name: "no-allow-all",
    type: "boolean",
    description: "Require interactive permission prompts"
  }
];

// src/cli/commands.ts
init_state();
init_supervisor();
init_context();
init_tasks();
init_config();
import { readFileSync as readFileSync8, existsSync as existsSync9 } from "fs";
function handleStatusCommand(args) {
  const state = loadState();
  const history = loadHistory();
  const contextPath = getContextPath();
  const context = existsSync9(contextPath) ? readFileSync8(contextPath, "utf-8").trim() : null;
  const supervisorSuggestions = loadSupervisorSuggestions();
  const pendingSuggestions = supervisorSuggestions.suggestions.filter((s) => s.status === "pending").length;
  const showTasks = args.includes("--tasks") || args.includes("-t") || state?.tasksMode;
  const tasksPath = getTasksFilePath();
  console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                    Ralph Wiggum Status                           \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  if (state?.active) {
    const elapsed = Date.now() - new Date(state.startedAt).getTime();
    const elapsedStr = formatDurationLong(elapsed);
    console.log(`\uD83D\uDD04 ACTIVE LOOP`);
    console.log(`   Iteration:    ${state.iteration}${state.maxIterations > 0 ? ` / ${state.maxIterations}` : " (unlimited)"}`);
    console.log(`   Started:      ${state.startedAt}`);
    console.log(`   Elapsed:      ${elapsedStr}`);
    console.log(`   Promise:      ${state.completionPromise}`);
    if (state.model)
      console.log(`   Model:        ${state.model}`);
    if (state.tasksMode) {
      console.log(`   Tasks Mode:   ENABLED`);
      console.log(`   Task Promise: ${state.taskPromise}`);
    }
    console.log(`   Prompt:       ${state.prompt.substring(0, 60)}${state.prompt.length > 60 ? "..." : ""}`);
    if (state.supervisor?.enabled) {
      console.log(`   Supervisor:   ENABLED`);
      if (state.supervisor.model) {
        console.log(`   Sup Model:    ${state.supervisor.model}`);
      }
      console.log(`   Sup Pending:  ${pendingSuggestions}`);
      if (state.supervisorState?.pausedForDecision) {
        console.log(`   Sup Status:   waiting for user decision`);
      }
    }
  } else {
    console.log(`\u23F9\uFE0F  No active loop`);
  }
  if (context) {
    console.log(`
\uD83D\uDCDD PENDING CONTEXT (will be injected next iteration):`);
    console.log(`   ${context.split(`
`).join(`
   `)}`);
  }
  if (supervisorSuggestions.parseError) {
    console.log(`
\u26A0\uFE0F  SUPERVISOR DATA WARNING: ${supervisorSuggestions.parseError}`);
  }
  if (showTasks) {
    if (existsSync9(tasksPath)) {
      try {
        const tasks = loadTasks();
        if (tasks.length > 0) {
          console.log(`
\uD83D\uDCCB CURRENT TASKS:`);
          for (let i = 0;i < tasks.length; i++) {
            const task = tasks[i];
            const statusIcon = task.status === "complete" ? "\u2705" : task.status === "in-progress" ? "\uD83D\uDD04" : "\u23F8\uFE0F";
            console.log(`   ${i + 1}. ${statusIcon} ${task.text}`);
            for (const subtask of task.subtasks) {
              const subStatusIcon = subtask.status === "complete" ? "\u2705" : subtask.status === "in-progress" ? "\uD83D\uDD04" : "\u23F8\uFE0F";
              console.log(`      ${subStatusIcon} ${subtask.text}`);
            }
          }
          const complete = tasks.filter((t) => t.status === "complete").length;
          const inProgress = tasks.filter((t) => t.status === "in-progress").length;
          console.log(`
   Progress: ${complete}/${tasks.length} complete, ${inProgress} in progress`);
        } else {
          console.log(`
\uD83D\uDCCB CURRENT TASKS: (no tasks found)`);
        }
      } catch {
        console.log(`
\uD83D\uDCCB CURRENT TASKS: (error reading tasks)`);
      }
    } else {
      console.log(`
\uD83D\uDCCB CURRENT TASKS: (no tasks file found)`);
    }
  }
  if (history.iterations.length > 0) {
    console.log(`
\uD83D\uDCCA HISTORY (${history.iterations.length} iterations)`);
    console.log(`   Total time:   ${formatDurationLong(history.totalDurationMs)}`);
    const recent = history.iterations.slice(-5);
    console.log(`
   Recent iterations:`);
    for (const iter of recent) {
      const tools = Object.entries(iter.toolsUsed).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(" ");
      const modelLabel = iter.model ?? "unknown";
      console.log(`   #${iter.iteration}  ${formatDurationLong(iter.durationMs)}  ${modelLabel}  ${tools || "no tools"}`);
    }
    const struggle = history.struggleIndicators;
    const hasRepeatedErrors = Object.values(struggle.repeatedErrors).some((count) => count >= 2);
    if (struggle.noProgressIterations >= 3 || struggle.shortIterations >= 3 || hasRepeatedErrors) {
      console.log(`
\u26A0\uFE0F  STRUGGLE INDICATORS:`);
      if (struggle.noProgressIterations >= 3) {
        console.log(`   - No file changes in ${struggle.noProgressIterations} iterations`);
      }
      if (struggle.shortIterations >= 3) {
        console.log(`   - ${struggle.shortIterations} very short iterations (< 30s)`);
      }
      const topErrors = Object.entries(struggle.repeatedErrors).filter(([_, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);
      for (const [error, count] of topErrors) {
        console.log(`   - Same error ${count}x: "${error.substring(0, 50)}..."`);
      }
      console.log(`
   \uD83D\uDCA1 Consider using: ralph --add-context "your hint here"`);
    }
  }
  console.log("");
}
function handleListSuggestionsCommand() {
  const store = loadSupervisorSuggestions();
  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }
  displaySupervisorSuggestions(store);
}
function handleApproveSuggestionCommand(args) {
  const approveSuggestionIdx = args.indexOf("--approve-suggestion");
  const suggestionId = args[approveSuggestionIdx + 1];
  if (!suggestionId) {
    console.error("Error: --approve-suggestion requires an ID");
    process.exit(1);
  }
  const store = loadSupervisorSuggestions();
  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }
  const suggestion = store.suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) {
    console.error(`Error: Suggestion not found: ${suggestionId}`);
    process.exit(1);
  }
  if (suggestion.status !== "pending") {
    console.error(`Error: Suggestion ${suggestionId} is already ${suggestion.status}`);
    process.exit(1);
  }
  suggestion.status = "approved";
  suggestion.decidedAt = new Date().toISOString();
  const applied = applyApprovedSuggestion(suggestion);
  const { saveSupervisorSuggestions: saveSupervisorSuggestions2 } = (init_supervisor(), __toCommonJS(exports_supervisor));
  if (applied.ok) {
    suggestion.status = "applied";
    suggestion.appliedAt = new Date().toISOString();
    console.log(`\u2705 Suggestion ${suggestionId} approved and applied`);
  } else {
    suggestion.status = "failed";
    suggestion.error = applied.error;
    console.error(`\u274C Suggestion ${suggestionId} approved but failed to apply: ${applied.error}`);
    saveSupervisorSuggestions2(store);
    process.exit(1);
  }
  saveSupervisorSuggestions2(store);
}
function handleRejectSuggestionCommand(args) {
  const rejectSuggestionIdx = args.indexOf("--reject-suggestion");
  const suggestionId = args[rejectSuggestionIdx + 1];
  if (!suggestionId) {
    console.error("Error: --reject-suggestion requires an ID");
    process.exit(1);
  }
  const store = loadSupervisorSuggestions();
  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }
  const suggestion = store.suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) {
    console.error(`Error: Suggestion not found: ${suggestionId}`);
    process.exit(1);
  }
  if (suggestion.status !== "pending") {
    console.error(`Error: Suggestion ${suggestionId} is already ${suggestion.status}`);
    process.exit(1);
  }
  suggestion.status = "rejected";
  suggestion.decidedAt = new Date().toISOString();
  const { saveSupervisorSuggestions: saveSupervisorSuggestions2 } = (init_supervisor(), __toCommonJS(exports_supervisor));
  saveSupervisorSuggestions2(store);
  console.log(`\u2705 Suggestion ${suggestionId} rejected`);
}
function handleAddContextCommand(args) {
  const addContextIdx = args.indexOf("--add-context");
  const contextText = args[addContextIdx + 1];
  if (!contextText) {
    console.error("Error: --add-context requires a text argument");
    console.error('Usage: ralph --add-context "Your context or hint here"');
    process.exit(1);
  }
  const { appendContext: appendContext2 } = (init_context(), __toCommonJS(exports_context));
  appendContext2(contextText);
  const contextPath = getContextPath();
  console.log(`\u2705 Context added for next iteration`);
  console.log(`   File: ${contextPath}`);
  const state = loadState();
  if (state?.active) {
    console.log(`   Will be picked up in iteration ${state.iteration + 1}`);
  } else {
    console.log(`   Will be used when loop starts`);
  }
}
function handleClearContextCommand() {
  const contextPath = getContextPath();
  if (existsSync9(contextPath)) {
    __require("fs").unlinkSync(contextPath);
    console.log(`\u2705 Context cleared`);
  } else {
    console.log(`\u2139\uFE0F  No pending context to clear`);
  }
}
function handleListTasksCommand() {
  const tasksPath = getTasksFilePath();
  if (!existsSync9(tasksPath)) {
    console.log("No tasks file found. Use --add-task to create your first task.");
    process.exit(0);
  }
  try {
    const tasks = loadTasks();
    displayTasksWithIndices(tasks);
  } catch (error) {
    console.error("Error reading tasks file:", error);
    process.exit(1);
  }
}
function handleAddTaskCommand(args) {
  const addTaskIdx = args.indexOf("--add-task");
  const taskDescription = args[addTaskIdx + 1];
  if (!taskDescription) {
    console.error("Error: --add-task requires a description");
    console.error('Usage: ralph --add-task "Task description"');
    process.exit(1);
  }
  try {
    appendTask(taskDescription);
    console.log(`\u2705 Task added: "${taskDescription}"`);
  } catch (error) {
    console.error("Error adding task:", error);
    process.exit(1);
  }
}
function handleRemoveTaskCommand(args) {
  const removeTaskIdx = args.indexOf("--remove-task");
  const taskIndexStr = args[removeTaskIdx + 1];
  if (!taskIndexStr || isNaN(parseInt(taskIndexStr))) {
    console.error("Error: --remove-task requires a valid number");
    console.error("Usage: ralph --remove-task 3");
    process.exit(1);
  }
  const taskIndex = parseInt(taskIndexStr);
  try {
    removeTask(taskIndex);
    console.log(`\u2705 Removed task ${taskIndex} and its subtasks`);
  } catch (error) {
    console.error("Error removing task:", error);
    process.exit(1);
  }
}

// ralph.ts
var __dirname = "/home/torugo/go/src/github.com/victorhsb/opencode-ralph";
var VERSION = process.env.npm_package_version || (existsSync10(join3(__dirname, "package.json")) ? JSON.parse(readFileSync9(join3(__dirname, "package.json"), "utf-8")).version : "2.0.1");
var args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  displayHelp(VERSION, RALPH_ARGS_SCHEMA);
  process.exit(0);
}
if (args.includes("--version") || args.includes("-v")) {
  console.log(`ralph ${VERSION}`);
  process.exit(0);
}
if (args.includes("--status")) {
  handleStatusCommand(args);
  process.exit(0);
}
if (args.includes("--list-suggestions")) {
  handleListSuggestionsCommand();
  process.exit(0);
}
if (args.includes("--approve-suggestion")) {
  handleApproveSuggestionCommand(args);
  process.exit(0);
}
if (args.includes("--reject-suggestion")) {
  handleRejectSuggestionCommand(args);
  process.exit(0);
}
if (args.includes("--add-context")) {
  handleAddContextCommand(args);
  process.exit(0);
}
if (args.includes("--clear-context")) {
  handleClearContextCommand();
  process.exit(0);
}
if (args.includes("--list-tasks")) {
  handleListTasksCommand();
  process.exit(0);
}
if (args.includes("--add-task")) {
  handleAddTaskCommand(args);
  process.exit(0);
}
if (args.includes("--remove-task")) {
  handleRemoveTaskCommand(args);
  process.exit(0);
}
var parsed = parseArgs(args, RALPH_ARGS_SCHEMA);
if (parsed.errors.length > 0) {
  console.error("Error(s) parsing arguments:");
  for (const error of parsed.errors) {
    console.error(`  ${error}`);
  }
  console.error(`
Run 'ralph --help' for available options`);
  process.exit(1);
}
var model = parsed.args.model;
var minIterations = parsed.args["min-iterations"];
var maxIterations = parsed.args["max-iterations"];
var completionPromise = parsed.args["completion-promise"];
var abortPromise = parsed.args["abort-promise"];
var tasksMode = parsed.args.tasks;
var taskPromise = parsed.args["task-promise"];
var supervisorEnabled = parsed.args.supervisor;
var supervisorModel = parsed.args["supervisor-model"];
var supervisorNoActionPromise = parsed.args["supervisor-no-action-promise"];
var supervisorSuggestionPromise = parsed.args["supervisor-suggestion-promise"];
var supervisorMemoryLimit = parsed.args["supervisor-memory-limit"];
var supervisorPromptTemplatePath = parsed.args["supervisor-prompt-template"];
var promptFile = parsed.args["prompt-file"];
var promptTemplatePath = parsed.args["prompt-template"];
var noStream = parsed.args["no-stream"];
var verboseTools = parsed.args["verbose-tools"];
var noCommit = parsed.args["no-commit"];
var disablePlugins = parsed.args["no-plugins"];
var allowAll = parsed.args["allow-all"];
var noAllowAll = parsed.args["no-allow-all"];
var autoCommit = !noCommit;
var streamOutput = !noStream;
var allowAllPermissions = allowAll && !noAllowAll;
var promptParts = parsed.promptParts;
var prompt = "";
var promptSource = "";
if (promptFile) {
  promptSource = promptFile;
  prompt = readPromptFile(promptFile);
} else if (promptParts.length === 1 && existsSync10(promptParts[0])) {
  promptSource = promptParts[0];
  prompt = readPromptFile(promptParts[0]);
} else {
  prompt = promptParts.join(" ");
}
if (!prompt) {
  console.error("Error: No prompt provided");
  console.error('Usage: ralph "Your task description" [options]');
  console.error("Run 'ralph --help' for more information");
  process.exit(1);
}
if (maxIterations > 0 && minIterations > maxIterations) {
  console.error(`Error: --min-iterations (${minIterations}) cannot be greater than --max-iterations (${maxIterations})`);
  process.exit(1);
}
async function main() {
  let sdkClient = null;
  try {
    console.log("\uD83D\uDE80 Initializing OpenCode SDK...");
    sdkClient = await createSdkClient({
      model: model || undefined,
      filterPlugins: disablePlugins,
      allowAllPermissions
    });
    console.log(`\u2705 SDK client ready (${sdkClient.server.url})`);
  } catch (error) {
    console.error("\u274C Failed to initialize SDK client:", error);
    console.error("SDK initialization failed. Please ensure OpenCode is properly installed and configured.");
    process.exit(1);
  }
  try {
    await runRalphLoop({
      prompt,
      promptTemplatePath,
      model,
      supervisorModel,
      supervisorEnabled,
      supervisorNoActionPromise,
      supervisorSuggestionPromise,
      supervisorMemoryLimit,
      supervisorPromptTemplatePath,
      minIterations,
      maxIterations,
      completionPromise,
      abortPromise,
      tasksMode,
      taskPromise,
      streamOutput,
      verboseTools,
      autoCommit,
      disablePlugins,
      allowAllPermissions,
      sdkClient
    });
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    if (sdkClient) {
      try {
        sdkClient.server.close();
      } catch {}
    }
  }
}
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

/**
 * CLI Commands Module
 *
 * Handles CLI commands like status, add-task, remove-task, etc.
 */

import { readFileSync, existsSync } from "fs";
import {
  loadState,
  loadHistory,
  RalphHistory,
  RalphState,
} from "../state/state";
import {
  loadSupervisorSuggestions,
  displaySupervisorSuggestions,
  applyApprovedSuggestion,
} from "../supervisor/supervisor";
import {
  loadContext,
  getContextPath,
} from "../context/context";
import {
  loadTasks,
  displayTasksWithIndices,
  removeTask as removeTaskFromTasks,
  appendTask as appendTaskToTasks,
} from "../tasks/tasks";
import {
  formatDurationLong,
  formatDuration,
  formatToolSummary,
} from "../utils/utils";
import { getTasksFilePath } from "../config/config";

export function handleStatusCommand(args: string[]): void {
  const state = loadState();
  const history = loadHistory();
  const contextPath = getContextPath();
  const context = existsSync(contextPath) ? readFileSync(contextPath, "utf-8").trim() : null;
  const supervisorSuggestions = loadSupervisorSuggestions();
  const pendingSuggestions = supervisorSuggestions.suggestions.filter(s => s.status === "pending").length;
  const showTasks = args.includes("--tasks") || args.includes("-t") || state?.tasksMode;
  const tasksPath = getTasksFilePath();

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    Opencode Ralph Status                         ║
╚══════════════════════════════════════════════════════════════════╝
`);

  if (state?.active) {
    const elapsed = Date.now() - new Date(state.startedAt).getTime();
    const elapsedStr = formatDurationLong(elapsed);
    console.log(`🔄 ACTIVE LOOP`);
    console.log(`   Iteration:    ${state.iteration}${state.maxIterations > 0 ? ` / ${state.maxIterations}` : " (unlimited)"}`);
    console.log(`   Started:      ${state.startedAt}`);
    console.log(`   Elapsed:      ${elapsedStr}`);
    console.log(`   Promise:      ${state.completionPromise}`);
    if (state.model) console.log(`   Model:        ${state.model}`);
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
    console.log(`⏹️  No active loop`);
  }

  if (context) {
    console.log(`\n📝 PENDING CONTEXT (will be injected next iteration):`);
    console.log(`   ${context.split("\n").join("\n   ")}`);
  }

  if (supervisorSuggestions.parseError) {
    console.log(`\n⚠️  SUPERVISOR DATA WARNING: ${supervisorSuggestions.parseError}`);
  }

  if (showTasks) {
    if (existsSync(tasksPath)) {
      try {
        const tasks = loadTasks();
        if (tasks.length > 0) {
          console.log(`\n📋 CURRENT TASKS:`);
          for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const statusIcon = task.status === "complete" ? "✅" : task.status === "in-progress" ? "🔄" : "⏸️";
            console.log(`   ${i + 1}. ${statusIcon} ${task.text}`);

            for (const subtask of task.subtasks) {
              const subStatusIcon = subtask.status === "complete" ? "✅" : subtask.status === "in-progress" ? "🔄" : "⏸️";
              console.log(`      ${subStatusIcon} ${subtask.text}`);
            }
          }
          const complete = tasks.filter(t => t.status === "complete").length;
          const inProgress = tasks.filter(t => t.status === "in-progress").length;
          console.log(`\n   Progress: ${complete}/${tasks.length} complete, ${inProgress} in progress`);
        } else {
          console.log(`\n📋 CURRENT TASKS: (no tasks found)`);
        }
      } catch {
        console.log(`\n📋 CURRENT TASKS: (error reading tasks)`);
      }
    } else {
      console.log(`\n📋 CURRENT TASKS: (no tasks file found)`);
    }
  }

  if (history.iterations.length > 0) {
    console.log(`\n📊 HISTORY (${history.iterations.length} iterations)`);
    console.log(`   Total time:   ${formatDurationLong(history.totalDurationMs)}`);

    const recent = history.iterations.slice(-5);
    console.log(`\n   Recent iterations:`);
    for (const iter of recent) {
      const tools = Object.entries(iter.toolsUsed)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k}(${v})`)
        .join(" ");
      const modelLabel = iter.model ?? "unknown";
      console.log(`   #${iter.iteration}  ${formatDurationLong(iter.durationMs)}  ${modelLabel}  ${tools || "no tools"}`);
    }

    const struggle = history.struggleIndicators;
    const hasRepeatedErrors = Object.values(struggle.repeatedErrors).some(count => count >= 2);
    if (struggle.noProgressIterations >= 3 || struggle.shortIterations >= 3 || hasRepeatedErrors) {
      console.log(`\n⚠️  STRUGGLE INDICATORS:`);
      if (struggle.noProgressIterations >= 3) {
        console.log(`   - No file changes in ${struggle.noProgressIterations} iterations`);
      }
      if (struggle.shortIterations >= 3) {
        console.log(`   - ${struggle.shortIterations} very short iterations (< 30s)`);
      }
      const topErrors = Object.entries(struggle.repeatedErrors)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      for (const [error, count] of topErrors) {
        console.log(`   - Same error ${count}x: "${error.substring(0, 50)}..."`);
      }
      console.log(`\n   💡 Consider using: ralph --add-context "your hint here"`);
    }
  }

  console.log("");
}

export function handleListSuggestionsCommand(): void {
  const store = loadSupervisorSuggestions();
  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }
  displaySupervisorSuggestions(store);
}

export function handleApproveSuggestionCommand(args: string[]): void {
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
  const suggestion = store.suggestions.find(s => s.id === suggestionId);
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
  const { saveSupervisorSuggestions } = require("../supervisor/supervisor");
  if (applied.ok) {
    suggestion.status = "applied";
    suggestion.appliedAt = new Date().toISOString();
    console.log(`✅ Suggestion ${suggestionId} approved and applied`);
  } else {
    suggestion.status = "failed";
    suggestion.error = applied.error;
    console.error(`❌ Suggestion ${suggestionId} approved but failed to apply: ${applied.error}`);
    saveSupervisorSuggestions(store);
    process.exit(1);
  }
  saveSupervisorSuggestions(store);
}

export function handleRejectSuggestionCommand(args: string[]): void {
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
  const suggestion = store.suggestions.find(s => s.id === suggestionId);
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
  const { saveSupervisorSuggestions } = require("../supervisor/supervisor");
  saveSupervisorSuggestions(store);
  console.log(`✅ Suggestion ${suggestionId} rejected`);
}

export function handleAddContextCommand(args: string[]): void {
  const addContextIdx = args.indexOf("--add-context");
  const contextText = args[addContextIdx + 1];
  if (!contextText) {
    console.error("Error: --add-context requires a text argument");
    console.error("Usage: ralph --add-context \"Your context or hint here\"");
    process.exit(1);
  }

  const { appendContext } = require("../context/context");
  appendContext(contextText);

  const contextPath = getContextPath();
  console.log(`✅ Context added for next iteration`);
  console.log(`   File: ${contextPath}`);

  const state = loadState();
  if (state?.active) {
    console.log(`   Will be picked up in iteration ${state.iteration + 1}`);
  } else {
    console.log(`   Will be used when loop starts`);
  }
}

export function handleClearContextCommand(): void {
  const contextPath = getContextPath();
  if (existsSync(contextPath)) {
    require("fs").unlinkSync(contextPath);
    console.log(`✅ Context cleared`);
  } else {
    console.log(`ℹ️  No pending context to clear`);
  }
}

export function handleListTasksCommand(): void {
  const tasksPath = getTasksFilePath();
  if (!existsSync(tasksPath)) {
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

export function handleAddTaskCommand(args: string[]): void {
  const addTaskIdx = args.indexOf("--add-task");
  const taskDescription = args[addTaskIdx + 1];
  if (!taskDescription) {
    console.error("Error: --add-task requires a description");
    console.error("Usage: ralph --add-task \"Task description\"");
    process.exit(1);
  }

  try {
    appendTaskToTasks(taskDescription);
    console.log(`✅ Task added: "${taskDescription}"`);
  } catch (error) {
    console.error("Error adding task:", error);
    process.exit(1);
  }
}

export function handleRemoveTaskCommand(args: string[]): void {
  const removeTaskIdx = args.indexOf("--remove-task");
  const taskIndexStr = args[removeTaskIdx + 1];
  if (!taskIndexStr || isNaN(parseInt(taskIndexStr))) {
    console.error("Error: --remove-task requires a valid number");
    console.error("Usage: ralph --remove-task 3");
    process.exit(1);
  }

  const taskIndex = parseInt(taskIndexStr);

  try {
    removeTaskFromTasks(taskIndex);
    console.log(`✅ Removed task ${taskIndex} and its subtasks`);
  } catch (error) {
    console.error("Error removing task:", error);
    process.exit(1);
  }
}

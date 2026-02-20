/**
 * Status Subcommand
 *
 * Displays current Ralph loop status and history.
 */

import { existsSync, readFileSync } from "fs";
import type { Command } from "commander";
import {
  loadState,
  loadHistory,
  type RalphHistory,
  type RalphState,
} from "../../state/state";
import {
  loadSupervisorSuggestions,
} from "../../supervisor/supervisor";
import {
  loadContext,
  getContextPath,
} from "../../context/context";
import {
  loadTasks,
} from "../../tasks/tasks";
import {
  formatDurationLong,
  formatDuration,
} from "../../utils/utils";
import { getTasksFilePath } from "../../config/config";

/**
 * Status command options
 */
interface StatusOptions {
  tasks?: boolean;
}

/**
 * Register the status subcommand
 * @param program - Commander program instance
 */
export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show current Ralph loop status and history")
    .option("-t, --tasks", "Show status including current task list")
    .action(statusCommandAction);
}

/**
 * Status command action handler
 * @param options - Command options
 */
export function statusCommandAction(options: StatusOptions): void {
  const state = loadState();
  const history = loadHistory();
  const contextPath = getContextPath();
  const context = existsSync(contextPath) ? readFileSync(contextPath, "utf-8").trim() : null;
  const supervisorSuggestions = loadSupervisorSuggestions();
  const pendingSuggestions = supervisorSuggestions.suggestions.filter((s) => s.status === "pending").length;
  const showTasks = options.tasks || state?.tasksMode;
  const tasksPath = getTasksFilePath();

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    Opencode Ralph Status                         ║
╚══════════════════════════════════════════════════════════════════╝
`);

  if (state?.active) {
    displayActiveState(state, pendingSuggestions);
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
    displayTasks(tasksPath);
  }

  if (history.iterations.length > 0) {
    displayHistory(history);
  }

  console.log("");
}

/**
 * Display active loop state information
 * @param state - Current state
 * @param pendingSuggestions - Number of pending supervisor suggestions
 */
function displayActiveState(state: RalphState, pendingSuggestions: number): void {
  const elapsed = Date.now() - new Date(state.startedAt).getTime();
  const elapsedStr = formatDurationLong(elapsed);

  console.log(`🔄 ACTIVE LOOP`);
  console.log(`   Iteration:    ${state.iteration}${state.maxIterations > 0 ? ` / ${state.maxIterations}` : " (unlimited)"}`);
  console.log(`   Started:      ${state.startedAt}`);
  console.log(`   Elapsed:      ${elapsedStr}`);
  console.log(`   Promise:      ${state.completionPromise}`);

  if (state.model) {
    console.log(`   Model:        ${state.model}`);
  }

  if (state.tasksMode) {
    console.log(`   Tasks Mode:   ENABLED`);
    console.log(`   Task Promise: ${state.taskPromise}`);
  }

  console.log(`   Prompt:       ${state.prompt.substring(0, 60)}${state.prompt.length > 60 ? "..." : ""}`);

  if (state.supervisor?.enabled) {
    displaySupervisorStatus(state, pendingSuggestions);
  }
}

/**
 * Display supervisor status information
 * @param state - Current state
 * @param pendingSuggestions - Number of pending supervisor suggestions
 */
function displaySupervisorStatus(state: RalphState, pendingSuggestions: number): void {
  console.log(`   Supervisor:   ENABLED`);

  if (state.supervisor?.model) {
    console.log(`   Sup Model:    ${state.supervisor.model}`);
  }

  console.log(`   Sup Pending:  ${pendingSuggestions}`);

  if (state.supervisorState?.pausedForDecision) {
    console.log(`   Sup Status:   waiting for user decision`);
  }
}

/**
 * Display tasks information
 * @param tasksPath - Path to tasks file
 */
function displayTasks(tasksPath: string): void {
  if (!existsSync(tasksPath)) {
    console.log(`\n📋 CURRENT TASKS: (no tasks file found)`);
    return;
  }

  try {
    const tasks = loadTasks();

    if (tasks.length === 0) {
      console.log(`\n📋 CURRENT TASKS: (no tasks found)`);
      return;
    }

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

    const complete = tasks.filter((t) => t.status === "complete").length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    console.log(`\n   Progress: ${complete}/${tasks.length} complete, ${inProgress} in progress`);
  } catch {
    console.log(`\n📋 CURRENT TASKS: (error reading tasks)`);
  }
}

/**
 * Display history information
 * @param history - Loop history
 */
function displayHistory(history: RalphHistory): void {
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

  displayStruggleIndicators(history);
}

/**
 * Display struggle indicators if present
 * @param history - Loop history
 */
function displayStruggleIndicators(history: RalphHistory): void {
  const struggle = history.struggleIndicators;
  const hasRepeatedErrors = Object.values(struggle.repeatedErrors).some((count) => count >= 2);

  if (struggle.noProgressIterations < 3 && struggle.shortIterations < 3 && !hasRepeatedErrors) {
    return;
  }

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

  console.log(`\n   💡 Consider using: ralph context add "your hint here"`);
}

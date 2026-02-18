#!/usr/bin/env bun
/**
 * Ralph Wiggum Loop for AI agents
 *
 * Implementation of the Ralph Wiggum technique - continuous self-referential
 * AI loops for iterative development. Based on ghuntley.com/ralph/
 */

import { $ } from "bun";
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "fs";
import { join } from "path";

// Import SDK modules
import { createSdkClient, type SdkClient } from "./src/sdk/client";
import { executePrompt } from "./src/sdk/executor";
import { formatEvent } from "./src/sdk/output";

// Get version from package.json
const VERSION = process.env.npm_package_version ||
  (existsSync(join(__dirname, "package.json"))
    ? JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8")).version
    : "2.0.0");

// Context file path for mid-loop injection
const stateDir = join(process.cwd(), ".ralph");
const statePath = join(stateDir, "ralph-loop.state.json");
const contextPath = join(stateDir, "ralph-context.md");
const historyPath = join(stateDir, "ralph-history.json");
const tasksPath = join(stateDir, "ralph-tasks.md");
const supervisorMemoryPath = join(stateDir, "supervisor-memory.md");
const supervisorSuggestionsPath = join(stateDir, "supervisor-suggestions.json");
// Parse arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Ralph Wiggum Loop - Iterative AI development with OpenCode

Usage:
  ralph "<prompt>" [options]
  ralph --prompt-file <path> [options]

Arguments:
  prompt              Task description for the AI to work on

Options:
  --model MODEL       Model to use (e.g., anthropic/claude-sonnet-4)
  --min-iterations N  Minimum iterations before completion allowed (default: 1)
  --max-iterations N  Maximum iterations before stopping (default: unlimited)
  --completion-promise TEXT  Phrase that signals completion (default: COMPLETE)
  --abort-promise TEXT  Phrase that signals early abort (e.g., precondition failed)
  --tasks, -t         Enable Tasks Mode for structured task tracking
  --task-promise TEXT Phrase that signals task completion (default: READY_FOR_NEXT_TASK)
  --supervisor       Enable post-iteration supervisor loop
  --supervisor-model MODEL  Supervisor model
  --supervisor-no-action-promise TEXT  Promise for no-op supervisor run (default: NO_ACTION_NEEDED)
  --supervisor-suggestion-promise TEXT Promise when supervisor suggests change (default: USER_DECISION_REQUIRED)
  --supervisor-memory-limit N  Number of supervisor memory entries to keep (default: 20)
  --supervisor-prompt-template PATH  Custom prompt template for supervisor
  --prompt-file, --file, -f  Read prompt content from a file
  --prompt-template PATH  Use custom prompt template (supports variables)
  --no-stream         Buffer output and print at the end
  --verbose-tools     Print every tool line (disable compact tool summary)
  --no-plugins        Disable non-auth OpenCode plugins for this run
  --no-commit         Don't auto-commit after each iteration
  --allow-all         Auto-approve all tool permissions (default: on)
  --no-allow-all      Require interactive permission prompts
  --version, -v       Show version
  --help, -h          Show this help

Commands:
  --status            Show current Ralph loop status and history
  --status --tasks    Show status including current task list
  --add-context TEXT  Add context for the next iteration (or edit .ralph/ralph-context.md)
  --clear-context     Clear any pending context
  --list-tasks        Display the current task list with indices
  --add-task "desc"   Add a new task to the list
  --remove-task N     Remove task at index N (including subtasks)
  --list-suggestions  Show supervisor suggestions and statuses
  --approve-suggestion ID  Approve and apply a pending supervisor suggestion
  --reject-suggestion ID   Reject a pending supervisor suggestion

Examples:
  ralph "Build a REST API for todos"
  ralph "Fix the auth bug" --max-iterations 10
  ralph "Add tests" --completion-promise "ALL TESTS PASS" --model anthropic/claude-sonnet-4
  ralph --prompt-file ./prompt.md --max-iterations 5
  ralph --status                                        # Check loop status
  ralph --add-context "Focus on the auth module first"  # Add hint for next iteration

How it works:
  1. Sends your prompt to OpenCode via SDK
  2. OpenCode works on the task
  3. Checks output for completion promise
  4. If not complete, repeats with same prompt
  5. OpenCode sees its previous work in files
  6. Continues until promise detected or max iterations

To stop manually: Ctrl+C

Learn more: https://ghuntley.com/ralph/
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(`ralph ${VERSION}`);
  process.exit(0);
}

// History tracking interface
interface IterationHistory {
  iteration: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  model: string;
  toolsUsed: Record<string, number>;
  filesModified: string[];
  exitCode: number;
  completionDetected: boolean;
  errors: string[];
}

interface RalphHistory {
  iterations: IterationHistory[];
  totalDurationMs: number;
  struggleIndicators: {
    repeatedErrors: Record<string, number>;
    noProgressIterations: number;
    shortIterations: number;
  };
}

interface SupervisorConfig {
  enabled: boolean;
  model: string;
  noActionPromise: string;
  suggestionPromise: string;
  memoryLimit: number;
  promptTemplate?: string;
}

interface SupervisorState {
  enabled: boolean;
  pausedForDecision: boolean;
  pauseIteration?: number;
  pauseReason?: string;
  lastRunAt?: string;
  lastRunIteration?: number;
}

type SupervisorSuggestionKind = "add_task" | "add_context";
type SupervisorSuggestionStatus = "pending" | "approved" | "applied" | "rejected" | "failed";

interface SupervisorSuggestion {
  id: string;
  iteration: number;
  kind: SupervisorSuggestionKind;
  title: string;
  details: string;
  proposedChanges: Record<string, string>;
  status: SupervisorSuggestionStatus;
  createdAt: string;
  decidedAt?: string;
  appliedAt?: string;
  error?: string;
}

interface SupervisorSuggestionsStore {
  suggestions: SupervisorSuggestion[];
  parseError?: string;
}

interface SupervisorMemoryEntry {
  iteration: number;
  summary: string;
  decision: string;
  timestamp: string;
}

interface SupervisorRunResult {
  ok: boolean;
  noAction: boolean;
  suggestion?: Omit<SupervisorSuggestion, "id" | "status" | "createdAt">;
  rawOutput: string;
  error?: string;
}

// Load history
function loadHistory(): RalphHistory {
  if (!existsSync(historyPath)) {
    return {
      iterations: [],
      totalDurationMs: 0,
      struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
    };
  }
  try {
    return JSON.parse(readFileSync(historyPath, "utf-8"));
  } catch {
    return {
      iterations: [],
      totalDurationMs: 0,
      struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
    };
  }
}

function saveHistory(history: RalphHistory): void {
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

function clearHistory(): void {
  if (existsSync(historyPath)) {
    try {
      require("fs").unlinkSync(historyPath);
    } catch {}
  }
}

function ensureStateDir(): void {
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
}

function loadSupervisorSuggestions(path = supervisorSuggestionsPath): SupervisorSuggestionsStore {
  if (!existsSync(path)) {
    return { suggestions: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.suggestions)) {
      return { suggestions: [] };
    }
    const suggestions = parsed.suggestions.filter((item: unknown) => item && typeof item === "object") as SupervisorSuggestion[];
    return { suggestions };
  } catch {
    return { suggestions: [], parseError: `Could not parse suggestions file at ${path}` };
  }
}

function saveSupervisorSuggestions(store: SupervisorSuggestionsStore, path = supervisorSuggestionsPath): void {
  ensureStateDir();
  writeFileSync(path, JSON.stringify(store, null, 2));
}

function parseSupervisorMemory(path = supervisorMemoryPath): SupervisorMemoryEntry[] {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf-8").trim();
  if (!content) return [];
  const sections = content.split(/\n(?=## )/g);
  const entries: SupervisorMemoryEntry[] = [];

  for (const section of sections) {
    const lines = section.split("\n");
    if (!lines[0]?.startsWith("## ")) continue;
    const header = lines[0].replace(/^##\s+/, "").trim();
    const headerMatch = header.match(/^(.+?)\s+\|\s+Iteration\s+(\d+)$/i);
    if (!headerMatch) continue;
    const timestamp = headerMatch[1].trim();
    const iteration = parseInt(headerMatch[2], 10);
    const summaryLine = lines.find(line => line.startsWith("- Summary: "));
    const decisionLine = lines.find(line => line.startsWith("- Decision: "));
    if (!summaryLine || !decisionLine || Number.isNaN(iteration)) continue;
    entries.push({
      iteration,
      summary: summaryLine.replace("- Summary: ", "").trim(),
      decision: decisionLine.replace("- Decision: ", "").trim(),
      timestamp,
    });
  }
  return entries;
}

function saveSupervisorMemory(entries: SupervisorMemoryEntry[], path = supervisorMemoryPath): void {
  ensureStateDir();
  const content = [
    "# Supervisor Memory",
    "",
    ...entries.flatMap(entry => [
      `## ${entry.timestamp} | Iteration ${entry.iteration}`,
      `- Summary: ${entry.summary}`,
      `- Decision: ${entry.decision}`,
      "",
    ]),
  ].join("\n").trimEnd() + "\n";
  writeFileSync(path, content);
}

function appendSupervisorMemory(
  entry: SupervisorMemoryEntry,
  memoryLimit: number,
  path = supervisorMemoryPath,
): void {
  const existing = parseSupervisorMemory(path);
  const boundedLimit = Number.isFinite(memoryLimit) && memoryLimit > 0 ? Math.floor(memoryLimit) : 20;
  const next = [...existing, entry].slice(-boundedLimit);
  saveSupervisorMemory(next, path);
}

function buildSupervisorSuggestionId(iteration: number): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `sup-${iteration}-${Date.now()}-${rand}`;
}

function truncateForPrompt(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 20))}\n...[truncated]`;
}

function appendContextEntry(contextText: string): void {
  ensureStateDir();
  const timestamp = new Date().toISOString();
  const newEntry = `\n## Context added at ${timestamp}\n${contextText}\n`;

  if (existsSync(contextPath)) {
    const existing = readFileSync(contextPath, "utf-8");
    writeFileSync(contextPath, existing + newEntry);
  } else {
    writeFileSync(contextPath, `# Ralph Loop Context\n${newEntry}`);
  }
}

function appendTaskEntry(taskDescription: string): void {
  ensureStateDir();
  let tasksContent = "";
  if (existsSync(tasksPath)) {
    tasksContent = readFileSync(tasksPath, "utf-8");
  } else {
    tasksContent = "# Ralph Tasks\n\n";
  }
  const newTaskContent = tasksContent.trimEnd() + "\n" + `- [ ] ${taskDescription}\n`;
  writeFileSync(tasksPath, newTaskContent);
}

function displaySupervisorSuggestions(store: SupervisorSuggestionsStore): void {
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

function applyApprovedSuggestion(suggestion: SupervisorSuggestion): { ok: boolean; error?: string } {
  try {
    if (suggestion.kind === "add_task") {
      const taskText = suggestion.proposedChanges.task ?? suggestion.details;
      if (!taskText?.trim()) {
        return { ok: false, error: "missing task text in suggestion payload" };
      }
      appendTaskEntry(taskText.trim());
      return { ok: true };
    }
    if (suggestion.kind === "add_context") {
      const contextText = suggestion.proposedChanges.context ?? suggestion.details;
      if (!contextText?.trim()) {
        return { ok: false, error: "missing context text in suggestion payload" };
      }
      appendContextEntry(contextText.trim());
      return { ok: true };
    }
    return { ok: false, error: `unsupported suggestion kind: ${suggestion.kind}` };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

// Status command
if (args.includes("--status")) {
  const state = loadState();
  const history = loadHistory();
  const context = existsSync(contextPath) ? readFileSync(contextPath, "utf-8").trim() : null;
  const supervisorSuggestions = loadSupervisorSuggestions();
  const pendingSuggestions = supervisorSuggestions.suggestions.filter(s => s.status === "pending").length;
  // Show tasks if explicitly requested OR if active loop has tasks mode enabled
  const showTasks = args.includes("--tasks") || args.includes("-t") || state?.tasksMode;

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    Ralph Wiggum Status                           ║
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

  // Show tasks if requested
  if (showTasks) {
    if (existsSync(tasksPath)) {
      try {
        const tasksContent = readFileSync(tasksPath, "utf-8");
        const tasks = parseTasks(tasksContent);
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

    // Show last 5 iterations
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

    // Struggle detection
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
  process.exit(0);
}

if (args.includes("--list-suggestions")) {
  const store = loadSupervisorSuggestions();
  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }
  displaySupervisorSuggestions(store);
  process.exit(0);
}

const approveSuggestionIdx = args.indexOf("--approve-suggestion");
if (approveSuggestionIdx !== -1) {
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
  process.exit(0);
}

const rejectSuggestionIdx = args.indexOf("--reject-suggestion");
if (rejectSuggestionIdx !== -1) {
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
  saveSupervisorSuggestions(store);
  console.log(`✅ Suggestion ${suggestionId} rejected`);
  process.exit(0);
}

// Add context command
const addContextIdx = args.indexOf("--add-context");
if (addContextIdx !== -1) {
  const contextText = args[addContextIdx + 1];
  if (!contextText) {
    console.error("Error: --add-context requires a text argument");
    console.error("Usage: ralph --add-context \"Your context or hint here\"");
    process.exit(1);
  }

  appendContextEntry(contextText);

  console.log(`✅ Context added for next iteration`);
  console.log(`   File: ${contextPath}`);

  const state = loadState();
  if (state?.active) {
    console.log(`   Will be picked up in iteration ${state.iteration + 1}`);
  } else {
    console.log(`   Will be used when loop starts`);
  }
  process.exit(0);
}

// Clear context command
if (args.includes("--clear-context")) {
  if (existsSync(contextPath)) {
    require("fs").unlinkSync(contextPath);
    console.log(`✅ Context cleared`);
  } else {
    console.log(`ℹ️  No pending context to clear`);
  }
  process.exit(0);
}

// List tasks command
if (args.includes("--list-tasks")) {
  if (!existsSync(tasksPath)) {
    console.log("No tasks file found. Use --add-task to create your first task.");
    process.exit(0);
  }

  try {
    const tasksContent = readFileSync(tasksPath, "utf-8");
    const tasks = parseTasks(tasksContent);
    displayTasksWithIndices(tasks);
  } catch (error) {
    console.error("Error reading tasks file:", error);
    process.exit(1);
  }
  process.exit(0);
}

// Add task command
const addTaskIdx = args.indexOf("--add-task");
if (addTaskIdx !== -1) {
  const taskDescription = args[addTaskIdx + 1];
  if (!taskDescription) {
    console.error("Error: --add-task requires a description");
    console.error("Usage: ralph --add-task \"Task description\"");
    process.exit(1);
  }

  try {
    appendTaskEntry(taskDescription);
    console.log(`✅ Task added: "${taskDescription}"`);
  } catch (error) {
    console.error("Error adding task:", error);
    process.exit(1);
  }
  process.exit(0);
}

// Remove task command
const removeTaskIdx = args.indexOf("--remove-task");
if (removeTaskIdx !== -1) {
  const taskIndexStr = args[removeTaskIdx + 1];
  if (!taskIndexStr || isNaN(parseInt(taskIndexStr))) {
    console.error("Error: --remove-task requires a valid number");
    console.error("Usage: ralph --remove-task 3");
    process.exit(1);
  }

  const taskIndex = parseInt(taskIndexStr);

  if (!existsSync(tasksPath)) {
    console.error("Error: No tasks file found");
    process.exit(1);
  }

  try {
    const tasksContent = readFileSync(tasksPath, "utf-8");
    const tasks = parseTasks(tasksContent);

    if (taskIndex < 1 || taskIndex > tasks.length) {
      console.error(`Error: Task index ${taskIndex} is out of range (1-${tasks.length})`);
      process.exit(1);
    }

    // Remove the task and its subtasks
    const lines = tasksContent.split("\n");
    const newLines: string[] = [];
    let inRemovedTask = false;
    let currentTaskLine = 0;

    for (const line of lines) {
      // Check if this is a top-level task (starts with "- [" at beginning of line)
      if (line.match(/^- \[/)) {
        currentTaskLine++;
        if (currentTaskLine === taskIndex) {
          inRemovedTask = true;
          continue; // Skip this task line
        } else {
          inRemovedTask = false;
        }
      }

      // Skip all indented content under the removed task (subtasks, notes, etc.)
      if (inRemovedTask && line.match(/^\s+/) && line.trim() !== "") {
        continue;
      }

      newLines.push(line);
    }

    writeFileSync(tasksPath, newLines.join("\n"));
    console.log(`✅ Removed task ${taskIndex} and its subtasks`);
  } catch (error) {
    console.error("Error removing task:", error);
    process.exit(1);
  }
  process.exit(0);
}

function formatDurationLong(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// Task tracking types and functions
interface Task {
  text: string;
  status: "todo" | "in-progress" | "complete";
  subtasks: Task[];
  originalLine: string;
}

// Parse markdown tasks into structured data
function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split("\n");
  let currentTask: Task | null = null;

  for (const line of lines) {
    // Top-level task: starts with "- [" at beginning (no leading whitespace)
    const topLevelMatch = line.match(/^- \[([ x\/])\]\s*(.+)/);
    if (topLevelMatch) {
      if (currentTask) {
        tasks.push(currentTask);
      }
      const [, statusChar, text] = topLevelMatch;
      let status: Task["status"] = "todo";
      if (statusChar === "x") status = "complete";
      else if (statusChar === "/") status = "in-progress";

      currentTask = { text, status, subtasks: [], originalLine: line };
      continue;
    }

    // Subtask: starts with whitespace followed by "- ["
    const subtaskMatch = line.match(/^\s+- \[([ x\/])\]\s*(.+)/);
    if (subtaskMatch && currentTask) {
      const [, statusChar, text] = subtaskMatch;
      let status: Task["status"] = "todo";
      if (statusChar === "x") status = "complete";
      else if (statusChar === "/") status = "in-progress";

      currentTask.subtasks.push({ text, status, subtasks: [], originalLine: line });
    }
  }

  if (currentTask) {
    tasks.push(currentTask);
  }

  return tasks;
}

// Display tasks with numbering for CLI
function displayTasksWithIndices(tasks: Task[]): void {
  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  console.log("Current tasks:");
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const statusIcon = task.status === "complete" ? "✅" : task.status === "in-progress" ? "🔄" : "⏸️";
    console.log(`${i + 1}. ${statusIcon} ${task.text}`);

    for (const subtask of task.subtasks) {
      const subStatusIcon = subtask.status === "complete" ? "✅" : subtask.status === "in-progress" ? "🔄" : "⏸️";
      console.log(`   ${subStatusIcon} ${subtask.text}`);
    }
  }
}

// Find the current in-progress task (marked with [/])
function findCurrentTask(tasks: Task[]): Task | null {
  for (const task of tasks) {
    if (task.status === "in-progress") {
      return task;
    }
  }
  return null;
}

// Find the next incomplete task
function findNextTask(tasks: Task[]): Task | null {
  for (const task of tasks) {
    if (task.status === "todo") {
      return task;
    }
  }
  return null;
}

// Check if all tasks are complete
function allTasksComplete(tasks: Task[]): boolean {
  return tasks.length > 0 && tasks.every(t => t.status === "complete");
}

// Parse options
let prompt = "";
let minIterations = 1; // default: 1 iteration minimum
let maxIterations = 0; // 0 = unlimited
let completionPromise = "COMPLETE";
let abortPromise = ""; // Optional abort promise for early exit on precondition failure
let tasksMode = false;
let taskPromise = "READY_FOR_NEXT_TASK";
let model = "";
let autoCommit = true;
let disablePlugins = false;
let allowAllPermissions = true;
let promptFile = "";
let promptTemplatePath = ""; // Custom prompt template file
let streamOutput = true;
let verboseTools = false;
let promptSource = "";
let supervisorEnabled = false;
let supervisorModel = "";
let supervisorNoActionPromise = "NO_ACTION_NEEDED";
let supervisorSuggestionPromise = "USER_DECISION_REQUIRED";
let supervisorMemoryLimit = 20;
let supervisorPromptTemplatePath = "";
let supervisorOptionsTouched = false;

const promptParts: string[] = [];
let extraAgentFlags: string[] = [];
const doubleDashIndex = args.indexOf("--");

// Extract extra flags after --
if (doubleDashIndex !== -1) {
  extraAgentFlags = args.slice(doubleDashIndex + 1);
  // Remove -- and everything after it from args processing
  args.splice(doubleDashIndex);
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "--min-iterations") {
    const val = args[++i];
    if (!val || isNaN(parseInt(val))) {
      console.error("Error: --min-iterations requires a number");
      process.exit(1);
    }
    minIterations = parseInt(val);
  } else if (arg === "--max-iterations") {
    const val = args[++i];
    if (!val || isNaN(parseInt(val))) {
      console.error("Error: --max-iterations requires a number");
      process.exit(1);
    }
    maxIterations = parseInt(val);
  } else if (arg === "--completion-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --completion-promise requires a value");
      process.exit(1);
    }
    completionPromise = val;
  } else if (arg === "--abort-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --abort-promise requires a value");
      process.exit(1);
    }
    abortPromise = val;
  } else if (arg === "--tasks" || arg === "-t") {
    tasksMode = true;
  } else if (arg === "--task-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --task-promise requires a value");
      process.exit(1);
    }
    taskPromise = val;
  } else if (arg === "--model") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --model requires a value");
      process.exit(1);
    }
    model = val;
  } else if (arg === "--supervisor") {
    supervisorEnabled = true;
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-model") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --supervisor-model requires a value");
      process.exit(1);
    }
    supervisorModel = val;
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-no-action-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --supervisor-no-action-promise requires a value");
      process.exit(1);
    }
    supervisorNoActionPromise = val;
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-suggestion-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --supervisor-suggestion-promise requires a value");
      process.exit(1);
    }
    supervisorSuggestionPromise = val;
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-memory-limit") {
    const val = args[++i];
    if (!val || isNaN(parseInt(val))) {
      console.error("Error: --supervisor-memory-limit requires a number");
      process.exit(1);
    }
    supervisorMemoryLimit = parseInt(val, 10);
    if (supervisorMemoryLimit <= 0) {
      console.error("Error: --supervisor-memory-limit must be greater than 0");
      process.exit(1);
    }
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-prompt-template") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --supervisor-prompt-template requires a file path");
      process.exit(1);
    }
    supervisorPromptTemplatePath = val;
    supervisorOptionsTouched = true;
  } else if (arg === "--prompt-file" || arg === "--file" || arg === "-f") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --prompt-file requires a file path");
      process.exit(1);
    }
    promptFile = val;
  } else if (arg === "--prompt-template") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --prompt-template requires a file path");
      process.exit(1);
    }
    promptTemplatePath = val;
  } else if (arg === "--no-stream") {
    streamOutput = false;
  } else if (arg === "--stream") {
    streamOutput = true;
  } else if (arg === "--verbose-tools") {
    verboseTools = true;
  } else if (arg === "--no-commit") {
    autoCommit = false;
  } else if (arg === "--no-plugins") {
    disablePlugins = true;
  } else if (arg === "--allow-all") {
    allowAllPermissions = true;
  } else if (arg === "--no-allow-all") {
    allowAllPermissions = false;
  } else if (arg.startsWith("-")) {
    console.error(`Error: Unknown option: ${arg}`);
    console.error("Run 'ralph --help' for available options");
    process.exit(1);
  } else {
    promptParts.push(arg);
  }
}

if (supervisorOptionsTouched) {
  supervisorEnabled = true;
}

function readPromptFile(path: string): string {
  if (!existsSync(path)) {
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
    const content = readFileSync(path, "utf-8");
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

if (promptFile) {
  promptSource = promptFile;
  prompt = readPromptFile(promptFile);
} else if (promptParts.length === 1 && existsSync(promptParts[0])) {
  promptSource = promptParts[0];
  prompt = readPromptFile(promptParts[0]);
} else {
  prompt = promptParts.join(" ");
}

if (!prompt) {
  const existingState = loadState();
  if (existingState?.active) {
    prompt = existingState.prompt;
  } else {
    console.error("Error: No prompt provided");
    console.error("Usage: ralph \"Your task description\" [options]");
    console.error("Run 'ralph --help' for more information");
    process.exit(1);
  }
}

// Validate min/max iterations
if (maxIterations > 0 && minIterations > maxIterations) {
  console.error(`Error: --min-iterations (${minIterations}) cannot be greater than --max-iterations (${maxIterations})`);
  process.exit(1);
}

interface RalphState {
  active: boolean;
  iteration: number;
  minIterations: number;
  maxIterations: number;
  completionPromise: string;
  abortPromise?: string; // Optional abort signal for early exit
  tasksMode: boolean;
  taskPromise: string;
  prompt: string;
  promptTemplate?: string; // Custom prompt template path
  startedAt: string;
  model: string;
  supervisor?: SupervisorConfig;
  supervisorState?: SupervisorState;
}

// Create or update state
function saveState(state: RalphState): void {
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function loadState(): RalphState | null {
  if (!existsSync(statePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(statePath, "utf-8"));
  } catch {
    return null;
  }
}

function clearState(): void {
  if (existsSync(statePath)) {
    try {
      require("fs").unlinkSync(statePath);
    } catch {}
  }
}

// Build the full prompt with iteration context
function loadContext(): string | null {
  if (!existsSync(contextPath)) {
    return null;
  }
  try {
    const content = readFileSync(contextPath, "utf-8").trim();
    return content || null;
  } catch {
    return null;
  }
}

function clearContext(): void {
  if (existsSync(contextPath)) {
    try {
      require("fs").unlinkSync(contextPath);
    } catch {}
  }
}

/**
 * Load and process a custom prompt template.
 * Supports the following variables:
 * - {{iteration}} - Current iteration number
 * - {{max_iterations}} - Maximum iterations (or "unlimited")
 * - {{min_iterations}} - Minimum iterations
 * - {{prompt}} - The user's task prompt
 * - {{completion_promise}} - The completion promise text
 * - {{abort_promise}} - The abort promise text (if configured)
 * - {{task_promise}} - The task promise text (for tasks mode)
 * - {{context}} - Any additional context added mid-loop
 * - {{tasks}} - Task list content (for tasks mode)
 */
function loadCustomPromptTemplate(templatePath: string, state: RalphState): string | null {
  if (!existsSync(templatePath)) {
    console.error(`Error: Prompt template not found: ${templatePath}`);
    process.exit(1);
  }

  try {
    let template = readFileSync(templatePath, "utf-8");

    // Load context
    const context = loadContext() || "";

    // Load tasks if in tasks mode
    let tasksContent = "";
    if (state.tasksMode && existsSync(tasksPath)) {
      tasksContent = readFileSync(tasksPath, "utf-8");
    }

    // Replace variables
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

/**
 * Build the prompt for the current iteration.
 * @param state - Current loop state
 */
function buildPrompt(state: RalphState): string {
  // Use custom template if provided
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

  // Tasks mode: use task-specific instructions
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

  // Default mode: simple instructions without tool-specific mentions
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

function loadCustomSupervisorPromptTemplate(
  templatePath: string,
  state: RalphState,
  coderOutput: string,
  history: RalphHistory,
): string | null {
  if (!existsSync(templatePath)) {
    console.error(`Error: Supervisor prompt template not found: ${templatePath}`);
    process.exit(1);
  }
  const context = loadContext() || "";
  const tasksContent = existsSync(tasksPath) ? readFileSync(tasksPath, "utf-8") : "";
  const memoryEntries = parseSupervisorMemory().slice(-10);
  const memoryText = memoryEntries.map(m => `${m.timestamp} [iter ${m.iteration}] ${m.summary} (${m.decision})`).join("\n");

  let template = readFileSync(templatePath, "utf-8");
  template = template
    .replace(/\{\{iteration\}\}/g, String(state.iteration))
    .replace(/\{\{prompt\}\}/g, state.prompt)
    .replace(/\{\{coder_output\}\}/g, coderOutput)
    .replace(/\{\{context\}\}/g, context)
    .replace(/\{\{tasks\}\}/g, tasksContent)
    .replace(/\{\{supervisor_memory\}\}/g, memoryText)
    .replace(/\{\{no_progress_iterations\}\}/g, String(history.struggleIndicators.noProgressIterations))
    .replace(/\{\{short_iterations\}\}/g, String(history.struggleIndicators.shortIterations));
  return template;
}

function buildSupervisorPrompt(
  state: RalphState,
  supervisorConfig: SupervisorConfig,
  coderOutput: string,
  history: RalphHistory,
): string {
  if (supervisorConfig.promptTemplate) {
    const template = loadCustomSupervisorPromptTemplate(supervisorConfig.promptTemplate, state, coderOutput, history);
    if (template) return template;
  }
  const context = loadContext() || "(none)";
  const tasksContent = existsSync(tasksPath) ? readFileSync(tasksPath, "utf-8") : "(no tasks file)";
  const memoryEntries = parseSupervisorMemory().slice(-10);
  const memoryText = memoryEntries.length > 0
    ? memoryEntries.map(m => `- ${m.timestamp} (iteration ${m.iteration}): ${m.summary} | ${m.decision}`).join("\n")
    : "- no prior supervisor memory";
  const truncatedOutput = truncateForPrompt(coderOutput, 6000);

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

function parseSupervisorOutput(
  output: string,
  noActionPromise: string,
  suggestionPromise: string,
  iteration: number,
): SupervisorRunResult {
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
      error: "supervisor output missing required promise tag",
    };
  }

  const match = output.match(/<supervisor_suggestion>\s*([\s\S]*?)\s*<\/supervisor_suggestion>/i);
  if (!match) {
    return {
      ok: false,
      noAction: false,
      rawOutput: output,
      error: "suggestion promise found, but missing <supervisor_suggestion> JSON block",
    };
  }

  try {
    const parsed = JSON.parse(match[1]);
    const kind = parsed?.kind;
    const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
    const details = typeof parsed?.details === "string" ? parsed.details.trim() : "";
    const proposedChanges = parsed?.proposedChanges && typeof parsed.proposedChanges === "object"
      ? parsed.proposedChanges as Record<string, string>
      : {};

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
        proposedChanges,
      },
    };
  } catch (error) {
    return {
      ok: false,
      noAction: false,
      rawOutput: output,
      error: `invalid supervisor suggestion JSON: ${String(error)}`,
    };
  }
}

async function runSupervisorOnce(
  state: RalphState,
  supervisorConfig: SupervisorConfig,
  history: RalphHistory,
  coderOutput: string,
  sdkClient: SdkClient,
): Promise<SupervisorRunResult> {
  try {
    const supervisorPrompt = buildSupervisorPrompt(state, supervisorConfig, coderOutput, history);
    
    // SDK execution path (only path supported)
    const result = await executePrompt({
      client: sdkClient.client,
      prompt: supervisorPrompt,
      model: supervisorConfig.model,
      onEvent: (event) => {
        // Supervisor events - only display in verbose mode
        if (verboseTools) {
          const formatted = formatEvent(event);
          if (formatted) console.log(`| [Supervisor] ${formatted}`);
        }
      },
    });
    
    if (!result.success) {
      return {
        ok: false,
        noAction: false,
        rawOutput: result.output,
        error: result.errors.join("; ") || "SDK execution failed",
      };
    }
    
    return parseSupervisorOutput(
      result.output,
      supervisorConfig.noActionPromise,
      supervisorConfig.suggestionPromise,
      state.iteration,
    );
  } catch (error) {
    return {
      ok: false,
      noAction: false,
      rawOutput: "",
      error: String(error),
    };
  }
}

async function waitForSupervisorDecisionIfNeeded(
  state: RalphState,
  iteration: number,
): Promise<{ approvedAppliedCount: number }> {
  let printedHint = false;
  while (true) {
    const store = loadSupervisorSuggestions();
    if (store.parseError) {
      if (!printedHint) {
        console.warn(`⚠️  ${store.parseError}`);
        console.warn("   Fix the file or reject pending suggestions once readable.");
        printedHint = true;
      }
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    const pending = store.suggestions.filter(s => s.iteration === iteration && s.status === "pending");
    if (pending.length === 0) {
      const approvedApplied = store.suggestions.filter(
        s => s.iteration === iteration && (s.status === "approved" || s.status === "applied"),
      ).length;
      state.supervisorState = {
        ...(state.supervisorState ?? { enabled: true, pausedForDecision: false }),
        pausedForDecision: false,
        pauseIteration: undefined,
        pauseReason: undefined,
      };
      saveState(state);
      return { approvedAppliedCount: approvedApplied };
    }
    if (!printedHint) {
      console.log("⏸️  Waiting for supervisor decision...");
      for (const item of pending) {
        console.log(`   - Approve: ralph --approve-suggestion ${item.id}`);
        console.log(`   - Reject:  ralph --reject-suggestion ${item.id}`);
      }
      printedHint = true;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

// Generate the tasks mode section for the prompt
function getTasksModeSection(state: RalphState): string {
  if (!existsSync(tasksPath)) {
    return `
## TASKS MODE: Enabled (no tasks file found)

Create .ralph/ralph-tasks.md with your task list, or use \`ralph --add-task "description"\` to add tasks.
`;
  }

  try {
    const tasksContent = readFileSync(tasksPath, "utf-8");
    const tasks = parseTasks(tasksContent);
    const currentTask = findCurrentTask(tasks);
    const nextTask = findNextTask(tasks);

    let taskInstructions = "";
    if (currentTask) {
      taskInstructions = `
🔄 CURRENT TASK: "${currentTask.text}"
   Focus on completing this specific task.
   When done: Mark as [x] in .ralph/ralph-tasks.md and output <promise>${state.taskPromise}</promise>`;
    } else if (nextTask) {
      taskInstructions = `
📍 NEXT TASK: "${nextTask.text}"
   Mark as [/] in .ralph/ralph-tasks.md before starting.
   When done: Mark as [x] and output <promise>${state.taskPromise}</promise>`;
    } else if (allTasksComplete(tasks)) {
      taskInstructions = `
✅ ALL TASKS COMPLETE!
   Output <promise>${state.completionPromise}</promise> to finish.`;
    } else {
      taskInstructions = `
📋 No tasks found. Add tasks to .ralph/ralph-tasks.md or use \`ralph --add-task\``;
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

/**
 * Check if output contains a valid completion promise.
 *
 * To avoid false positives (Issue #28), we check that the promise:
 * 1. Uses the exact <promise>...</promise> format
 * 2. Is NOT preceded by negation words like "not", "don't", "won't", "will not"
 * 3. Is NOT inside quotes (the model explaining what it will say)
 *
 * Valid: "<promise>COMPLETE</promise>"
 * Invalid: "I will not output <promise>COMPLETE</promise> yet"
 * Invalid: 'Once done, I\'ll say "<promise>COMPLETE</promise>"'
 */
function checkCompletion(output: string, promise: string): boolean {
  const escapedPromise = escapeRegex(promise);
  const promisePattern = new RegExp(`<promise>\\s*${escapedPromise}\\s*</promise>`, "gi");

  const matches = output.match(promisePattern);
  if (!matches) return false;

  // Check each match for false positive indicators
  for (const match of matches) {
    const matchIndex = output.indexOf(match);
    const contextBefore = output.substring(Math.max(0, matchIndex - 100), matchIndex).toLowerCase();

    // Check for negation patterns before the promise
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
      /\buntil\s+(I\s+)?(say|output|can\s+say)/,
    ];

    const hasNegation = negationPatterns.some(pattern => pattern.test(contextBefore));
    if (hasNegation) continue;

    // Check if inside quotes (model explaining what it will say)
    const quotesBefore = (contextBefore.match(/["'`]/g) || []).length;
    // Odd number of quotes means we're inside a quoted string
    if (quotesBefore % 2 === 1) continue;

    // This match appears to be a genuine completion signal
    return true;
  }

  return false;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectPlaceholderPluginError(output: string): boolean {
  return output.includes("ralph-wiggum is not yet ready for use. This is a placeholder package.");
}

/**
 * Detect ProviderModelNotFoundError and provide helpful guidance.
 * This error occurs when the default model is not configured in OpenCode.
 * Related: Issues #22, #23
 */
function detectModelNotFoundError(output: string): boolean {
  return output.includes("ProviderModelNotFoundError") ||
         output.includes("Provider returned error") ||
         output.includes("model not found") ||
         output.includes("No model configured");
}

/**
 * Check if an error is an SDK-specific error that should trigger retry logic.
 * SDK errors come from the OpenCode SDK client, not from subprocess output.
 *
 * @param error - The error to check (can be any type from catch block)
 * @returns True if this is an SDK error that requires special handling
 */
function isSdkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Provider/model related errors
    if (msg.includes("providermodelfound") ||
        msg.includes("model not found") ||
        msg.includes("provider returned error") ||
        msg.includes("invalid model") ||
        msg.includes("model configuration")) {
      return true;
    }
    // Connection/server errors
    if (msg.includes("connection refused") ||
        msg.includes("network error") ||
        msg.includes("timeout") ||
        msg.includes("econnrefused") ||
        msg.includes("socket hang up")) {
      return true;
    }
    // SDK initialization errors
    if (msg.includes("failed to initialize") ||
        msg.includes("sdk initialization") ||
        msg.includes("server failed to start")) {
      return true;
    }
    // Rate limit errors
    if (msg.includes("rate limit") ||
        msg.includes("too many requests") ||
        msg.includes("throttled")) {
      return true;
    }
    // Authentication errors
    if (msg.includes("authentication") ||
        msg.includes("unauthorized") ||
        msg.includes("api key")) {
      return true;
    }
  }
  return false;
}

/**
 * Extract a readable error message from an SDK error.
 * Handles various error types gracefully.
 *
 * @param error - The error to extract message from
 * @returns A user-friendly error message string
 */
function getSdkErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    // Try to extract message from common error object shapes
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") {
      return err.message;
    }
    if (typeof err.error === "string") {
      return err.error;
    }
    if (typeof err.description === "string") {
      return err.description;
    }
    // Return JSON representation as last resort
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown SDK error (could not stringify)";
    }
  }
  return String(error);
}

/**
 * Detect if SDK output contains model not found error.
 * This complements isSdkError by checking SDK result output.
 *
 * @param output - The output text from SDK execution
 * @returns True if model not found error is detected
 */
function detectSdkModelNotFoundError(output: string): boolean {
  const lowerOutput = output.toLowerCase();
  return lowerOutput.includes("providermodelfound") ||
         lowerOutput.includes("model not found") ||
         lowerOutput.includes("provider returned error") ||
         lowerOutput.includes("no model configured");
}

/**
 * Detect if SDK output contains placeholder plugin error.
 *
 * @param output - The output text from SDK execution
 * @returns True if placeholder plugin error is detected
 */
function detectSdkPlaceholderPluginError(output: string): boolean {
  return output.includes("ralph-wiggum is not yet ready for use");
}

function stripAnsi(input: string): string {
  return input.replace(/\x1B\[[0-9;]*m/g, "");
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatToolSummary(toolCounts: Map<string, number>, maxItems = 6): string {
  if (!toolCounts.size) return "";
  const entries = Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, maxItems);
  const remaining = entries.length - shown.length;
  const parts = shown.map(([name, count]) => `${name} ${count}`);
  if (remaining > 0) {
    parts.push(`+${remaining} more`);
  }
  return parts.join(" • ");
}

function printIterationSummary(params: {
  iteration: number;
  elapsedMs: number;
  toolCounts: Map<string, number>;
  exitCode: number;
  completionDetected: boolean;
  model: string;
}): void {
  const toolSummary = formatToolSummary(params.toolCounts);
  const duration = formatDuration(params.elapsedMs);
  console.log(`Iteration ${params.iteration} completed in ${duration} (${params.model})`);
  console.log("\nIteration Summary");
  console.log("────────────────────────────────────────────────────────────────────");
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

// Main loop
// Helper to detect per-iteration file changes using content hashes
// Works correctly with --no-commit by comparing file content hashes

interface FileSnapshot {
  files: Map<string, string>; // filename -> hash/mtime
}

async function captureFileSnapshot(): Promise<FileSnapshot> {
  const files = new Map<string, string>();
  try {
    // Get list of all tracked and modified files
    const status = await $`git status --porcelain`.text();
    const trackedFiles = await $`git ls-files`.text();

    // Combine modified and tracked files
    const allFiles = new Set<string>();
    for (const line of status.split("\n")) {
      if (line.trim()) {
        allFiles.add(line.substring(3).trim());
      }
    }
    for (const file of trackedFiles.split("\n")) {
      if (file.trim()) {
        allFiles.add(file.trim());
      }
    }

    // Get hash for each file (using git hash-object for content comparison)
    for (const file of allFiles) {
      try {
        const hash = await $`git hash-object ${file} 2>/dev/null || stat -f '%m' ${file} 2>/dev/null || echo ''`.text();
        files.set(file, hash.trim());
      } catch {
        // File may not exist, skip
      }
    }
  } catch {
    // Git not available or error
  }
  return { files };
}

function getModifiedFilesSinceSnapshot(before: FileSnapshot, after: FileSnapshot): string[] {
  const changedFiles: string[] = [];

  // Check for new or modified files
  for (const [file, hash] of after.files) {
    const prevHash = before.files.get(file);
    if (prevHash !== hash) {
      changedFiles.push(file);
    }
  }

  // Check for deleted files
  for (const [file] of before.files) {
    if (!after.files.has(file)) {
      changedFiles.push(file);
    }
  }

  return changedFiles;
}

// Helper to extract error patterns from output
function extractErrors(output: string): string[] {
  const errors: string[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Match common error patterns
    if (
      lower.includes("error:") ||
      lower.includes("failed:") ||
      lower.includes("exception:") ||
      lower.includes("typeerror") ||
      lower.includes("syntaxerror") ||
      lower.includes("referenceerror") ||
      (lower.includes("test") && lower.includes("fail"))
    ) {
      const cleaned = line.trim().substring(0, 200);
      if (cleaned && !errors.includes(cleaned)) {
        errors.push(cleaned);
      }
    }
  }

  return errors.slice(0, 10); // Cap at 10 errors per iteration
}

/**
 * SDK Iteration Options
 */
interface SdkIterationOptions {
  client: SdkClient;
  prompt: string;
  model?: string;
  streamOutput: boolean;
  compactTools: boolean;
}

/**
 * SDK Iteration Result
 */
interface SdkIterationResult {
  output: string;
  toolCounts: Map<string, number>;
  exitCode: number;
  errors: string[];
}

/**
 * Execute a single iteration using the SDK.
 *
 * This wrapper function encapsulates the SDK execution logic,
 * handling event streaming, tool tracking, and output formatting.
 *
 * @param options - Configuration for the iteration
 * @returns Execution result with output, tools, exit code, and errors
 */
async function executeSdkIteration(options: SdkIterationOptions): Promise<SdkIterationResult> {
  const { client, prompt, model, streamOutput, compactTools } = options;
  
  const toolCounts = new Map<string, number>();
  const errors: string[] = [];
  let output = "";
  
  // Track display timing
  let lastPrintedAt = Date.now();
  let lastToolSummaryAt = 0;
  const toolSummaryIntervalMs = 3000;
  const heartbeatIntervalMs = 10000;
  
  // Tool summary printer (matches subprocess format)
  const maybePrintToolSummary = (force = false) => {
    if (!compactTools || toolCounts.size === 0) return;
    const now = Date.now();
    if (!force && now - lastToolSummaryAt < toolSummaryIntervalMs) {
      return;
    }
    const summary = formatToolSummary(toolCounts);
    if (summary) {
      console.log(`| Tools    ${summary}`);
      lastPrintedAt = now;
      lastToolSummaryAt = now;
    }
  };
  
  // Heartbeat for activity indication
  const heartbeatTimer = setInterval(() => {
    const now = Date.now();
    if (now - lastPrintedAt >= heartbeatIntervalMs) {
      console.log("| ...");
      lastPrintedAt = now;
    }
  }, heartbeatIntervalMs);
  
  try {
    const result = await executePrompt({
      client: client.client,
      prompt,
      model,
      onEvent: (event) => {
        if (!streamOutput) return;
        
        // Track tools
        if (event.type === "tool_start" && event.toolName) {
          toolCounts.set(event.toolName, (toolCounts.get(event.toolName) ?? 0) + 1);
          if (compactTools) {
            maybePrintToolSummary();
          } else {
            console.log(`| ${formatEvent(event)}`);
          }
          lastPrintedAt = Date.now();
        }
        
        // Only display text events in streaming mode (not thinking/tool events)
        if (event.type === "text" && event.content) {
          console.log(event.content);
          lastPrintedAt = Date.now();
        }
      },
    });
    
    clearInterval(heartbeatTimer);
    
    output = result.output;
    
    // Merge tool counts from SDK with locally tracked counts
    for (const [tool, count] of result.toolCounts) {
      toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + count);
    }
    
    // Collect any errors from the result
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
    
    // Print final tool summary in compact mode
    if (compactTools) {
      maybePrintToolSummary(true);
    }
    
    return {
      output,
      toolCounts,
      exitCode: result.exitCode,
      errors,
    };
  } catch (error) {
    clearInterval(heartbeatTimer);
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      output,
      toolCounts,
      exitCode: 1,
      errors,
    };
  }
}

async function runRalphLoop(): Promise<void> {
  // Check if a loop is already running
  const existingState = loadState();
  const resuming = !!existingState?.active;
  if (resuming) {
    minIterations = existingState.minIterations;
    maxIterations = existingState.maxIterations;
    completionPromise = existingState.completionPromise;
    abortPromise = existingState.abortPromise ?? "";
    tasksMode = existingState.tasksMode;
    taskPromise = existingState.taskPromise;
    prompt = existingState.prompt;
    promptTemplatePath = existingState.promptTemplate ?? "";
    model = existingState.model;
    if (existingState.supervisor) {
      supervisorEnabled = existingState.supervisor.enabled;
      supervisorModel = existingState.supervisor.model;
      supervisorNoActionPromise = existingState.supervisor.noActionPromise;
      supervisorSuggestionPromise = existingState.supervisor.suggestionPromise;
      supervisorMemoryLimit = existingState.supervisor.memoryLimit;
      supervisorPromptTemplatePath = existingState.supervisor.promptTemplate ?? "";
    }
    console.log(`🔄 Resuming Ralph loop from ${statePath}`);
  }

  const initialModel = model;
  const effectiveSupervisorModel = supervisorModel || initialModel;
  const supervisorConfig: SupervisorConfig = {
    enabled: supervisorEnabled,
    model: effectiveSupervisorModel,
    noActionPromise: supervisorNoActionPromise,
    suggestionPromise: supervisorSuggestionPromise,
    memoryLimit: supervisorMemoryLimit,
    promptTemplate: supervisorPromptTemplatePath || undefined,
  };

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    Ralph Wiggum Loop                            ║
║         Iterative AI Development with OpenCode                    ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Initialize state
  const state: RalphState = resuming && existingState ? existingState : {
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
      pausedForDecision: false,
    },
  };

  if (resuming && existingState) {
    state.supervisor = supervisorConfig;
    state.supervisorState = existingState.supervisorState ?? {
      enabled: supervisorConfig.enabled,
      pausedForDecision: false,
    };
  }

  if (!resuming) {
    saveState(state);
  }

  // Create tasks file if tasks mode is enabled and file doesn't exist
  if (tasksMode && !existsSync(tasksPath)) {
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }
    writeFileSync(tasksPath, "# Ralph Tasks\n\nAdd your tasks below using: `ralph --add-task \"description\"`\n");
    console.log(`📋 Created tasks file: ${tasksPath}`);
  }

  // Initialize history tracking
  const history: RalphHistory = resuming ? loadHistory() : {
    iterations: [],
    totalDurationMs: 0,
    struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
  };
  if (!resuming) {
    saveHistory(history);
  }

  const promptPreview = prompt.replace(/\s+/g, " ").substring(0, 80) + (prompt.length > 80 ? "..." : "");
  if (promptSource) {
    console.log(`Task: ${promptSource}`);
    console.log(`Preview: ${promptPreview}`);
  } else {
  console.log(`Task: ${promptPreview}`);
  console.log(`Completion promise: ${completionPromise}`);
  if (tasksMode) {
    console.log(`Tasks mode: ENABLED`);
    console.log(`Task promise: ${taskPromise}`);
  }
  console.log(`Min iterations: ${minIterations}`);
  console.log(`Max iterations: ${maxIterations > 0 ? maxIterations : "unlimited"}`);
  if (initialModel) console.log(`Model: ${initialModel}`);
  if (supervisorConfig.enabled) {
    console.log(`Supervisor: ENABLED${supervisorConfig.model ? ` / ${supervisorConfig.model}` : ""}`);
  }
  if (disablePlugins) {
    console.log("OpenCode plugins: non-auth plugins disabled");
  }
  if (allowAllPermissions) console.log("Permissions: auto-approve all tools");
  console.log("");
  console.log("Starting loop... (Ctrl+C to stop)");
  console.log("═".repeat(68));

  // Initialize SDK client (default execution path)
  // SDK is initialized once at loop start and reused for all iterations
  let sdkClient: SdkClient | null = null;
  try {
    console.log("🚀 Initializing OpenCode SDK...");
    sdkClient = await createSdkClient({
      model: initialModel || undefined,
      filterPlugins: disablePlugins,
      allowAllPermissions: allowAllPermissions,
    });
    console.log(`✅ SDK client ready (${sdkClient.server.url})`);
  } catch (error) {
    console.error("❌ Failed to initialize SDK client:", error);
    console.error("SDK initialization failed. Please ensure OpenCode is properly installed and configured.");
    process.exit(1);
  }

  // Set up signal handler for graceful shutdown
  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) {
      console.log("\nForce stopping...");
      process.exit(1);
    }
    stopping = true;
    console.log("\nGracefully stopping Ralph loop...");

    // Clean up SDK server if initialized
    if (sdkClient) {
      try {
        console.log("🧹 Closing SDK server...");
        sdkClient.server.close();
      } catch {
        // Server may have already closed
      }
    }

    clearState();
    console.log("Loop cancelled.");
    process.exit(0);
  });

  if (state.supervisorState?.pausedForDecision && state.supervisorState.pauseIteration) {
    console.log(`⏸️  Resuming in supervisor-decision wait mode (iteration ${state.supervisorState.pauseIteration})`);
    const pausedIteration = state.supervisorState.pauseIteration;
    const decisionResult = await waitForSupervisorDecisionIfNeeded(state, pausedIteration);
    if (state.supervisorState.pauseReason === "completion_detected_with_pending_supervisor_suggestion") {
      if (decisionResult.approvedAppliedCount > 0) {
        console.log("🔄 Supervisor-approved changes were applied while paused. Continuing loop.");
        state.iteration++;
        saveState(state);
      } else {
        console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
        console.log(`║  ✅ Completion promise confirmed after supervisor decisions`);
        console.log(`║  Task completed in ${state.iteration} iteration(s)`);
        console.log(`║  Total time: ${formatDurationLong(history.totalDurationMs)}`);
        console.log(`╚══════════════════════════════════════════════════════════════════╝`);
        clearState();
        clearHistory();
        clearContext();
        return;
      }
    }
  }

  // Main loop
  while (true) {
    // Check max iterations
    if (maxIterations > 0 && state.iteration > maxIterations) {
      console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
      console.log(`║  Max iterations (${maxIterations}) reached. Loop stopped.`);
      console.log(`║  Total time: ${formatDurationLong(history.totalDurationMs)}`);
      console.log(`╚══════════════════════════════════════════════════════════════════╝`);
      clearState();
      // Keep history for analysis via --status
      break;
    }

    const iterInfo = maxIterations > 0 ? ` / ${maxIterations}` : "";
    const minInfo = minIterations > 1 && state.iteration < minIterations ? ` (min: ${minIterations})` : "";
    console.log(`\n🔄 Iteration ${state.iteration}${iterInfo}${minInfo}`);
    console.log("─".repeat(68));

    // Capture context at start of iteration (to only clear what was consumed)
    const contextAtStart = loadContext();

    // Capture git state before iteration to detect per-iteration changes
    const snapshotBefore = await captureFileSnapshot();

    let currentModel = state.model;

    // Build prompt
    const fullPrompt = buildPrompt(state);
    const iterationStart = Date.now();

    let result = "";
    let stderr = "";
    let toolCounts = new Map<string, number>();
    let exitCode = 0;

    try {
      // SDK execution path (only path supported)
      console.log("🚀 Using OpenCode SDK for execution...");

      const sdkResult = await executeSdkIteration({
        client: sdkClient!,
        prompt: fullPrompt,
        model: currentModel,
        streamOutput,
        compactTools: !verboseTools,
      });

      result = sdkResult.output;
      toolCounts = sdkResult.toolCounts;
      exitCode = sdkResult.exitCode;
      stderr = sdkResult.errors.join("\n");

      if (stderr && !streamOutput) {
        console.error(stderr);
      }
      if (result && !streamOutput) {
        console.log(result);
      }

      const combinedOutput = `${result}\n${stderr}`;
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
        model: currentModel,
      });

      // Track iteration history - compare against pre-iteration snapshot
      const snapshotAfter = await captureFileSnapshot();
      const filesModified = getModifiedFilesSinceSnapshot(snapshotBefore, snapshotAfter);
      const errors = extractErrors(combinedOutput);

      const iterationRecord: IterationHistory = {
        iteration: state.iteration,
        startedAt: new Date(iterationStart).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: iterationDuration,
        model: currentModel,
        toolsUsed: Object.fromEntries(toolCounts),
        filesModified,
        exitCode,
        completionDetected,
        errors,
      };

      history.iterations.push(iterationRecord);
      history.totalDurationMs += iterationDuration;

      // Update struggle indicators
      if (filesModified.length === 0) {
        history.struggleIndicators.noProgressIterations++;
      } else {
        history.struggleIndicators.noProgressIterations = 0; // Reset on progress
      }

      if (iterationDuration < 30000) { // Less than 30 seconds
        history.struggleIndicators.shortIterations++;
      } else {
        history.struggleIndicators.shortIterations = 0; // Reset on normal-length iteration
      }

      if (errors.length === 0) {
        // Reset error tracking when iteration has no errors (issue resolved)
        history.struggleIndicators.repeatedErrors = {};
      } else {
        for (const error of errors) {
          const key = error.substring(0, 100);
          history.struggleIndicators.repeatedErrors[key] = (history.struggleIndicators.repeatedErrors[key] || 0) + 1;
        }
      }

      saveHistory(history);

      // Show struggle warning if detected
      const struggle = history.struggleIndicators;
      if (state.iteration > 2 && (struggle.noProgressIterations >= 3 || struggle.shortIterations >= 3)) {
        console.log(`\n⚠️  Potential struggle detected:`);
        if (struggle.noProgressIterations >= 3) {
          console.log(`   - No file changes in ${struggle.noProgressIterations} iterations`);
        }
        if (struggle.shortIterations >= 3) {
          console.log(`   - ${struggle.shortIterations} very short iterations`);
        }
        console.log(`   💡 Tip: Use 'ralph --add-context "hint"' in another terminal to guide the agent`);
      }

      if (detectPlaceholderPluginError(combinedOutput) || detectSdkPlaceholderPluginError(combinedOutput)) {
        console.error(
          "\n❌ OpenCode tried to load the legacy 'ralph-wiggum' plugin. This package is CLI-only.",
        );
        console.error(
          "Remove 'ralph-wiggum' from your opencode.json plugin list, or re-run with --no-plugins.",
        );
        clearState();
        process.exit(1);
      }

      // Detect model configuration errors (Issues #22, #23)
      if (detectSdkModelNotFoundError(combinedOutput)) {
        console.error("\n❌ Model configuration error detected.");
        console.error("   The agent could not find a valid model to use.");
        console.error("\n   To fix this:");
        console.error("   1. Set a default model in ~/.config/opencode/opencode.json:");
        console.error('      { "model": "your-provider/model-name" }');
        console.error("   2. Or use the --model flag: ralph \"task\" --model provider/model");
        console.error("\n   See the OpenCode documentation for available models.");
        clearState();
        process.exit(1);
      }

      if (exitCode !== 0) {
        console.warn(`\n⚠️  OpenCode exited with code ${exitCode}. Continuing to next iteration.`);
      }

      const supervisorCfg = state.supervisor;
      if (supervisorCfg?.enabled) {
        if (!sdkClient) {
          console.warn("⚠️  Supervisor mode requires SDK client. Skipping supervisor run.");
        } else {
          console.log(`\n🕵️  Running supervisor${supervisorCfg.model ? ` / ${supervisorCfg.model}` : ""}...`);
          const supervisorResult = await runSupervisorOnce(state, supervisorCfg, history, combinedOutput, sdkClient);
        const lastRunAt = new Date().toISOString();
        state.supervisorState = {
          ...(state.supervisorState ?? { enabled: true, pausedForDecision: false }),
          enabled: true,
          lastRunAt,
          lastRunIteration: state.iteration,
        };

        if (!supervisorResult.ok) {
          console.warn(`⚠️  Supervisor failed: ${supervisorResult.error}`);
          appendSupervisorMemory(
            {
              iteration: state.iteration,
              summary: "Supervisor run failed",
              decision: supervisorResult.error ?? "unknown error",
              timestamp: lastRunAt,
            },
            supervisorCfg.memoryLimit,
          );
        } else if (supervisorResult.noAction) {
          console.log("✅ Supervisor: no action needed");
          appendSupervisorMemory(
            {
              iteration: state.iteration,
              summary: "No additional actions suggested",
              decision: "no_action",
              timestamp: lastRunAt,
            },
            supervisorCfg.memoryLimit,
          );
        } else if (supervisorResult.suggestion) {
          const suggestion: SupervisorSuggestion = {
            id: buildSupervisorSuggestionId(state.iteration),
            iteration: state.iteration,
            kind: supervisorResult.suggestion.kind,
            title: supervisorResult.suggestion.title,
            details: supervisorResult.suggestion.details,
            proposedChanges: supervisorResult.suggestion.proposedChanges,
            status: "pending",
            createdAt: lastRunAt,
          };
          const suggestionStore = loadSupervisorSuggestions();
          if (suggestionStore.parseError) {
            console.warn(`⚠️  Could not save suggestion: ${suggestionStore.parseError}`);
          } else {
            suggestionStore.suggestions.push(suggestion);
            saveSupervisorSuggestions(suggestionStore);
            console.log(`📌 Supervisor suggestion created: ${suggestion.id}`);
            console.log(`   Approve: ralph --approve-suggestion ${suggestion.id}`);
            console.log(`   Reject:  ralph --reject-suggestion ${suggestion.id}`);
            appendSupervisorMemory(
              {
                iteration: state.iteration,
                summary: `${suggestion.kind}: ${suggestion.title}`,
                decision: "pending_user_decision",
                timestamp: lastRunAt,
              },
              supervisorCfg.memoryLimit,
            );

            if (completionDetected) {
              state.supervisorState = {
                ...(state.supervisorState ?? { enabled: true, pausedForDecision: false }),
                enabled: true,
                pausedForDecision: true,
                pauseIteration: state.iteration,
                pauseReason: "completion_detected_with_pending_supervisor_suggestion",
                lastRunAt,
                lastRunIteration: state.iteration,
              };
              saveState(state);
              const decisionResult = await waitForSupervisorDecisionIfNeeded(state, state.iteration);
              if (decisionResult.approvedAppliedCount > 0) {
                shouldComplete = false;
                console.log("🔄 Supervisor-approved changes detected. Continuing loop instead of exiting.");
              } else {
                console.log("✅ All supervisor suggestions resolved without approved changes.");
              }
            }
          }
        }
      }
      }

      // Check for abort signal (early exit on precondition failure)
      if (abortDetected) {
        console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
        console.log(`║  ⛔ Abort signal detected: <promise>${abortPromise}</promise>`);
        console.log(`║  Loop aborted after ${state.iteration} iteration(s)`);
        console.log(`║  Total time: ${formatDurationLong(history.totalDurationMs)}`);
        console.log(`╚══════════════════════════════════════════════════════════════════╝`);
        clearState();
        clearHistory();
        clearContext();
        process.exit(1); // Exit with error code to indicate abort
      }

      // Check for task completion (tasks mode only)
      if (taskCompletionDetected && !completionDetected) {
        console.log(`\n🔄 Task completion detected: <promise>${taskPromise}</promise>`);
        console.log(`   Moving to next task in iteration ${state.iteration + 1}...`);
      }

      // Check for full completion
      if (shouldComplete) {
        if (state.iteration < minIterations) {
          // Completion detected but minimum iterations not reached
          console.log(`\n⏳ Completion promise detected, but minimum iterations (${minIterations}) not yet reached.`);
          console.log(`   Continuing to iteration ${state.iteration + 1}...`);
        } else {
          console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
          console.log(`║  ✅ Completion promise detected: <promise>${completionPromise}</promise>`);
          console.log(`║  Task completed in ${state.iteration} iteration(s)`);
          console.log(`║  Total time: ${formatDurationLong(history.totalDurationMs)}`);
          console.log(`╚══════════════════════════════════════════════════════════════════╝`);
          clearState();
          clearHistory();
          clearContext();
          break;
        }
      }

      // Clear context only if it was present at iteration start (preserve mid-iteration additions)
      if (contextAtStart) {
        console.log(`📝 Context was consumed this iteration`);
        clearContext();
      }

      // Auto-commit if enabled
      if (autoCommit) {
        try {
          // Check if there are changes to commit
          const status = await $`git status --porcelain`.text();
          if (status.trim()) {
            await $`git add -A`;
            await $`git commit -m "Ralph iteration ${state.iteration}: work in progress"`.quiet();
            console.log(`📝 Auto-committed changes`);
          }
        } catch {
          // Git commit failed, that's okay
        }
      }

      // Update state for next iteration
      state.iteration++;
      saveState(state);

      // Small delay between iterations
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`\n❌ Error in iteration ${state.iteration}:`, error);
      console.log("Continuing to next iteration...");

      // Track failed iteration in history to keep state/history in sync
      const iterationDuration = Date.now() - iterationStart;
      const errorRecord: IterationHistory = {
        iteration: state.iteration,
        startedAt: new Date(iterationStart).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: iterationDuration,
        model: currentModel,
        toolsUsed: {},
        filesModified: [],
        exitCode: -1,
        completionDetected: false,
        errors: [String(error).substring(0, 200)],
      };
      history.iterations.push(errorRecord);
      history.totalDurationMs += iterationDuration;
      saveHistory(history);

      state.iteration++;
      saveState(state);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Clean up SDK server on normal completion
  if (sdkClient) {
    try {
      console.log("🧹 Closing SDK server...");
      sdkClient.server.close();
    } catch {
      // Server may have already closed
    }
  }
}

if (import.meta.main) {
  // Run the loop
  runRalphLoop().catch(error => {
    console.error("Fatal error:", error);
    clearState();
    process.exit(1);
  });
}
}

/**
 * Supervisor Module
 *
 * Manages supervisor mode functionality including suggestions,
 * memory, and decision waiting.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import type { SdkClient } from "../sdk/client";
import { RalphState, RalphHistory, SupervisorConfig } from "../state/state";
import { loadContext, appendContext } from "../context/context";
import { appendTask } from "../tasks/tasks";
import {
  getStateDir,
  getSupervisorMemoryFilePath,
  getSupervisorSuggestionsFilePath,
  SUPERVISOR_MEMORY_SLICE,
  getSupervisorPollInterval,
  SUPERVISOR_TRUNCATION_CHARS,
} from "../config/config";
import { checkCompletion } from "../utils/utils";

export type SupervisorSuggestionKind = "add_task" | "add_context";
export type SupervisorSuggestionStatus = "pending" | "approved" | "applied" | "rejected" | "failed";

export interface SupervisorSuggestion {
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

export interface SupervisorSuggestionsStore {
  suggestions: SupervisorSuggestion[];
  parseError?: string;
}

export interface SupervisorMemoryEntry {
  iteration: number;
  summary: string;
  decision: string;
  timestamp: string;
}

export interface SupervisorRunResult {
  ok: boolean;
  noAction: boolean;
  suggestion?: Omit<SupervisorSuggestion, "id" | "status" | "createdAt">;
  rawOutput: string;
  error?: string;
}

export function loadSupervisorSuggestions(path?: string): SupervisorSuggestionsStore {
  const filePath = path ?? getSupervisorSuggestionsFilePath();
  if (!existsSync(filePath)) {
    return { suggestions: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.suggestions)) {
      return { suggestions: [] };
    }
    const suggestions = parsed.suggestions.filter((item: unknown) => item && typeof item === "object") as SupervisorSuggestion[];
    return { suggestions };
  } catch {
    return { suggestions: [], parseError: `Could not parse suggestions file at ${filePath}` };
  }
}

export function saveSupervisorSuggestions(store: SupervisorSuggestionsStore, path?: string): void {
  const dir = getStateDir();
  const filePath = path ?? getSupervisorSuggestionsFilePath();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(store, null, 2));
}

export function parseSupervisorMemory(path?: string): SupervisorMemoryEntry[] {
  const filePath = path ?? getSupervisorMemoryFilePath();
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf-8").trim();
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

export function saveSupervisorMemory(entries: SupervisorMemoryEntry[], path?: string): void {
  const dir = getStateDir();
  const filePath = path ?? getSupervisorMemoryFilePath();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
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
  writeFileSync(filePath, content);
}

export function appendSupervisorMemory(
  entry: SupervisorMemoryEntry,
  memoryLimit: number,
  path?: string,
): void {
  const filePath = path ?? getSupervisorMemoryFilePath();
  const existing = parseSupervisorMemory(filePath);
  const boundedLimit = Number.isFinite(memoryLimit) && memoryLimit > 0 ? Math.floor(memoryLimit) : 20;
  const next = [...existing, entry].slice(-boundedLimit);
  saveSupervisorMemory(next, filePath);
}

export function buildSupervisorSuggestionId(iteration: number): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `sup-${iteration}-${Date.now()}-${rand}`;
}

export function displaySupervisorSuggestions(store: SupervisorSuggestionsStore): void {
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

export function applyApprovedSuggestion(suggestion: SupervisorSuggestion): { ok: boolean; error?: string } {
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

export function truncateForPrompt(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 20))}\n...[truncated]`;
}

export function loadCustomSupervisorPromptTemplate(
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
  const tasksFilePath = require("../config/config").getTasksFilePath();
  const tasksContent = existsSync(tasksFilePath)
    ? readFileSync(tasksFilePath, "utf-8")
    : "";
  const memoryEntries = parseSupervisorMemory().slice(-SUPERVISOR_MEMORY_SLICE);
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

export function buildSupervisorPrompt(
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
  const tasksFilePath = require("../config/config").getTasksFilePath();
  const tasksContent = existsSync(tasksFilePath)
    ? readFileSync(tasksFilePath, "utf-8")
    : "(no tasks file)";
  const memoryEntries = parseSupervisorMemory().slice(-SUPERVISOR_MEMORY_SLICE);
  const memoryText = memoryEntries.length > 0
    ? memoryEntries.map(m => `- ${m.timestamp} (iteration ${m.iteration}): ${m.summary} | ${m.decision}`).join("\n")
    : "- no prior supervisor memory";
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

export function parseSupervisorOutput(
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

/**
 * Builds the supervisor prompt, executes it once via the SDK, and interprets the model output into a SupervisorRunResult.
 *
 * @param state - Current agent state (includes iteration and runtime context)
 * @param supervisorConfig - Supervisor configuration (model choice, promise markers for no-action and suggestions, etc.)
 * @param history - Interaction history to include in the prompt
 * @param coderOutput - Coder output to include in the supervisor prompt
 * @param sdkClient - SDK client used to execute the prompt
 * @returns A SupervisorRunResult describing the outcome:
 * - `ok`: `true` if the supervisor output was successfully parsed into a result, `false` on failure.
 * - `noAction`: `true` if the supervisor explicitly signaled that no action is required.
 * - `suggestion`: present when a valid supervisor suggestion was parsed.
 * - `rawOutput`: the raw text returned by the model.
 * - `error`: an error message when `ok` is `false`.
 */
async function runSupervisorOnce(
  state: RalphState,
  supervisorConfig: SupervisorConfig,
  history: RalphHistory,
  coderOutput: string,
  sdkClient: SdkClient,
): Promise<SupervisorRunResult> {
  try {
    const supervisorPrompt = buildSupervisorPrompt(state, supervisorConfig, coderOutput, history);

    const { executePrompt } = require("../sdk/executor");
    const result = await executePrompt(
      sdkClient.client,
      supervisorPrompt,
      supervisorConfig.model ?? undefined,
      undefined,
      {
        onEvent: (event: any) => {
        },
      },
    );

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
      await new Promise(r => setTimeout(r, getSupervisorPollInterval()));
      continue;
    }
    const pending = store.suggestions.filter(s => s.iteration === iteration && s.status === "pending");

    if (pending.length === 0) {
      const approvedApplied = store.suggestions.filter(
        s => s.iteration === iteration && (s.status === "approved" || s.status === "applied"),
      ).length;
      const { saveState, loadState: reloadState } = require("../state/state");
      const reloadedState = reloadState();
      if (reloadedState && reloadedState.supervisorState) {
        reloadedState.supervisorState.pausedForDecision = false;
        reloadedState.supervisorState.pauseIteration = undefined;
        reloadedState.supervisorState.pauseReason = undefined;
        saveState(reloadedState);
      }
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

    await new Promise(r => setTimeout(r, getSupervisorPollInterval()));
  }
}

export { runSupervisorOnce, waitForSupervisorDecisionIfNeeded };
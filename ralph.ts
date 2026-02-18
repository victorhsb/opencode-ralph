#!/usr/bin/env bun
/**
 * Ralph Wiggum Loop for AI agents
 *
 * Implementation of the Ralph Wiggum technique - continuous self-referential
 * AI loops for iterative development. Based on ghuntley.com/ralph/
 */

import { $ } from "bun";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Import SDK modules
import { createSdkClient, type SdkClient } from "./src/sdk/client";
import { executePrompt } from "./src/sdk/executor";

// Import internal modules
import {
  RalphState,
  RalphHistory,
  IterationHistory,
  SupervisorConfig,
  loadState,
  saveState,
  clearState,
  loadHistory,
  saveHistory,
  clearHistory,
  ensureStateDir,
} from "./src/state/state";
import {
  appendTask,
  loadTasks,
  ensureTasksFile,
  getTasksPath,
} from "./src/tasks/tasks";
import {
  appendContext,
  loadContext,
  clearContext as clearContextInternal,
} from "./src/context/context";
import {
  runSupervisorOnce,
  waitForSupervisorDecisionIfNeeded,
  buildSupervisorSuggestionId,
  appendSupervisorMemory,
  parseSupervisorOutput,
  saveSupervisorSuggestions,
  loadSupervisorSuggestions,
  type SupervisorSuggestion,
} from "./src/supervisor/supervisor";
import { buildPrompt } from "./src/prompts/prompts";
import {
  formatDurationLong,
  formatDuration,
  formatToolSummary,
  printIterationSummary,
  checkCompletion,
  extractErrors,
  detectPlaceholderPluginError,
  detectSdkPlaceholderPluginError,
  detectSdkModelNotFoundError,
} from "./src/utils/utils";
import {
  captureFileSnapshot,
  getModifiedFilesSinceSnapshot,
  type FileSnapshot,
} from "./src/fs-tracker/fs-tracker";

// CLI commands
import {
  handleStatusCommand,
  handleListSuggestionsCommand,
  handleApproveSuggestionCommand,
  handleRejectSuggestionCommand,
  handleAddContextCommand,
  handleClearContextCommand,
  handleListTasksCommand,
  handleAddTaskCommand,
  handleRemoveTaskCommand,
} from "./src/cli/commands";
import {
  parseArgs,
  displayHelp,
  RALPH_ARGS_SCHEMA,
} from "./src/cli/args";

// Get version from package.json
const VERSION = process.env.npm_package_version ||
  (existsSync(join(__dirname, "package.json"))
    ? JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8")).version
    : "2.0.1");

const tasksPath = getTasksPath();

// Parse arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  displayHelp(VERSION, RALPH_ARGS_SCHEMA);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(`ralph ${VERSION}`);
  process.exit(0);
}

// Handle commands
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

// Parse options
const parsed = parseArgs(args, RALPH_ARGS_SCHEMA);
if (parsed.errors.length > 0) {
  console.error("Error(s) parsing arguments:");
  for (const error of parsed.errors) {
    console.error(`  ${error}`);
  }
  console.error("\nRun 'ralph --help' for available options");
  process.exit(1);
}

let model = parsed.args.model as string;
let minIterations = parsed.args["min-iterations"] as number;
let maxIterations = parsed.args["max-iterations"] as number;
let completionPromise = parsed.args["completion-promise"] as string;
let abortPromise = parsed.args["abort-promise"] as string;
let tasksMode = parsed.args.tasks as boolean;
let taskPromise = parsed.args["task-promise"] as string;
let supervisorEnabled = parsed.args.supervisor as boolean;
let supervisorModel = parsed.args["supervisor-model"] as string;
let supervisorNoActionPromise = parsed.args["supervisor-no-action-promise"] as string;
let supervisorSuggestionPromise = parsed.args["supervisor-suggestion-promise"] as string;
let supervisorMemoryLimit = parsed.args["supervisor-memory-limit"] as number;
let supervisorPromptTemplatePath = parsed.args["supervisor-prompt-template"] as string;
let promptFile = parsed.args["prompt-file"] as string;
let promptTemplatePath = parsed.args["prompt-template"] as string;
let noStream = parsed.args["no-stream"] as boolean;
let verboseTools = parsed.args["verbose-tools"] as boolean;
let noCommit = parsed.args["no-commit"] as boolean;
let disablePlugins = parsed.args["no-plugins"] as boolean;
let allowAll = parsed.args["allow-all"] as boolean;
let noAllowAll = parsed.args["no-allow-all"] as boolean;

const autoCommit = !noCommit;
const streamOutput = !noStream;
const allowAllPermissions = allowAll && !noAllowAll;
const promptParts = parsed.promptParts;
let prompt = "";
let promptSource = "";

function readPromptFile(path: string): string {
  if (!existsSync(path)) {
    console.error(`Error: Prompt file not found: ${path}`);
    process.exit(1);
  }
  try {
    const stat = require("fs").statSync(path);
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

if (maxIterations > 0 && minIterations > maxIterations) {
  console.error(`Error: --min-iterations (${minIterations}) cannot be greater than --max-iterations (${maxIterations})`);
  process.exit(1);
}


// SDK iteration wrapper
interface SdkIterationOptions {
  client: SdkClient;
  prompt: string;
  model?: string;
  streamOutput: boolean;
  compactTools: boolean;
}

interface SdkIterationResult {
  output: string;
  toolCounts: Map<string, number>;
  exitCode: number;
  errors: string[];
}

async function executeSdkIteration(options: SdkIterationOptions): Promise<SdkIterationResult> {
  const { client, prompt, model, streamOutput, compactTools } = options;

  const toolCounts = new Map<string, number>();
  const errors: string[] = [];
  let output = "";

  let lastPrintedAt = Date.now();
  let lastToolSummaryAt = 0;
  const toolSummaryIntervalMs = 3000;
  const heartbeatIntervalMs = 10000;

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

        if (event.type === "tool_start" && event.toolName) {
          toolCounts.set(event.toolName, (toolCounts.get(event.toolName) ?? 0) + 1);
          if (compactTools) {
            maybePrintToolSummary();
          } else {
            console.log(`| ${event.type === "tool_start" ? `🔧 ${event.toolName}...` : ""}`);
          }
          lastPrintedAt = Date.now();
        }

        if (event.type === "text" && event.content) {
          process.stdout.write(event.content);
          lastPrintedAt = Date.now();
        }
      },
    });

    clearInterval(heartbeatTimer);
    process.stdout.write("\n");

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

// Main loop
async function runRalphLoop(): Promise<void> {
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
    console.log(`🔄 Resuming Ralph loop from ${require("./src/state/state").getStateDir()}`);
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

  if (tasksMode && !existsSync(tasksPath)) {
    ensureTasksFile();
    console.log(`📋 Created tasks file: ${tasksPath}`);
  }

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
  }

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

  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) {
      console.log("\nForce stopping...");
      process.exit(1);
    }
    stopping = true;
    console.log("\nGracefully stopping Ralph loop...");

    if (sdkClient) {
      try {
        console.log("🧹 Closing SDK server...");
        sdkClient.server.close();
      } catch {}
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
        clearContextInternal();
        return;
      }
    }
  }

  while (true) {
    if (maxIterations > 0 && state.iteration > maxIterations) {
      console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
      console.log(`║  Max iterations (${maxIterations}) reached. Loop stopped.`);
      console.log(`║  Total time: ${formatDurationLong(history.totalDurationMs)}`);
      console.log(`╚══════════════════════════════════════════════════════════════════╝`);
      clearState();
      break;
    }

    const iterInfo = maxIterations > 0 ? ` / ${maxIterations}` : "";
    const minInfo = minIterations > 1 && state.iteration < minIterations ? ` (min: ${minIterations})` : "";
    console.log(`\n🔄 Iteration ${state.iteration}${iterInfo}${minInfo}`);
    console.log("─".repeat(68));

    const contextAtStart = loadContext();

    const snapshotBefore = await captureFileSnapshot();

    let currentModel = state.model;

    const fullPrompt = buildPrompt(state, promptTemplatePath);
    const iterationStart = Date.now();

    let result = "";
    let stderr = "";
    let toolCounts = new Map<string, number>();
    let exitCode = 0;

    try {
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
          "\n❌ OpenCode tried to load legacy 'ralph-wiggum' plugin. This package is CLI-only.",
        );
        console.error(
          "Remove 'ralph-wiggum' from your opencode.json plugin list, or re-run with --no-plugins.",
        );
        clearState();
        process.exit(1);
      }

      if (detectSdkModelNotFoundError(combinedOutput)) {
        console.error("\n❌ Model configuration error detected.");
        console.error("   The agent could not find a valid model to use.");
        console.error("\n   To fix this:");
        console.error("   1. Set a default model in ~/.config/opencode/opencode.json:");
        console.error('      { "model": "your-provider/model-name" }');
        console.error("   2. Or use --model flag: ralph \"task\" --model provider/model");
        console.error("\n   See OpenCode documentation for available models.");
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

      if (abortDetected) {
        console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
        console.log(`║  ⛔ Abort signal detected: <promise>${abortPromise}</promise>`);
        console.log(`║  Loop aborted after ${state.iteration} iteration(s)`);
        console.log(`║  Total time: ${formatDurationLong(history.totalDurationMs)}`);
        console.log(`╚══════════════════════════════════════════════════════════════════╝`);
        clearState();
        clearHistory();
        clearContextInternal();
        process.exit(1);
      }

      if (taskCompletionDetected && !completionDetected) {
        console.log(`\n🔄 Task completion detected: <promise>${taskPromise}</promise>`);
        console.log(`   Moving to next task in iteration ${state.iteration + 1}...`);
      }

      if (shouldComplete) {
        if (state.iteration < minIterations) {
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
          clearContextInternal();
          break;
        }
      }

      if (contextAtStart) {
        console.log(`📝 Context was consumed this iteration`);
        clearContextInternal();
      }

      if (autoCommit) {
        try {
          const status = await $`git status --porcelain`.text();
          if (status.trim()) {
            await $`git add -A`;
            await $`git commit -m "Ralph iteration ${state.iteration}: work in progress"`.quiet();
            console.log(`📝 Auto-committed changes`);
          }
        } catch {}
      }

      state.iteration++;
      saveState(state);

      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`\n❌ Error in iteration ${state.iteration}:`, error);
      console.log("Continuing to next iteration...");

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

  if (sdkClient) {
    try {
      console.log("🧹 Closing SDK server...");
      sdkClient.server.close();
    } catch {}
  }
}

if (import.meta.main) {
  runRalphLoop().catch(error => {
    console.error("Fatal error:", error);
    clearState();
    process.exit(1);
  });
}

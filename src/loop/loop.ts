/**
 * Main Loop Module
 *
 * Handles the Ralph Wiggum iterative development loop.
 */

import { $ } from "bun";
import { existsSync } from "fs";
import type { SdkClient } from "../sdk/client";
import type {
  RalphState,
  RalphHistory,
  IterationHistory,
  SupervisorConfig,
} from "../state/state";
import {
  loadState,
  saveState,
  clearState,
  loadHistory,
  saveHistory,
  clearHistory,
  getStateDir,
} from "../state/state";
import {
  ensureTasksFile,
  getTasksPath,
} from "../tasks/tasks";
import {
  loadContext,
  clearContext as clearContextInternal,
} from "../context/context";
import {
  runSupervisorOnce,
  waitForSupervisorDecisionIfNeeded,
  buildSupervisorSuggestionId,
  appendSupervisorMemory,
  saveSupervisorSuggestions,
  loadSupervisorSuggestions,
  type SupervisorSuggestion,
} from "../supervisor/supervisor";
import { buildPrompt } from "../prompts/prompts";
import {
  formatDurationLong,
  formatDuration,
  printIterationSummary,
  checkCompletion,
  extractErrors,
  detectPlaceholderPluginError,
  detectSdkPlaceholderPluginError,
  detectSdkModelNotFoundError,
} from "../utils/utils";
import {
  captureFileSnapshot,
  getModifiedFilesSinceSnapshot,
} from "../fs-tracker/fs-tracker";
import { executeSdkIteration, type SdkIterationResult } from "./iteration";

export interface LoopOptions {
  prompt: string;
  promptTemplatePath: string;
  model: string;
  supervisorModel: string;
  supervisorEnabled: boolean;
  supervisorNoActionPromise: string;
  supervisorSuggestionPromise: string;
  supervisorMemoryLimit: number;
  supervisorPromptTemplatePath: string;
  minIterations: number;
  maxIterations: number;
  completionPromise: string;
  abortPromise: string;
  tasksMode: boolean;
  taskPromise: string;
  streamOutput: boolean;
  verboseTools: boolean;
  autoCommit: boolean;
  disablePlugins: boolean;
  allowAllPermissions: boolean;
  silent?: boolean;
  sdkClient: SdkClient;
}

export async function runRalphLoop(options: LoopOptions): Promise<void> {
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
    silent,
    sdkClient,
  } = options;

  const existingState = loadState();
  const resuming = !!existingState?.active;
  if (resuming) {
    console.log(`🔄 Resuming Ralph loop from ${getStateDir()}`);
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
    version: 1,
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

  const tasksPath = getTasksPath();
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
    if (initialModel) console.log(`Model: ${initialModel}`);
    if (supervisorConfig.enabled) {
      console.log(`Supervisor: ENABLED${supervisorConfig.model ? ` / ${supervisorConfig.model}` : ""}`);
    }
    if (options.disablePlugins) {
      console.log("OpenCode plugins: non-auth plugins disabled");
    }
    if (allowAllPermissions) console.log("Permissions: auto-approve all tools");
    console.log("");
    console.log("Starting loop... (Ctrl+C to stop)");
    console.log("═".repeat(68));
  }

  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) {
      console.log("\nForce stopping...");
      process.exit(1);
    }
    stopping = true;
    console.log("\nGracefully stopping Ralph loop...");

    try {
      console.log("🧹 Closing SDK server...");
      sdkClient.server.close();
    } catch {}

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

    try {
      console.log("🚀 Using OpenCode SDK for execution...");

      const sdkResult = await executeSdkIteration({
        client: sdkClient,
        prompt: fullPrompt,
        model: currentModel,
        streamOutput,
        compactTools: !verboseTools,
        silent,
      });

      const result = sdkResult.output;
      const toolCounts = sdkResult.toolCounts;
      const exitCode = sdkResult.exitCode;
      const stderr = sdkResult.errors.join("\n");

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

  try {
    console.log("🧹 Closing SDK server...");
    sdkClient.server.close();
  } catch {}
}

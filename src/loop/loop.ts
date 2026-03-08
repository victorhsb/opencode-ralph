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
  IterationVerificationRecord,
  VerificationState,
} from "../state/state";
import {
  loadState,
  saveState,
  clearState,
  loadHistory,
  saveHistory,
  clearHistory,
  getStateDir,
  configureStateStorage,
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
import { executeSdkIteration } from "./iteration";
import { runVerification, summarizeVerificationFailure, type VerificationReason } from "../verification/runner";
import { logger as console } from "../logger";
import { PerformanceTracker } from "../performance/tracker";

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
  debugEvents?: boolean;
  silent?: boolean;
  agent?: string;
  sdkClient: SdkClient;
  /** Whether to use structured output for completion detection (default: false for backward compatibility) */
  useStructuredOutput?: boolean;
  verificationCommands?: string[];
  verificationMode?: "on-claim" | "every-iteration";
  verificationTimeoutMs?: number;
  verificationFailFast?: boolean;
  verificationMaxOutputChars?: number;
  performanceTrackTokens?: boolean;
  performanceEstimateCost?: boolean;
  stateCompression?: boolean;
  stateMaxHistory?: number;
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
    debugEvents,
    silent,
    agent,
    sdkClient,
    verificationCommands = [],
    verificationMode = "on-claim",
    verificationTimeoutMs = 300000,
    verificationFailFast = true,
    verificationMaxOutputChars = 4000,
    performanceTrackTokens = true,
    performanceEstimateCost = true,
    stateCompression = false,
    stateMaxHistory = 100,
  } = options;

  configureStateStorage({
    compress: stateCompression,
    maxHistory: stateMaxHistory,
  });

  const performanceTracker = new PerformanceTracker({
    model,
    trackTokens: performanceTrackTokens,
    estimateCost: performanceEstimateCost,
  });
  let performanceSummaryLogged = false;
  const logPerformanceSummary = (): void => {
    if (performanceSummaryLogged) {
      return;
    }
    performanceTracker.logSummary();
    performanceSummaryLogged = true;
  };

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

  printLoopBanner();

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
    verification: buildInitialVerificationState(verificationCommands, verificationMode),
  };

  if (resuming && existingState) {
    state.supervisor = supervisorConfig;
    state.supervisorState = existingState.supervisorState ?? {
      enabled: supervisorConfig.enabled,
      pausedForDecision: false,
    };
    state.verification = resolveResumedVerificationState(
      existingState.verification,
      verificationCommands,
      verificationMode,
    );
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
    logLoopStartupSummary({
      prompt,
      completionPromise,
      tasksMode,
      taskPromise,
      minIterations,
      maxIterations,
      initialModel,
      ...(agent !== undefined && { agent }),
      supervisorConfig,
      ...(state.verification !== undefined && { verification: state.verification }),
      disablePlugins: options.disablePlugins,
      allowAllPermissions,
    });
  }

  registerSigintHandler(sdkClient);

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
        logPerformanceSummary();
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
      logPerformanceSummary();
      clearState();
      break;
    }

    const iterInfo = maxIterations > 0 ? ` / ${maxIterations}` : "";
    const minInfo = minIterations > 1 && state.iteration < minIterations ? ` (min: ${minIterations})` : "";
    console.log(`\n🔄 Iteration ${state.iteration}${iterInfo}${minInfo}`);
    console.log("═".repeat(68));

    const contextAtStart = loadContext();

    const snapshotBefore = await captureFileSnapshot();

    let currentModel = state.model;

    const fullPrompt = buildPrompt(state, promptTemplatePath);
    const iterationStart = Date.now();
    performanceTracker.startIteration(state.iteration);

    try {
      const sdkResult = await executeSdkIteration({
        client: sdkClient,
        prompt: fullPrompt,
        model: currentModel,
        streamOutput,
        compactTools: !verboseTools,
        useStructuredOutput: true,
        ...(debugEvents !== undefined && { debugEvents }),
        ...(agent !== undefined && { agent }),
        ...(silent !== undefined && { silent }),
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

      // Check structured output first (more reliable), then fall back to text parsing
      const completionDetected = sdkResult.structuredOutput?.completed === true ||
        (!sdkResult.structuredOutput && checkCompletion(combinedOutput, completionPromise));
      const abortDetected = abortPromise ? checkCompletion(combinedOutput, abortPromise) : false;
      const taskCompletionDetected = tasksMode ? checkCompletion(combinedOutput, taskPromise) : false;
      let shouldComplete = completionDetected;

      const iterationDuration = Date.now() - iterationStart;
      performanceTracker.endIteration(sdkResult.tokenUsage);

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
        structuredOutputUsed: !!sdkResult.structuredOutput,
      };

      const verificationReason = getVerificationReason({
        verificationEnabled: !!state.verification?.enabled && (state.verification?.commands.length ?? 0) > 0,
        verificationMode: state.verification?.mode ?? verificationMode,
        completionDetected,
        taskCompletionDetected,
      });

      let verificationRecord: IterationVerificationRecord | undefined;
      if (verificationReason && state.verification?.enabled && state.verification.commands.length > 0) {
        console.log(`\n🧪 Running verification (reason: ${verificationReason})...`);
        verificationRecord = await runVerification({
          commands: state.verification.commands,
          timeoutMs: verificationTimeoutMs,
          failFast: verificationFailFast,
          maxOutputChars: verificationMaxOutputChars,
          reason: verificationReason,
        });
        iterationRecord.verification = verificationRecord;
        logVerificationSummary(verificationRecord);
        updateVerificationStateAfterRun(state, verificationRecord, state.iteration);

        if (!verificationRecord.allPassed) {
          if (completionDetected) {
            shouldComplete = false;
            console.log("❌ Completion claim rejected: verification failed. Continuing loop.");
          } else if (taskCompletionDetected) {
            console.log("❌ Task completion claim rejected: verification failed. Continuing loop.");
          }
        }
      }

       recordIteration(history, iterationRecord, filesModified, errors, iterationDuration);
       saveHistory(history);
       maybeLogPotentialStruggle(state.iteration, history);
       handleKnownFatalOutputErrors(combinedOutput);

      if (exitCode !== 0) {
        console.warn(`\n⚠️  OpenCode exited with code ${exitCode}. Continuing to next iteration.`);
      }

       shouldComplete = await runSupervisorFlow({
         state,
         history,
         combinedOutput,
         sdkClient,
         shouldComplete,
       });

      if (abortDetected) {
        console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
        console.log(`║  ⛔ Abort signal detected: <promise>${abortPromise}</promise>`);
        console.log(`║  Loop aborted after ${state.iteration} iteration(s)`);
        console.log(`║  Total time: ${formatDurationLong(history.totalDurationMs)}`);
        console.log(`╚══════════════════════════════════════════════════════════════════╝`);
        logPerformanceSummary();
        clearState();
        clearHistory();
        clearContextInternal();
        process.exit(1);
      }

      if (taskCompletionDetected && !completionDetected && (!verificationRecord || verificationRecord.allPassed)) {
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
          logPerformanceSummary();
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

      await runAutoCommitIfEnabled(autoCommit, state.iteration);

      state.iteration++;
      saveState(state);

      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`\n❌ Error in iteration ${state.iteration}:`, error);
      console.log("Continuing to next iteration...");

      const iterationDuration = Date.now() - iterationStart;
      performanceTracker.endIteration();
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

  logPerformanceSummary();

}

function printLoopBanner(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    Ralph Wiggum Loop                            ║
║         Iterative AI Development with OpenCode                    ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

function logLoopStartupSummary(input: {
  prompt: string;
  completionPromise: string;
  tasksMode: boolean;
  taskPromise: string;
  minIterations: number;
  maxIterations: number;
  initialModel: string;
  agent?: string;
  supervisorConfig: SupervisorConfig;
  verification?: VerificationState;
  disablePlugins: boolean;
  allowAllPermissions: boolean;
}): void {
  const promptPreview = input.prompt.replace(/\s+/g, " ").substring(0, 80)
    + (input.prompt.length > 80 ? "..." : "");
  console.log(`Task: ${promptPreview}`);
  console.log(`Completion promise: ${input.completionPromise}`);
  if (input.tasksMode) {
    console.log("Tasks mode: ENABLED");
    console.log(`Task promise: ${input.taskPromise}`);
  }
  console.log(`Min iterations: ${input.minIterations}`);
  console.log(`Max iterations: ${input.maxIterations > 0 ? input.maxIterations : "unlimited"}`);
  if (input.initialModel) {
    console.log(`Model: ${input.initialModel}`);
  }
  if (input.agent) {
    console.log(`Agent: ${input.agent}`);
  }
  if (input.supervisorConfig.enabled) {
    console.log(`Supervisor: ENABLED${input.supervisorConfig.model ? ` / ${input.supervisorConfig.model}` : ""}`);
  }
  if (input.verification?.enabled && input.verification.commands.length > 0) {
    console.log(`Verification: ENABLED (${input.verification.mode})`);
    for (const command of input.verification.commands) {
      console.log(`  - ${command}`);
    }
  }
  if (input.disablePlugins) {
    console.log("OpenCode plugins: non-auth plugins disabled");
  }
  if (input.allowAllPermissions) {
    console.log("Permissions: auto-approve all tools");
  }
  console.log("");
  console.log("Starting loop... (Ctrl+C to stop)");
  console.log("═".repeat(68));
}

function registerSigintHandler(sdkClient: SdkClient): void {
  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) {
      console.log("\nForce stopping...");
      process.exit(1);
    }
    stopping = true;
    console.log("\nGracefully stopping Ralph loop...");

    try {
      sdkClient.server.close();
    } catch {
      // Ignore close errors during shutdown.
    }

    clearState();
    console.log("Loop cancelled.");
    process.exit(0);
  });
}

function recordIteration(
  history: RalphHistory,
  iterationRecord: IterationHistory,
  filesModified: string[],
  errors: string[],
  iterationDuration: number,
): void {
  history.iterations.push(iterationRecord);
  history.totalDurationMs += iterationDuration;

  history.struggleIndicators.noProgressIterations = filesModified.length === 0
    ? history.struggleIndicators.noProgressIterations + 1
    : 0;
  history.struggleIndicators.shortIterations = iterationDuration < 30000
    ? history.struggleIndicators.shortIterations + 1
    : 0;

  if (errors.length === 0) {
    history.struggleIndicators.repeatedErrors = {};
    return;
  }

  for (const error of errors) {
    const key = error.substring(0, 100);
    history.struggleIndicators.repeatedErrors[key] = (history.struggleIndicators.repeatedErrors[key] || 0) + 1;
  }
}

function maybeLogPotentialStruggle(iteration: number, history: RalphHistory): void {
  const struggle = history.struggleIndicators;
  if (iteration <= 2 || (struggle.noProgressIterations < 3 && struggle.shortIterations < 3)) {
    return;
  }

  console.log("\n⚠️  Potential struggle detected:");
  if (struggle.noProgressIterations >= 3) {
    console.log(`   - No file changes in ${struggle.noProgressIterations} iterations`);
  }
  if (struggle.shortIterations >= 3) {
    console.log(`   - ${struggle.shortIterations} very short iterations`);
  }
  console.log("   💡 Tip: Use 'ralph --add-context \"hint\"' in another terminal to guide the agent");
}

function handleKnownFatalOutputErrors(combinedOutput: string): void {
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

  if (!detectSdkModelNotFoundError(combinedOutput)) {
    return;
  }

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

async function runSupervisorFlow(input: {
  state: RalphState;
  history: RalphHistory;
  combinedOutput: string;
  sdkClient: SdkClient;
  shouldComplete: boolean;
}): Promise<boolean> {
  const supervisorCfg = input.state.supervisor;
  if (!supervisorCfg?.enabled) {
    return input.shouldComplete;
  }

  console.log(`\n🕵️  Running supervisor${supervisorCfg.model ? ` / ${supervisorCfg.model}` : ""}...`);
  const supervisorResult = await runSupervisorOnce(
    input.state,
    supervisorCfg,
    input.history,
    input.combinedOutput,
    input.sdkClient,
  );

  const lastRunAt = new Date().toISOString();
  input.state.supervisorState = {
    ...(input.state.supervisorState ?? { enabled: true, pausedForDecision: false }),
    enabled: true,
    lastRunAt,
    lastRunIteration: input.state.iteration,
  };

  if (!supervisorResult.ok) {
    console.warn(`⚠️  Supervisor failed: ${supervisorResult.error}`);
    appendSupervisorMemory(
      {
        iteration: input.state.iteration,
        summary: "Supervisor run failed",
        decision: supervisorResult.error ?? "unknown error",
        timestamp: lastRunAt,
      },
      supervisorCfg.memoryLimit,
    );
    return input.shouldComplete;
  }

  if (supervisorResult.noAction) {
    console.log("✅ Supervisor: no action needed");
    appendSupervisorMemory(
      {
        iteration: input.state.iteration,
        summary: "No additional actions suggested",
        decision: "no_action",
        timestamp: lastRunAt,
      },
      supervisorCfg.memoryLimit,
    );
    return input.shouldComplete;
  }

  if (!supervisorResult.suggestion) {
    return input.shouldComplete;
  }

  const suggestion: SupervisorSuggestion = {
    id: buildSupervisorSuggestionId(input.state.iteration),
    iteration: input.state.iteration,
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
    return input.shouldComplete;
  }

  suggestionStore.suggestions.push(suggestion);
  saveSupervisorSuggestions(suggestionStore);
  console.log(`📌 Supervisor suggestion created: ${suggestion.id}`);
  console.log(`   Approve: ralph --approve-suggestion ${suggestion.id}`);
  console.log(`   Reject:  ralph --reject-suggestion ${suggestion.id}`);
  appendSupervisorMemory(
    {
      iteration: input.state.iteration,
      summary: `${suggestion.kind}: ${suggestion.title}`,
      decision: "pending_user_decision",
      timestamp: lastRunAt,
    },
    supervisorCfg.memoryLimit,
  );

  if (!input.shouldComplete) {
    return input.shouldComplete;
  }

  input.state.supervisorState = {
    ...(input.state.supervisorState ?? { enabled: true, pausedForDecision: false }),
    enabled: true,
    pausedForDecision: true,
    pauseIteration: input.state.iteration,
    pauseReason: "completion_detected_with_pending_supervisor_suggestion",
    lastRunAt,
    lastRunIteration: input.state.iteration,
  };
  saveState(input.state);
  const decisionResult = await waitForSupervisorDecisionIfNeeded(input.state, input.state.iteration);
  if (decisionResult.approvedAppliedCount > 0) {
    console.log("🔄 Supervisor-approved changes detected. Continuing loop instead of exiting.");
    return false;
  }

  console.log("✅ All supervisor suggestions resolved without approved changes.");
  return input.shouldComplete;
}

async function runAutoCommitIfEnabled(autoCommit: boolean, iteration: number): Promise<void> {
  if (!autoCommit) {
    return;
  }

  try {
    const status = await $`git status --porcelain`.text();
    if (!status.trim()) {
      return;
    }

    await $`git add -A`;
    await $`git commit -m "Ralph iteration ${iteration}: work in progress"`.quiet();
    console.log("📝 Auto-committed changes");
  } catch {
    // Ignore auto-commit errors to avoid interrupting loop progress.
  }
}

function buildInitialVerificationState(
  commands: string[],
  mode: "on-claim" | "every-iteration",
): VerificationState | undefined {
  if (commands.length === 0) {
    return undefined;
  }

  return {
    enabled: true,
    mode,
    commands,
  };
}

function resolveResumedVerificationState(
  existing: VerificationState | undefined,
  commands: string[],
  mode: "on-claim" | "every-iteration",
): VerificationState | undefined {
  if (commands.length > 0) {
    return {
      ...(existing ?? {}),
      enabled: true,
      mode,
      commands,
    };
  }
  return existing;
}

function getVerificationReason(input: {
  verificationEnabled: boolean;
  verificationMode: "on-claim" | "every-iteration";
  completionDetected: boolean;
  taskCompletionDetected: boolean;
}): VerificationReason | null {
  if (!input.verificationEnabled) {
    return null;
  }

  if (input.verificationMode === "every-iteration") {
    return "every_iteration";
  }

  if (input.completionDetected) {
    return "completion_claim";
  }

  if (input.taskCompletionDetected) {
    return "task_completion_claim";
  }

  return null;
}

function updateVerificationStateAfterRun(
  state: RalphState,
  record: IterationVerificationRecord,
  iteration: number,
): void {
  if (!state.verification) {
    return;
  }

  state.verification.lastRunIteration = iteration;
  state.verification.lastRunPassed = record.allPassed;

  if (record.allPassed) {
    delete state.verification.lastFailureSummary;
    delete state.verification.lastFailureDetails;
    return;
  }

  const failure = summarizeVerificationFailure(record);
  state.verification.lastFailureSummary = failure.summary;
  state.verification.lastFailureDetails = failure.details;
}

function logVerificationSummary(record: IterationVerificationRecord): void {
  for (const step of record.steps) {
    const status = step.timedOut ? "TIMEOUT" : step.exitCode === 0 ? "PASS" : "FAIL";
    console.log(`   ${status} (${step.durationMs}ms): ${step.command}`);
  }

  if (record.allPassed) {
    console.log("✅ Verification passed");
  } else {
    console.log("❌ Verification failed");
  }
}

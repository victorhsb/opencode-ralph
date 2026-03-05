/**
 * Main Command Action Handler
 *
 * Handles the main ralph command execution including validation,
 * dry-run mode, and preparation for the main loop.
 */

import { existsSync } from "fs";
import type { Command } from "commander";
import { createSdkClient, closeSdkServer, type SdkClient, type SdkClientOptions } from "../../sdk/client";
import type { RalphState } from "../../state/state";
import { runRalphLoop, type LoopOptions } from "../../loop/loop";
import { readPromptFile } from "../../io/files";
import { buildPrompt } from "../../prompts/prompts";
import { checkAgentExists, formatAgentList } from "../../sdk/agents";
import type { VerificationState } from "../../state/state";
import {
  LoopError,
  SdkInitError,
  ValidationError,
  normalizeError,
} from "../../errors";
import { getUserFriendlyMessage } from "../../errors/messages";
import { loadRalphConfig, type Config } from "../../config/loader";
import { configureLogger, logger as console, type LogLevel } from "../../logger";

/**
 * Parsed and validated CLI options
 */
export interface MainCommandOptions {
  prompt?: string;
  file?: string;
  model?: string;
  agent?: string;
  logLevel?: LogLevel;
  logFile?: string;
  structuredLogs: boolean;
  minIterations: number;
  maxIterations: number;
  completionPromise: string;
  abortPromise?: string;
  tasks: boolean;
  taskPromise: string;
  supervisor: boolean;
  supervisorModel?: string;
  supervisorNoActionPromise: string;
  supervisorSuggestionPromise: string;
  supervisorMemoryLimit: number;
  supervisorPromptTemplate?: string;
  promptTemplate?: string;
  stream: boolean;
  verboseTools: boolean;
  commit: boolean;
  plugins: boolean;
  allowAll: boolean;
  allowAllExplicit: boolean;
  silent: boolean;
  dryRun: boolean;
  verify?: string[];
  verifyMode?: "on-claim" | "every-iteration";
  verifyTimeoutMs?: number;
  verifyFailFast?: boolean;
  verifyMaxOutputChars?: number;
  performance?: {
    trackTokens?: boolean;
    estimateCost?: boolean;
  };
  state?: {
    compress?: boolean;
    maxHistory?: number;
  };
}

/**
 * Main command action - handles parsing, validation, and execution
 */
export async function mainCommandAction(this: Command): Promise<void> {
  try {
    const thisCommand = this;
    const opts = thisCommand.opts<MainCommandOptions>();
    const loadedConfig = await loadRalphConfig();
    const resolvedOpts = mergeOptionsWithConfig(thisCommand, opts, loadedConfig.config);
    const promptParts = thisCommand.args;
    const loggerOptions: {
      level?: LogLevel;
      structured?: boolean;
      file?: string;
    } = {
      structured: resolvedOpts.structuredLogs,
    };

    if (resolvedOpts.logLevel !== undefined) {
      loggerOptions.level = resolvedOpts.logLevel;
    }

    if (resolvedOpts.logFile !== undefined) {
      loggerOptions.file = resolvedOpts.logFile;
    }

    configureLogger(loggerOptions);

    validateResolvedOptions(resolvedOpts);

    // Validate that either -p or -f is provided
    if (!resolvedOpts.prompt && !resolvedOpts.file && promptParts.length === 0) {
      throw new ValidationError(
        "No prompt provided. Usage: ralph \"Your task\" [options], ralph -p \"Your task\" [options], or ralph -f <prompt-file>."
      );
    }

    // Parse prompt from various sources
    let prompt = "";
    if (resolvedOpts.file) {
      // File option takes precedence
      prompt = readPromptFile(resolvedOpts.file);
    } else if (resolvedOpts.prompt) {
      // Explicit prompt option
      prompt = resolvedOpts.prompt;
    } else if (promptParts.length === 1 && existsSync(promptParts[0]!)) {
      // Single argument that is a file path
      prompt = readPromptFile(promptParts[0]!);
    } else {
      // Join remaining args as prompt
      prompt = promptParts.join(" ");
    }

    if (!prompt.trim()) {
      throw new ValidationError("No prompt provided or prompt file is empty.");
    }

    // Validate min/max iterations relationship
    if (resolvedOpts.maxIterations > 0 && resolvedOpts.minIterations > resolvedOpts.maxIterations) {
      throw new ValidationError(
        `--min-iterations (${resolvedOpts.minIterations}) cannot be greater than --max-iterations (${resolvedOpts.maxIterations}).`
      );
    }

    // Handle dry-run mode
    if (resolvedOpts.dryRun) {
      handleDryRun(resolvedOpts, prompt);
      return;
    }

    // Execute main workflow
    await executeMainWorkflow(resolvedOpts, prompt);
  } catch (error) {
    const normalized = normalizeError(error);
    const userMessage = getUserFriendlyMessage(normalized);
    console.error(`Error: ${userMessage}`);
    if (normalized.message !== userMessage) {
      console.error(`Details: ${normalized.message}`);
    }
    process.exit(1);
  }
}

function mergeOptionsWithConfig(
  command: Command,
  cliOptions: MainCommandOptions,
  config: Config,
): MainCommandOptions {
  const merged: MainCommandOptions = {
    ...cliOptions,
    allowAllExplicit: command.getOptionValueSource("allowAll") === "cli",
  };

  const keys: Array<keyof Config & string> = [
    "model",
    "agent",
    "logLevel",
    "logFile",
    "structuredLogs",
    "minIterations",
    "maxIterations",
    "completionPromise",
    "abortPromise",
    "tasks",
    "taskPromise",
    "supervisor",
    "supervisorModel",
    "supervisorNoActionPromise",
    "supervisorSuggestionPromise",
    "supervisorMemoryLimit",
    "supervisorPromptTemplate",
    "promptTemplate",
    "stream",
    "verboseTools",
    "commit",
    "plugins",
    "allowAll",
    "silent",
    "verify",
    "verifyMode",
    "verifyTimeoutMs",
    "verifyFailFast",
    "verifyMaxOutputChars",
    "performance",
    "state",
    "dryRun",
  ];

  for (const key of keys) {
    const source = command.getOptionValueSource(key);
    if (source !== "cli" && config[key] !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = config[key];
    }
  }

  return merged;
}

function validateResolvedOptions(opts: MainCommandOptions): void {
  if (!Number.isInteger(opts.supervisorMemoryLimit) || opts.supervisorMemoryLimit <= 0) {
    throw new ValidationError("--supervisor-memory-limit must be greater than 0");
  }

  if (!Number.isInteger(opts.minIterations) || opts.minIterations < 0) {
    throw new ValidationError("--min-iterations must be non-negative");
  }

  if (!Number.isInteger(opts.maxIterations) || opts.maxIterations < 0) {
    throw new ValidationError("--max-iterations must be non-negative");
  }

  if (opts.verifyMode !== undefined && !["on-claim", "every-iteration"].includes(String(opts.verifyMode))) {
    throw new ValidationError("--verify-mode must be one of: on-claim, every-iteration");
  }

  if (!Number.isInteger(opts.verifyTimeoutMs) || (opts.verifyTimeoutMs ?? 0) <= 0) {
    throw new ValidationError("--verify-timeout-ms must be greater than 0");
  }

  if (!Number.isInteger(opts.verifyMaxOutputChars) || (opts.verifyMaxOutputChars ?? 0) < 200) {
    throw new ValidationError("--verify-max-output-chars must be at least 200");
  }

  if (opts.logLevel !== undefined && !["DEBUG", "INFO", "WARN", "ERROR"].includes(opts.logLevel)) {
    throw new ValidationError("--log-level must be one of: DEBUG, INFO, WARN, ERROR");
  }
}

/**
 * Handle dry-run mode - prints the prompt without executing
 * @param opts - Command options
 * @param prompt - The prompt text
 */
function handleDryRun(opts: MainCommandOptions, prompt: string): void {
  const verification = buildVerificationStateFromOptions(opts);
  const state: RalphState = {
    version: 1,
    active: false,
    iteration: 1,
    minIterations: opts.minIterations,
    maxIterations: opts.maxIterations,
    completionPromise: opts.completionPromise,
    abortPromise: opts.abortPromise,
    tasksMode: opts.tasks,
    taskPromise: opts.taskPromise,
    prompt,
    promptTemplate: opts.promptTemplate,
    startedAt: new Date().toISOString(),
    model: opts.model || "",
    supervisor: {
      enabled: opts.supervisor,
      model: opts.supervisorModel || "",
      noActionPromise: opts.supervisorNoActionPromise,
      suggestionPromise: opts.supervisorSuggestionPromise,
      memoryLimit: opts.supervisorMemoryLimit,
      promptTemplate: opts.supervisorPromptTemplate,
    },
    supervisorState: {
      enabled: opts.supervisor,
      pausedForDecision: false,
    },
    verification,
  };

  const fullPrompt = buildPrompt(state, opts.promptTemplate);
  console.log("=== PROMPT THAT WOULD BE SENT ===");
  console.log(fullPrompt);
  console.log("\n=== END OF PROMPT ===");
  if (verification?.enabled) {
    console.log("\n=== VERIFICATION CONFIG ===");
    console.log(`Mode: ${verification.mode}`);
    for (const command of verification.commands) {
      console.log(`- ${command}`);
    }
  }
  process.exit(0);
}

/**
 * Execute the main Ralph workflow
 * @param opts - Command options
 * @param prompt - The prompt text
 */
async function executeMainWorkflow(opts: MainCommandOptions, prompt: string): Promise<void> {
  const verification = buildVerificationOptions(opts);
  let sdkClient: SdkClient | null = null;

  // Initialize SDK client
  try {
    console.log("🚀 Initializing OpenCode SDK...");

    // Determine permission mode
    const allowAllPermissions = opts.allowAll && !opts.allowAllExplicit;

    const sdkOptions: SdkClientOptions = {
      filterPlugins: !opts.plugins,
      allowAllPermissions,
    };
    if (opts.model !== undefined) {
      sdkOptions.model = opts.model;
    }
    sdkClient = await createSdkClient(sdkOptions);

    console.log(`✅ SDK client ready (${sdkClient.server.url})`);

    // Validate agent if specified
    if (opts.agent) {
      const agentCheck = await checkAgentExists(sdkClient.client, opts.agent);
      if (!agentCheck.valid) {
        throw new ValidationError(
          `${agentCheck.error}\nAvailable primary agents:\n${formatAgentList(agentCheck.availableAgents || [])}\nRun without --agent to use the default agent.`
        );
      }
      console.log(`🤖 Using agent: ${opts.agent}`);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new SdkInitError("SDK initialization failed.", error);
  }

  // Run the main loop
  try {
    const allowAllPermissions = opts.allowAll && !opts.allowAllExplicit;

    const loopOptions: LoopOptions = {
      prompt,
      promptTemplatePath: opts.promptTemplate ?? "",
      model: opts.model ?? "",
      supervisorModel: opts.supervisorModel ?? "",
      supervisorEnabled: opts.supervisor,
      supervisorNoActionPromise: opts.supervisorNoActionPromise,
      supervisorSuggestionPromise: opts.supervisorSuggestionPromise,
      supervisorMemoryLimit: opts.supervisorMemoryLimit,
      supervisorPromptTemplatePath: opts.supervisorPromptTemplate ?? "",
      minIterations: opts.minIterations,
      maxIterations: opts.maxIterations,
      completionPromise: opts.completionPromise,
      abortPromise: opts.abortPromise ?? "",
      tasksMode: opts.tasks,
      taskPromise: opts.taskPromise,
      streamOutput: opts.stream,
      verboseTools: opts.verboseTools,
      autoCommit: opts.commit,
      disablePlugins: !opts.plugins,
      allowAllPermissions,
      silent: opts.silent,
      sdkClient,
      verificationCommands: verification.commands,
      verificationMode: verification.mode,
      verificationTimeoutMs: verification.timeoutMs,
      verificationFailFast: verification.failFast,
      verificationMaxOutputChars: verification.maxOutputChars,
      performanceTrackTokens: opts.performance?.trackTokens ?? true,
      performanceEstimateCost: opts.performance?.estimateCost ?? true,
      stateCompression: opts.state?.compress ?? false,
      stateMaxHistory: opts.state?.maxHistory ?? 100,
    };
    if (opts.agent !== undefined) {
      loopOptions.agent = opts.agent;
    }
    await runRalphLoop(loopOptions);
  } catch (error) {
    throw new LoopError("Fatal error while running Ralph loop.", error);
  } finally {
    if (sdkClient) {
      try {
        await closeSdkServer(sdkClient.server, true);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

function buildVerificationOptions(opts: MainCommandOptions): {
  commands: string[];
  mode: "on-claim" | "every-iteration";
  timeoutMs: number;
  failFast: boolean;
  maxOutputChars: number;
} {
  const commands = Array.isArray(opts.verify)
    ? opts.verify.map((cmd) => cmd.trim()).filter(Boolean)
    : [];

  return {
    commands,
    mode: opts.verifyMode ?? "on-claim",
    timeoutMs: opts.verifyTimeoutMs ?? 300000,
    failFast: opts.verifyFailFast ?? true,
    maxOutputChars: opts.verifyMaxOutputChars ?? 4000,
  };
}

function buildVerificationStateFromOptions(opts: MainCommandOptions): VerificationState | undefined {
  const verification = buildVerificationOptions(opts);
  if (verification.commands.length === 0) {
    return undefined;
  }

  return {
    enabled: true,
    mode: verification.mode,
    commands: verification.commands,
  };
}

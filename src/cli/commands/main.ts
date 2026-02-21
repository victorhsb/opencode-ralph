/**
 * Main Command Action Handler
 *
 * Handles the main ralph command execution including validation,
 * dry-run mode, and preparation for the main loop.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { Command } from "commander";
import { createSdkClient, closeSdkServer, type SdkClient } from "../../sdk/client";
import type { RalphState } from "../../state/state";
import { runRalphLoop } from "../../loop/loop";
import { readPromptFile } from "../../io/files";
import { buildPrompt } from "../../prompts/prompts";
import { checkAgentExists, formatAgentList } from "../../sdk/agents";

/**
 * Parsed and validated CLI options
 */
export interface MainCommandOptions {
  prompt?: string;
  file?: string;
  model?: string;
  agent?: string;
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
  plugins: boolean;
  allowAll: boolean;
  allowAllExplicit: boolean;
  silent: boolean;
  dryRun: boolean;
}

/**
 * Main command action - handles parsing, validation, and execution
 */
export async function mainCommandAction(this: Command): Promise<void> {
  const thisCommand = this;
  const opts = thisCommand.opts<MainCommandOptions>();
  const promptParts = thisCommand.args;

  // Validate that either -p or -f is provided
  if (!opts.prompt && !opts.file && promptParts.length === 0) {
    console.error("Error: No prompt provided");
    console.error("Usage: ralph \"Your task description\" [options]");
    console.error("       ralph -p \"Your task description\" [options]");
    console.error("       ralph -f <prompt-file> [options]");
    console.error("Run 'ralph --help' for more information");
    process.exit(1);
  }

  // Parse prompt from various sources
  let prompt = "";
  let promptSource = "";

  if (opts.file) {
    // File option takes precedence
    promptSource = opts.file;
    prompt = readPromptFile(opts.file);
  } else if (opts.prompt) {
    // Explicit prompt option
    prompt = opts.prompt;
  } else if (promptParts.length === 1 && existsSync(promptParts[0])) {
    // Single argument that is a file path
    promptSource = promptParts[0];
    prompt = readPromptFile(promptParts[0]);
  } else {
    // Join remaining args as prompt
    prompt = promptParts.join(" ");
  }

  if (!prompt.trim()) {
    console.error("Error: No prompt provided or prompt file is empty");
    console.error("Usage: ralph \"Your task description\" [options]");
    console.error("Run 'ralph --help' for more information");
    process.exit(1);
  }

  // Validate min/max iterations relationship
  if (opts.maxIterations > 0 && opts.minIterations > opts.maxIterations) {
    console.error(
      `Error: --min-iterations (${opts.minIterations}) cannot be greater than --max-iterations (${opts.maxIterations})`
    );
    process.exit(1);
  }

  // Handle dry-run mode
  if (opts.dryRun) {
    handleDryRun(opts, prompt);
    return;
  }

  // Execute main workflow
  await executeMainWorkflow(opts, prompt);
}

/**
 * Handle dry-run mode - prints the prompt without executing
 * @param opts - Command options
 * @param prompt - The prompt text
 */
function handleDryRun(opts: MainCommandOptions, prompt: string): void {
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
  };

  const fullPrompt = buildPrompt(state, opts.promptTemplate);
  console.log("=== PROMPT THAT WOULD BE SENT ===");
  console.log(fullPrompt);
  console.log("\n=== END OF PROMPT ===");
  process.exit(0);
}

/**
 * Execute the main Ralph workflow
 * @param opts - Command options
 * @param prompt - The prompt text
 */
async function executeMainWorkflow(opts: MainCommandOptions, prompt: string): Promise<void> {
  let sdkClient: SdkClient | null = null;

  // Initialize SDK client
  try {
    console.log("🚀 Initializing OpenCode SDK...");

    // Determine permission mode
    const allowAllPermissions = opts.allowAll && !opts.allowAllExplicit;

    sdkClient = await createSdkClient({
      model: opts.model,
      filterPlugins: !opts.plugins,
      allowAllPermissions,
    });

    console.log(`✅ SDK client ready (${sdkClient.server.url})`);

    // Validate agent if specified
    if (opts.agent) {
      const agentCheck = await checkAgentExists(sdkClient.client, opts.agent);
      if (!agentCheck.valid) {
        console.error(`Error: ${agentCheck.error}`);
        console.error("\nAvailable primary agents:");
        console.error(formatAgentList(agentCheck.availableAgents || []));
        console.error("\nRun without --agent to use the default agent.");
        process.exit(1);
      }
      console.log(`🤖 Using agent: ${opts.agent}`);
    }
  } catch (error) {
    console.error("❌ Failed to initialize SDK client:", error);
    console.error("SDK initialization failed. Please ensure OpenCode is properly installed and configured.");
    process.exit(1);
  }

  // Run the main loop
  try {
    const allowAllPermissions = opts.allowAll && !opts.allowAllExplicit;

    await runRalphLoop({
      prompt,
      promptTemplatePath: opts.promptTemplate,
      model: opts.model,
      supervisorModel: opts.supervisorModel,
      supervisorEnabled: opts.supervisor,
      supervisorNoActionPromise: opts.supervisorNoActionPromise,
      supervisorSuggestionPromise: opts.supervisorSuggestionPromise,
      supervisorMemoryLimit: opts.supervisorMemoryLimit,
      supervisorPromptTemplatePath: opts.supervisorPromptTemplate,
      minIterations: opts.minIterations,
      maxIterations: opts.maxIterations,
      completionPromise: opts.completionPromise,
      abortPromise: opts.abortPromise,
      tasksMode: opts.tasks,
      taskPromise: opts.taskPromise,
      streamOutput: opts.stream,
      verboseTools: opts.verboseTools,
      disablePlugins: !opts.plugins,
      allowAllPermissions,
      silent: opts.silent,
      agent: opts.agent,
      sdkClient,
    });
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    if (sdkClient) {
      try {
        await closeSdkServer(sdkClient.server, 5000, true);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

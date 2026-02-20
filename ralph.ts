#!/usr/bin/env bun
/**
 * Ralph Wiggum Loop for AI agents
 *
 * Implementation of the Ralph Wiggum technique - continuous self-referential
 * AI loops for iterative development. Based on ghuntley.com/ralph/
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { createSdkClient, type SdkClient } from "./src/sdk/client";
import type { RalphState } from "./src/state/state";
import { runRalphLoop } from "./src/loop/loop";
import { readPromptFile } from "./src/io/files";

import { displayHelp, parseArgs, RALPH_ARGS_SCHEMA } from "./src/cli/args";
import { buildPrompt } from "./src/prompts/prompts";

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

const VERSION = process.env.npm_package_version ||
  (existsSync(join(__dirname, "package.json"))
    ? JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8")).version
    : "2.0.1");

const args = process.argv.slice(2);

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

const parsed = parseArgs(args, RALPH_ARGS_SCHEMA);
if (parsed.errors.length > 0) {
  console.error("Error(s) parsing arguments:");
  for (const error of parsed.errors) {
    console.error(`  ${error}`);
  }
  console.error("\nRun 'ralph --help' for available options");
  process.exit(1);
}

const model = parsed.args.model as string;
const minIterations = parsed.args["min-iterations"] as number;
const maxIterations = parsed.args["max-iterations"] as number;
const completionPromise = parsed.args["completion-promise"] as string;
const abortPromise = parsed.args["abort-promise"] as string;
const tasksMode = parsed.args.tasks as boolean;
const taskPromise = parsed.args["task-promise"] as string;
const supervisorEnabled = parsed.args.supervisor as boolean;
const supervisorModel = parsed.args["supervisor-model"] as string;
const supervisorNoActionPromise = parsed.args["supervisor-no-action-promise"] as string;
const supervisorSuggestionPromise = parsed.args["supervisor-suggestion-promise"] as string;
const supervisorMemoryLimit = parsed.args["supervisor-memory-limit"] as number;
const supervisorPromptTemplatePath = parsed.args["supervisor-prompt-template"] as string;
const promptFile = parsed.args["prompt-file"] as string;
const promptTemplatePath = parsed.args["prompt-template"] as string;
const noStream = parsed.args["no-stream"] as boolean;
const verboseTools = parsed.args["verbose-tools"] as boolean;
const noCommit = parsed.args["no-commit"] as boolean;
const disablePlugins = parsed.args["no-plugins"] as boolean;
const allowAll = parsed.args["allow-all"] as boolean;
const noAllowAll = parsed.args["no-allow-all"] as boolean;
const silent = parsed.args.silent as boolean;
const dryRun = parsed.args["dry-run"] as boolean;

const autoCommit = !noCommit;
const streamOutput = !noStream;
const allowAllPermissions = allowAll && !noAllowAll;
const promptParts = parsed.promptParts;

let prompt = "";
let promptSource = "";

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
  console.error("Error: No prompt provided");
  console.error("Usage: ralph \"Your task description\" [options]");
  console.error("Run 'ralph --help' for more information");
  process.exit(1);
}

if (maxIterations > 0 && minIterations > maxIterations) {
  console.error(`Error: --min-iterations (${minIterations}) cannot be greater than --max-iterations (${maxIterations})`);
  process.exit(1);
}

if (dryRun) {
  const state: RalphState = {
    version: 1,
    active: false,
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
    model,
    supervisor: {
      enabled: supervisorEnabled,
      model: supervisorModel,
      noActionPromise: supervisorNoActionPromise,
      suggestionPromise: supervisorSuggestionPromise,
      memoryLimit: supervisorMemoryLimit,
      promptTemplate: supervisorPromptTemplatePath || undefined,
    },
    supervisorState: {
      enabled: supervisorEnabled,
      pausedForDecision: false,
    },
  };
  const fullPrompt = buildPrompt(state, promptTemplatePath || undefined);
  console.log("=== PROMPT THAT WOULD BE SENT ===");
  console.log(fullPrompt);
  console.log("\n=== END OF PROMPT ===");
  process.exit(0);
}

async function main(): Promise<void> {
  let sdkClient: SdkClient | null = null;
  try {
    console.log("🚀 Initializing OpenCode SDK...");
    sdkClient = await createSdkClient({
      model: model || undefined,
      filterPlugins: disablePlugins,
      allowAllPermissions: allowAllPermissions,
    });
    console.log(`✅ SDK client ready (${sdkClient.server.url})`);
  } catch (error) {
    console.error("❌ Failed to initialize SDK client:", error);
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
      silent,
      sdkClient,
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
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

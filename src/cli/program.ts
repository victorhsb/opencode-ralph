/**
 * Commander Program Setup
 *
 * Main CLI program configuration with all global options and subcommands.
 */

import { Command } from "commander";
import { mainCommandAction } from "./commands/main";
import { registerStatusCommand } from "./commands/status";
import { registerTaskCommands } from "./commands/task";
import { registerContextCommands } from "./commands/context";
import { registerSuggestionCommands } from "./commands/suggestion";

/**
 * Create and configure the main Commander program
 * @returns Configured Command instance
 */
export function createProgram(): Command {
  const program = new Command();

  return configureProgram(program);
}

/**
 * Configure a Commander program instance with all options and subcommands
 * @param program - The Command instance to configure
 * @returns Configured Command instance
 */
function configureProgram(program: Command): Command {

  program
    .name("ralph")
    .description("Ralph Wiggum Loop - Iterative AI development with OpenCode")
    .version(process.env.npm_package_version || "2.0.1", "-v, --version");

  // Main options from RALPH_ARGS_SCHEMA
  program
    .option("-p, --prompt <text>", "Task description for the AI to work on")
    .option("-f, --file <path>", "Read prompt content from a file")
    .option("-m, --model <model>", "Model to use (e.g., anthropic/claude-sonnet-4)")
    .option("-a, --agent <agent>", "Agent to use for this session (primary agents only)")
    .option("-i, --min-iterations <n>", "Minimum iterations before completion allowed", parseInt, 1)
    .option("-x, --max-iterations <n>", "Maximum iterations before stopping (0 = unlimited)", parseInt, 0)
    .option("-c, --completion-promise <text>", "Phrase that signals completion", "COMPLETE")
    .option("-b, --abort-promise <text>", "Phrase that signals early abort (e.g., precondition failed)")
    .option("-t, --tasks", "Enable Tasks Mode for structured task tracking")
    .option("-k, --task-promise <text>", "Phrase that signals task completion", "READY_FOR_NEXT_TASK")
    .option("-s, --supervisor", "Enable post-iteration supervisor loop")
    .option("--supervisor-model <model>", "Supervisor model")
    .option("--supervisor-no-action-promise <text>", "Promise for no-op supervisor run", "NO_ACTION_NEEDED")
    .option("--supervisor-suggestion-promise <text>", "Promise when supervisor suggests change", "USER_DECISION_REQUIRED")
    .option("--supervisor-memory-limit <n>", "Number of supervisor memory entries to keep", parseInt, 20)
    .option("--supervisor-prompt-template <path>", "Custom prompt template for supervisor")
    .option("--prompt-template <path>", "Use custom prompt template (supports variables)")
    .option("-n, --no-stream", "Buffer output and print at the end")
    .option("--verbose-tools", "Print every tool line (disable compact tool summary)")
    .option("--no-commit", "Don't auto-commit after each iteration")
    .option("--no-plugins", "Disable non-auth OpenCode plugins for this run")
    .option("--allow-all", "Auto-approve all tool permissions")
    .option("--no-allow-all", "Require interactive permission prompts")
    .option("--silent", "Suppress tool execution details and other descriptive output")
    .option("--dry-run", "Print the prompt that would be sent and exit without running");

  // Custom validation hooks
  program.hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();

    // Validate supervisor-memory-limit
    if (opts.supervisorMemoryLimit !== undefined) {
      const limit = parseInt(String(opts.supervisorMemoryLimit), 10);
      if (isNaN(limit) || limit <= 0) {
        console.error("Error: --supervisor-memory-limit must be greater than 0");
        process.exit(1);
      }
    }

    // Validate min-iterations
    if (opts.minIterations !== undefined) {
      const min = parseInt(String(opts.minIterations), 10);
      if (isNaN(min) || min < 0) {
        console.error("Error: --min-iterations must be non-negative");
        process.exit(1);
      }
    }

    // Validate max-iterations
    if (opts.maxIterations !== undefined) {
      const max = parseInt(String(opts.maxIterations), 10);
      if (isNaN(max) || max < 0) {
        console.error("Error: --max-iterations must be non-negative");
        process.exit(1);
      }
    }
  });

  // Register subcommands
  registerStatusCommand(program);
  registerTaskCommands(program);
  registerContextCommands(program);
  registerSuggestionCommands(program);

  // Main action (when no subcommand is used)
  program.action(mainCommandAction);

  return program;
}

// Singleton program instance for direct import
export const program = createProgram();

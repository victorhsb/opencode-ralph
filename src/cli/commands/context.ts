/**
 * Context Subcommands
 *
 * Provides context management commands: add, clear.
 */

import type { Command } from "commander";
import {
  loadContext,
  getContextPath,
  appendContext,
  clearContext as clearContextFile,
} from "../../context/context";
import { loadState } from "../../state/state";
import { existsSync } from "fs";

/**
 * Register context subcommands
 * @param program - Commander program instance
 */
export function registerContextCommands(program: Command): void {
  const contextCommand = program
    .command("context")
    .description("Manage Ralph context for next iteration");

  // Add subcommand
  contextCommand
    .command("add <text>")
    .description("Add context text for the next iteration")
    .action(contextAddAction);

  // Clear subcommand
  contextCommand
    .command("clear")
    .description("Clear any pending context")
    .action(contextClearAction);
}

/**
 * Add context action
 * @param text - Context text to add
 */
export function contextAddAction(text: string): void {
  if (!text || text.trim() === "") {
    console.error("Error: Context text is required");
    console.error('Usage: ralph context add "Your context or hint here"');
    process.exit(1);
  }

  const trimmedText = text.trim();

  try {
    appendContext(trimmedText);

    const contextPath = getContextPath();
    console.log(`✅ Context added for next iteration`);
    console.log(`   File: ${contextPath}`);

    const state = loadState();
    if (state?.active) {
      console.log(`   Will be picked up in iteration ${state.iteration + 1}`);
    } else {
      console.log(`   Will be used when loop starts`);
    }
  } catch (error) {
    console.error("Error adding context:", error);
    process.exit(1);
  }
}

/**
 * Clear context action
 */
export function contextClearAction(): void {
  const contextPath = getContextPath();

  if (!existsSync(contextPath)) {
    console.log(`ℹ️  No pending context to clear`);
    return;
  }

  try {
    clearContextFile();
    console.log(`✅ Context cleared`);
  } catch (error) {
    console.error("Error clearing context:", error);
    process.exit(1);
  }
}

/**
 * Suggestion Subcommands
 *
 * Provides supervisor suggestion management commands: list, approve, reject.
 */

import type { Command } from "commander";
import {
  loadSupervisorSuggestions,
  displaySupervisorSuggestions,
  applyApprovedSuggestion,
  saveSupervisorSuggestions,
  type SupervisorSuggestionsStore,
  type SupervisorSuggestion,
} from "../../supervisor/supervisor";

/**
 * Register suggestion subcommands
 * @param program - Commander program instance
 */
export function registerSuggestionCommands(program: Command): void {
  const suggestionCommand = program
    .command("suggestion")
    .alias("suggestions")
    .description("Manage supervisor suggestions");

  // List subcommand
  suggestionCommand
    .command("list")
    .description("List all supervisor suggestions and their statuses")
    .action(suggestionListAction);

  // Approve subcommand
  suggestionCommand
    .command("approve <id>")
    .description("Approve and apply a pending supervisor suggestion")
    .action(suggestionApproveAction);

  // Reject subcommand
  suggestionCommand
    .command("reject <id>")
    .description("Reject a pending supervisor suggestion")
    .action(suggestionRejectAction);
}

/**
 * List suggestions action
 */
export function suggestionListAction(): void {
  const store = loadSupervisorSuggestions();

  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }

  displaySupervisorSuggestions(store);
}

/**
 * Approve suggestion action
 * @param id - Suggestion ID to approve
 */
export function suggestionApproveAction(id: string): void {
  if (!id || id.trim() === "") {
    console.error("Error: Suggestion ID is required");
    console.error("Usage: ralph suggestion approve <id>");
    process.exit(1);
  }

  const store = loadSupervisorSuggestions();

  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }

  const suggestion = findSuggestion(store, id);
  validateSuggestionPending(suggestion, id);

  // Approve and apply
  suggestion.status = "approved";
  suggestion.decidedAt = new Date().toISOString();

  const applied = applyApprovedSuggestion(suggestion);

  if (applied.ok) {
    suggestion.status = "applied";
    suggestion.appliedAt = new Date().toISOString();
    console.log(`✅ Suggestion ${id} approved and applied`);
  } else {
    suggestion.status = "failed";
    suggestion.error = applied.error;
    saveSupervisorSuggestions(store);
    console.error(`❌ Suggestion ${id} approved but failed to apply: ${applied.error}`);
    process.exit(1);
  }

  saveSupervisorSuggestions(store);
}

/**
 * Reject suggestion action
 * @param id - Suggestion ID to reject
 */
export function suggestionRejectAction(id: string): void {
  if (!id || id.trim() === "") {
    console.error("Error: Suggestion ID is required");
    console.error("Usage: ralph suggestion reject <id>");
    process.exit(1);
  }

  const store = loadSupervisorSuggestions();

  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }

  const suggestion = findSuggestion(store, id);
  validateSuggestionPending(suggestion, id);

  // Reject
  suggestion.status = "rejected";
  suggestion.decidedAt = new Date().toISOString();

  saveSupervisorSuggestions(store);
  console.log(`✅ Suggestion ${id} rejected`);
}

/**
 * Find a suggestion by ID
 * @param store - Suggestions store
 * @param id - Suggestion ID
 * @returns The found suggestion
 * @throws Exits process if not found
 */
function findSuggestion(store: SupervisorSuggestionsStore, id: string): SupervisorSuggestion {
  const suggestion = store.suggestions.find((s) => s.id === id);

  if (!suggestion) {
    console.error(`Error: Suggestion not found: ${id}`);
    process.exit(1);
  }

  return suggestion;
}

/**
 * Validate that a suggestion is in pending status
 * @param suggestion - The suggestion to validate
 * @param id - Suggestion ID for error message
 * @throws Exits process if not pending
 */
function validateSuggestionPending(suggestion: SupervisorSuggestion, id: string): void {
  if (suggestion.status !== "pending") {
    console.error(`Error: Suggestion ${id} is already ${suggestion.status}`);
    process.exit(1);
  }
}

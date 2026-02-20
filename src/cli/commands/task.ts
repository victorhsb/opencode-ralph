/**
 * Task Subcommands
 *
 * Provides task management commands: list, add, remove.
 */

import type { Command } from "commander";
import {
  loadTasks,
  displayTasksWithIndices,
  removeTask as removeTaskFromTasks,
  appendTask as appendTaskToTasks,
} from "../../tasks/tasks";
import { getTasksFilePath } from "../../config/config";
import { existsSync } from "fs";

/**
 * Register task subcommands
 * @param program - Commander program instance
 */
export function registerTaskCommands(program: Command): void {
  const taskCommand = program
    .command("task")
    .description("Manage Ralph tasks");

  // List subcommand
  taskCommand
    .command("list")
    .description("List all tasks with their indices")
    .action(taskListAction);

  // Add subcommand
  taskCommand
    .command("add <description>")
    .description("Add a new task to the list")
    .action(taskAddAction);

  // Remove subcommand
  taskCommand
    .command("remove <index>")
    .description("Remove task at the specified index (1-based)")
    .action(taskRemoveAction);
}

/**
 * List tasks action
 */
export function taskListAction(): void {
  const tasksPath = getTasksFilePath();

  if (!existsSync(tasksPath)) {
    console.log("No tasks file found. Use 'ralph task add \"description\"' to create your first task.");
    process.exit(0);
  }

  try {
    const tasks = loadTasks();
    displayTasksWithIndices(tasks);
  } catch (error) {
    console.error("Error reading tasks file:", error);
    process.exit(1);
  }
}

/**
 * Add task action
 * @param description - Task description
 */
export function taskAddAction(description: string): void {
  if (!description || description.trim() === "") {
    console.error("Error: Task description is required");
    console.error("Usage: ralph task add \"Task description\"");
    process.exit(1);
  }

  try {
    appendTaskToTasks(description.trim());
    console.log(`✅ Task added: "${description.trim()}"`);
  } catch (error) {
    console.error("Error adding task:", error);
    process.exit(1);
  }
}

/**
 * Remove task action
 * @param indexStr - Task index as string (1-based)
 */
export function taskRemoveAction(indexStr: string): void {
  const index = parseInt(indexStr, 10);

  if (isNaN(index) || index < 1) {
    console.error("Error: Task index must be a positive number");
    console.error("Usage: ralph task remove 3");
    process.exit(1);
  }

  const tasksPath = getTasksFilePath();

  if (!existsSync(tasksPath)) {
    console.error("Error: No tasks file found");
    process.exit(1);
  }

  try {
    removeTaskFromTasks(index);
    console.log(`✅ Removed task ${index} and its subtasks`);
  } catch (error) {
    console.error("Error removing task:", error);
    process.exit(1);
  }
}

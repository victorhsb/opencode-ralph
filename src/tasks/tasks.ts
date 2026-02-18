/**
 * Task Management Module
 *
 * Handles task tracking, parsing, and task mode functionality.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { RalphState } from "../state/state";
import { getStateDir, getTasksFilePath } from "../config/config";

export interface Task {
  text: string;
  status: "todo" | "in-progress" | "complete";
  subtasks: Task[];
  originalLine: string;
}

export function getTasksPath(): string {
  return getTasksFilePath();
}

export function ensureTasksFile(): void {
  const path = getTasksFilePath();
  const dir = getStateDir();
  if (!existsSync(path)) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, "# Ralph Tasks\n\nAdd your tasks below using: `ralph --add-task \"description\"`\n");
  }
}

export function loadTasks(): Task[] {
  const path = getTasksFilePath();
  if (!existsSync(path)) return [];

  try {
    const content = readFileSync(path, "utf-8");
    return parseTasks(content);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  const content = tasksToMarkdown(tasks);
  writeFileSync(getTasksFilePath(), content);
}

export function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split("\n");
  let currentTask: Task | null = null;

  for (const line of lines) {
    const topLevelMatch = line.match(/^- \[([ x\/])\]\s*(.+)/);
    if (topLevelMatch) {
      if (currentTask) {
        tasks.push(currentTask);
      }
      const [, statusChar, text] = topLevelMatch;
      let status: Task["status"] = "todo";
      if (statusChar === "x") status = "complete";
      else if (statusChar === "/") status = "in-progress";

      currentTask = { text, status, subtasks: [], originalLine: line };
      continue;
    }

    const subtaskMatch = line.match(/^\s+- \[([ x\/])\]\s*(.+)/);
    if (subtaskMatch && currentTask) {
      const [, statusChar, text] = subtaskMatch;
      let status: Task["status"] = "todo";
      if (statusChar === "x") status = "complete";
      else if (statusChar === "/") status = "in-progress";

      currentTask.subtasks.push({ text, status, subtasks: [], originalLine: line });
    }
  }

  if (currentTask) {
    tasks.push(currentTask);
  }

  return tasks;
}

export function tasksToMarkdown(tasks: Task[]): string {
  const lines: string[] = ["# Ralph Tasks", ""];

  for (const task of tasks) {
    const statusChar = task.status === "complete" ? "x" : task.status === "in-progress" ? "/" : " ";
    lines.push(`- [${statusChar}] ${task.text}`);

    for (const subtask of task.subtasks) {
      const subStatusChar = subtask.status === "complete" ? "x" : subtask.status === "in-progress" ? "/" : " ";
      lines.push(`  - [${subStatusChar}] ${subtask.text}`);
    }
  }

  return lines.join("\n") + "\n";
}

export function findCurrentTask(tasks: Task[]): Task | null {
  for (const task of tasks) {
    if (task.status === "in-progress") {
      return task;
    }
  }
  return null;
}

export function findNextTask(tasks: Task[]): Task | null {
  for (const task of tasks) {
    if (task.status === "todo") {
      return task;
    }
  }
  return null;
}

export function allTasksComplete(tasks: Task[]): boolean {
  return tasks.length > 0 && tasks.every(t => t.status === "complete");
}

export function appendTask(taskDescription: string): void {
  const stateDirPath = getStateDir();
  const tasksFilePath = getTasksFilePath();

  if (!existsSync(stateDirPath)) {
    mkdirSync(stateDirPath, { recursive: true });
  }

  let tasksContent = "";
  if (existsSync(tasksFilePath)) {
    tasksContent = readFileSync(tasksFilePath, "utf-8");
  } else {
    tasksContent = "# Ralph Tasks\n\n";
  }

  const newTaskContent = tasksContent.trimEnd() + "\n" + `- [ ] ${taskDescription}\n`;
  writeFileSync(tasksFilePath, newTaskContent);
}

export function removeTask(taskIndex: number): void {
  const tasksFilePath = getTasksFilePath();

  if (!existsSync(tasksFilePath)) {
    throw new Error("No tasks file found");
  }

  const tasksContent = readFileSync(tasksFilePath, "utf-8");
  const tasks = parseTasks(tasksContent);

  if (taskIndex < 1 || taskIndex > tasks.length) {
    throw new Error(`Task index ${taskIndex} is out of range (1-${tasks.length})`);
  }

  const lines = tasksContent.split("\n");
  const newLines: string[] = [];
  let inRemovedTask = false;
  let currentTaskLine = 0;

  for (const line of lines) {
    if (line.match(/^- \[/)) {
      currentTaskLine++;
      if (currentTaskLine === taskIndex) {
        inRemovedTask = true;
        continue;
      } else {
        inRemovedTask = false;
      }
    }

    if (inRemovedTask && line.match(/^\s+/) && line.trim() !== "") {
      continue;
    }

    newLines.push(line);
  }

  writeFileSync(tasksFilePath, newLines.join("\n"));
}

export function displayTasksWithIndices(tasks: Task[]): void {
  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  console.log("Current tasks:");
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const statusIcon = task.status === "complete" ? "✅" : task.status === "in-progress" ? "🔄" : "⏸️";
    console.log(`${i + 1}. ${statusIcon} ${task.text}`);

    for (const subtask of task.subtasks) {
      const subStatusIcon = subtask.status === "complete" ? "✅" : subtask.status === "in-progress" ? "🔄" : "⏸️";
      console.log(`   ${subStatusIcon} ${subtask.text}`);
    }
  }
}

export function getTasksModeSection(state: RalphState): string {
  const path = getTasksFilePath();
  if (!existsSync(path)) {
    return `
## TASKS MODE: Enabled (no tasks file found)

Create .ralph/ralph-tasks.md with your task list, or use \`ralph --add-task "description"\` to add tasks.
`;
  }

  try {
    const tasksContent = readFileSync(path, "utf-8");
    const tasks = parseTasks(tasksContent);
    const currentTask = findCurrentTask(tasks);
    const nextTask = findNextTask(tasks);

    let taskInstructions = "";
    if (currentTask) {
      taskInstructions = `
🔄 CURRENT TASK: "${currentTask.text}"
   Focus on completing this specific task.
   When done: Mark as [x] in .ralph/ralph-tasks.md and output <promise>${state.taskPromise}</promise>`;
    } else if (nextTask) {
      taskInstructions = `
📍 NEXT TASK: "${nextTask.text}"
   Mark as [/] in .ralph/ralph-tasks.md before starting.
   When done: Mark as [x] and output <promise>${state.taskPromise}</promise>`;
    } else if (allTasksComplete(tasks)) {
      taskInstructions = `
✅ ALL TASKS COMPLETE!
   Output <promise>${state.completionPromise}</promise> to finish.`;
    } else {
      taskInstructions = `
📋 No tasks found. Add tasks to .ralph/ralph-tasks.md or use \`ralph --add-task\``;
    }

    return `
## TASKS MODE: Working through task list

Current tasks from .ralph/ralph-tasks.md:
\`\`\`markdown
${tasksContent.trim()}
\`\`\`
${taskInstructions}

### Task Workflow
1. Find any task marked [/] (in progress). If none, pick the first [ ] task.
2. Mark the task as [/] in ralph-tasks.md before starting.
3. Complete the task.
4. Mark as [x] when verified complete.
5. Output <promise>${state.taskPromise}</promise> to move to the next task.
6. Only output <promise>${state.completionPromise}</promise> when ALL tasks are [x].

---
`;
  } catch {
    return `
## TASKS MODE: Error reading tasks file

Unable to read .ralph/ralph-tasks.md
`;
  }
}

/**
 * Task Management Tests
 *
 * Tests for task parsing, manipulation, and file operations.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  Task,
  parseTasks,
  tasksToMarkdown,
  findCurrentTask,
  findNextTask,
  allTasksComplete,
  displayTasksWithIndices,
} from "../tasks";
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getTasksFilePath, getStateDir } from "../../config/config";

describe("parseTasks", () => {
  test("parses empty task list", () => {
    const content = "# Tasks\n\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(0);
  });

  test("parses single todo task", () => {
    const content = "- [ ] Task 1\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe("Task 1");
    expect(tasks[0].status).toBe("todo");
    expect(tasks[0].subtasks).toHaveLength(0);
  });

  test("parses single in-progress task", () => {
    const content = "- [/] Task in progress\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe("Task in progress");
    expect(tasks[0].status).toBe("in-progress");
  });

  test("parses single complete task", () => {
    const content = "- [x] Task done\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe("Task done");
    expect(tasks[0].status).toBe("complete");
  });

  test("parses multiple tasks", () => {
    const content = "- [ ] Task 1\n- [x] Task 2\n- [/] Task 3\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(3);
    expect(tasks[0].status).toBe("todo");
    expect(tasks[1].status).toBe("complete");
    expect(tasks[2].status).toBe("in-progress");
  });

  test("parses task with subtasks", () => {
    const content = "- [ ] Main task\n  - [ ] Subtask 1\n  - [x] Subtask 2\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe("Main task");
    expect(tasks[0].subtasks).toHaveLength(2);
    expect(tasks[0].subtasks[0].text).toBe("Subtask 1");
    expect(tasks[0].subtasks[1].text).toBe("Subtask 2");
    expect(tasks[0].subtasks[0].status).toBe("todo");
    expect(tasks[0].subtasks[1].status).toBe("complete");
  });

  test("parses multiple tasks with subtasks", () => {
    const content = "- [ ] Task 1\n  - [ ] Sub 1.1\n- [x] Task 2\n  - [x] Sub 2.1\n  - [/] Sub 2.2\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].subtasks).toHaveLength(1);
    expect(tasks[1].subtasks).toHaveLength(2);
    expect(tasks[1].subtasks[1].status).toBe("in-progress");
  });

  test("ignores non-task lines", () => {
    const content = "# Tasks\n\nSome header\n- [ ] Real task\n\nAnother line\n- [x] Another task\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].text).toBe("Real task");
    expect(tasks[1].text).toBe("Another task");
  });

  test("handles task text with special characters", () => {
    const content = "- [ ] Task with (parentheses) and [brackets]\n- [/] Task with \"quotes\" and 'apostrophes'\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].text).toBe('Task with (parentheses) and [brackets]');
    expect(tasks[1].text).toBe('Task with "quotes" and \'apostrophes\'');
  });

  test("handles task text with colons and pipes", () => {
    const content = "- [ ] Task: with | separators\n- [x] Another: task|test\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].text).toBe("Task: with | separators");
    expect(tasks[1].text).toBe("Another: task|test");
  });

  test("preserves original line in task object", () => {
    const content = "- [ ] Original line\n";
    const tasks = parseTasks(content);

    expect(tasks[0].originalLine).toBe("- [ ] Original line");
  });

  test("handles empty lines between tasks", () => {
    const content = "- [ ] Task 1\n\n\n- [ ] Task 2\n";
    const tasks = parseTasks(content);

    expect(tasks).toHaveLength(2);
  });

  test("handles nested subtasks with multiple levels", () => {
    const content = "- [ ] Main\n  - [ ] Sub 1\n  - [ ] Sub 2\n";
    const tasks = parseTasks(content);

    expect(tasks[0].subtasks).toHaveLength(2);
    expect(tasks[0].subtasks[0].originalLine).toBe("  - [ ] Sub 1");
    expect(tasks[0].subtasks[1].originalLine).toBe("  - [ ] Sub 2");
  });
});

describe("tasksToMarkdown", () => {
  test("converts empty task list to markdown", () => {
    const tasks: Task[] = [];
    const markdown = tasksToMarkdown(tasks);

    expect(markdown).toContain("# Ralph Tasks");
  });

  test("converts single todo task", () => {
    const tasks: Task[] = [{ text: "Task 1", status: "todo", subtasks: [], originalLine: "- [ ] Task 1" }];
    const markdown = tasksToMarkdown(tasks);

    expect(markdown).toContain("- [ ] Task 1");
  });

  test("converts single in-progress task", () => {
    const tasks: Task[] = [{ text: "Task 1", status: "in-progress", subtasks: [], originalLine: "- [/] Task 1" }];
    const markdown = tasksToMarkdown(tasks);

    expect(markdown).toContain("- [/] Task 1");
  });

  test("converts single complete task", () => {
    const tasks: Task[] = [{ text: "Task 1", status: "complete", subtasks: [], originalLine: "- [x] Task 1" }];
    const markdown = tasksToMarkdown(tasks);

    expect(markdown).toContain("- [x] Task 1");
  });

  test("converts task with subtasks", () => {
    const tasks: Task[] = [
      {
        text: "Main task",
        status: "todo",
        subtasks: [
          { text: "Sub 1", status: "todo", subtasks: [], originalLine: "  - [ ] Sub 1" },
          { text: "Sub 2", status: "complete", subtasks: [], originalLine: "  - [x] Sub 2" },
        ],
        originalLine: "- [ ] Main task",
      },
    ];
    const markdown = tasksToMarkdown(tasks);

    expect(markdown).toContain("- [ ] Main task");
    expect(markdown).toContain("  - [ ] Sub 1");
    expect(markdown).toContain("  - [x] Sub 2");
  });

  test("converts multiple tasks with different statuses", () => {
    const tasks: Task[] = [
      { text: "Todo task", status: "todo", subtasks: [], originalLine: "- [ ] Todo task" },
      { text: "In-progress task", status: "in-progress", subtasks: [], originalLine: "- [/] In-progress task" },
      { text: "Complete task", status: "complete", subtasks: [], originalLine: "- [x] Complete task" },
    ];
    const markdown = tasksToMarkdown(tasks);

    expect(markdown).toContain("- [ ] Todo task");
    expect(markdown).toContain("- [/] In-progress task");
    expect(markdown).toContain("- [x] Complete task");
  });

  test("round-trips parse and convert", () => {
    const original = "- [ ] Task 1\n  - [ ] Sub 1.1\n- [x] Task 2\n";
    const tasks = parseTasks(original);
    const converted = tasksToMarkdown(tasks);

    expect(converted).toContain("- [ ] Task 1");
    expect(converted).toContain("  - [ ] Sub 1.1");
    expect(converted).toContain("- [x] Task 2");
  });
});

describe("findCurrentTask", () => {
  test("returns null when no in-progress task", () => {
    const tasks: Task[] = [
      { text: "Task 1", status: "todo", subtasks: [], originalLine: "- [ ] Task 1" },
      { text: "Task 2", status: "complete", subtasks: [], originalLine: "- [x] Task 2" },
    ];

    const result = findCurrentTask(tasks);
    expect(result).toBeNull();
  });

  test("returns in-progress task", () => {
    const tasks: Task[] = [
      { text: "Task 1", status: "todo", subtasks: [], originalLine: "- [ ] Task 1" },
      { text: "Task 2", status: "in-progress", subtasks: [], originalLine: "- [/] Task 2" },
      { text: "Task 3", status: "todo", subtasks: [], originalLine: "- [ ] Task 3" },
    ];

    const result = findCurrentTask(tasks);
    expect(result?.text).toBe("Task 2");
  });

  test("returns first in-progress task when multiple exist", () => {
    const tasks: Task[] = [
      { text: "Task 1", status: "in-progress", subtasks: [], originalLine: "- [/] Task 1" },
      { text: "Task 2", status: "in-progress", subtasks: [], originalLine: "- [/] Task 2" },
    ];

    const result = findCurrentTask(tasks);
    expect(result?.text).toBe("Task 1");
  });

  test("returns null for empty task list", () => {
    const tasks: Task[] = [];

    const result = findCurrentTask(tasks);
    expect(result).toBeNull();
  });
});

describe("findNextTask", () => {
  test("returns null when no todo task", () => {
    const tasks: Task[] = [
      { text: "Task 1", status: "in-progress", subtasks: [], originalLine: "- [/] Task 1" },
      { text: "Task 2", status: "complete", subtasks: [], originalLine: "- [x] Task 2" },
    ];

    const result = findNextTask(tasks);
    expect(result).toBeNull();
  });

  test("returns first todo task", () => {
    const tasks: Task[] = [
      { text: "Task 1", status: "complete", subtasks: [], originalLine: "- [x] Task 1" },
      { text: "Task 2", status: "todo", subtasks: [], originalLine: "- [ ] Task 2" },
      { text: "Task 3", status: "todo", subtasks: [], originalLine: "- [ ] Task 3" },
    ];

    const result = findNextTask(tasks);
    expect(result?.text).toBe("Task 2");
  });

  test("returns null for empty task list", () => {
    const tasks: Task[] = [];

    const result = findNextTask(tasks);
    expect(result).toBeNull();
  });
});

describe("allTasksComplete", () => {
  test("returns false for empty task list", () => {
    const tasks: Task[] = [];

    const result = allTasksComplete(tasks);
    expect(result).toBe(false);
  });

  test("returns false when some tasks are not complete", () => {
    const tasks: Task[] = [
      { text: "Task 1", status: "complete", subtasks: [], originalLine: "- [x] Task 1" },
      { text: "Task 2", status: "todo", subtasks: [], originalLine: "- [ ] Task 2" },
    ];

    const result = allTasksComplete(tasks);
    expect(result).toBe(false);
  });

  test("returns false when task is in-progress", () => {
    const tasks: Task[] = [
      { text: "Task 1", status: "complete", subtasks: [], originalLine: "- [x] Task 1" },
      { text: "Task 2", status: "in-progress", subtasks: [], originalLine: "- [/] Task 2" },
    ];

    const result = allTasksComplete(tasks);
    expect(result).toBe(false);
  });

  test("returns true when all tasks are complete", () => {
    const tasks: Task[] = [
      { text: "Task 1", status: "complete", subtasks: [], originalLine: "- [x] Task 1" },
      { text: "Task 2", status: "complete", subtasks: [], originalLine: "- [x] Task 2" },
    ];

    const result = allTasksComplete(tasks);
    expect(result).toBe(true);
  });
});

describe("displayTasksWithIndices", () => {
  let originalConsoleLog: typeof console.log;
  let logs: string[] = [];

  beforeEach(() => {
    logs = [];
    originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  test("displays message for empty task list", () => {
    const tasks: Task[] = [];
    displayTasksWithIndices(tasks);

    expect(logs).toContain("No tasks found.");
  });

  test("displays tasks with indices", () => {
    const tasks: Task[] = [
      { text: "Task 1", status: "todo", subtasks: [], originalLine: "- [ ] Task 1" },
      { text: "Task 2", status: "in-progress", subtasks: [], originalLine: "- [/] Task 2" },
      { text: "Task 3", status: "complete", subtasks: [], originalLine: "- [x] Task 3" },
    ];
    displayTasksWithIndices(tasks);

    expect(logs).toContain("1. ⏸️ Task 1");
    expect(logs).toContain("2. 🔄 Task 2");
    expect(logs).toContain("3. ✅ Task 3");
  });

  test("displays tasks with subtasks", () => {
    const tasks: Task[] = [
      {
        text: "Main task",
        status: "in-progress",
        subtasks: [
          { text: "Sub 1", status: "todo", subtasks: [], originalLine: "  - [ ] Sub 1" },
          { text: "Sub 2", status: "complete", subtasks: [], originalLine: "  - [x] Sub 2" },
        ],
        originalLine: "- [/] Main task",
      },
    ];
    displayTasksWithIndices(tasks);

    expect(logs).toContain("1. 🔄 Main task");
    expect(logs).toContain("   ⏸️ Sub 1");
    expect(logs).toContain("   ✅ Sub 2");
  });
});

describe("Task round-trip operations", () => {
  test("maintains data integrity through parse and convert", () => {
    const originalMarkdown = `# Ralph Tasks

- [ ] Task 1
  - [ ] Subtask 1.1
  - [x] Subtask 1.2
- [/] Task 2
  - [ ] Subtask 2.1
- [x] Task 3
`;

    const parsedTasks = parseTasks(originalMarkdown);
    const convertedMarkdown = tasksToMarkdown(parsedTasks);
    const reparsedTasks = parseTasks(convertedMarkdown);

    expect(parsedTasks.length).toBe(reparsedTasks.length);
    expect(parsedTasks[0].text).toBe(reparsedTasks[0].text);
    expect(parsedTasks[0].status).toBe(reparsedTasks[0].status);
    expect(parsedTasks[0].subtasks.length).toBe(reparsedTasks[0].subtasks.length);
  });

  test("handles complex task hierarchy", () => {
    const markdown = `# Ralph Tasks

- [ ] Parent 1
  - [x] Child 1.1
  - [/] Child 1.2
  - [ ] Child 1.3
- [x] Parent 2
- [/] Parent 3
  - [ ] Child 3.1
`;

    const tasks = parseTasks(markdown);

    expect(tasks).toHaveLength(3);
    expect(tasks[0].subtasks).toHaveLength(3);
    expect(tasks[0].subtasks[1].status).toBe("in-progress");
    expect(tasks[2].subtasks).toHaveLength(1);
  });
});

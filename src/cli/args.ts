/**
 * Argument Parser Module
 *
 * Declarative CLI argument parsing with validation and type conversion.
 */

export interface ArgConfig<T = string | boolean | number> {
  name: string;
  aliases?: string[];
  type: "string" | "boolean" | "number";
  required?: boolean;
  description?: string;
  default?: T;
  validate?: (value: T) => boolean | string;
}

export interface ParseResult<T extends Record<string, unknown>> {
  args: T;
  promptParts: string[];
  errors: string[];
}

type ArgMap = Map<string, ArgConfig>;

function buildArgMap(configs: ArgConfig[]): ArgMap {
  const map = new Map<string, ArgConfig>();
  for (const config of configs) {
    map.set(`--${config.name}`, config);
    if (config.aliases) {
      for (const alias of config.aliases) {
        map.set(alias, config);
      }
    }
  }
  return map;
}

function parseValue<T>(value: string, type: ArgConfig["type"], name: string): T {
  if (type === "boolean") {
    return (value === "true" || value === "1") as T;
  }
  if (type === "number") {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid number value for ${name}: ${value}`);
    }
    return parsed as T;
  }
  return value as T;
}

export function parseArgs<T extends Record<string, unknown>>(
  argList: string[],
  schema: ArgConfig[]
): ParseResult<T> {
  const argMap = buildArgMap(schema);
  const args: Partial<T> = {};
  const promptParts: string[] = [];
  const errors: string[] = [];

  const doubleDashIndex = argList.indexOf("--");
  const argsToProcess = doubleDashIndex !== -1 ? argList.slice(0, doubleDashIndex) : argList;

  let i = 0;
  while (i < argsToProcess.length) {
    const arg = argsToProcess[i];

    if (!arg.startsWith("-")) {
      promptParts.push(arg);
      i++;
      continue;
    }

    const config = argMap.get(arg);
    if (!config) {
      errors.push(`Unknown option: ${arg}`);
      i++;
      continue;
    }

    const key = config.name as keyof T;

    if (config.type === "boolean") {
      args[key] = true as T[keyof T];
      i++;
    } else {
      const nextArg = argsToProcess[i + 1];
      if (!nextArg) {
        errors.push(`Option ${arg} requires a value`);
        i++;
        continue;
      }

      try {
        args[key] = parseValue<T[keyof T]>(nextArg, config.type, arg);
        i += 2;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        i++;
      }
    }
  }

  for (const config of schema) {
    const key = config.name as keyof T;
    if (args[key] === undefined) {
      if (config.default !== undefined) {
        args[key] = config.default as T[keyof T];
      } else if (config.required) {
        errors.push(`Required option --${config.name} not provided`);
      }
    } else if (config.validate) {
      const validation = config.validate(args[key] as any);
      if (validation !== true) {
        errors.push(validation || `Invalid value for --${config.name}`);
      }
    }
  }

  return {
    args: args as T,
    promptParts,
    errors,
  };
}

export function displayHelp(version: string, schema: ArgConfig[]): void {
  const lines = [
    `Ralph Wiggum Loop - Iterative AI development with OpenCode`,
    ``,
    `Usage:`,
    `  ralph "<prompt>" [options]`,
    `  ralph --prompt-file <path> [options]`,
    ``,
    `Arguments:`,
    `  prompt              Task description for the AI to work on`,
    ``,
    `Options:`,
  ];

  for (const config of schema) {
    const aliases = config.aliases ? config.aliases.join(", ") : "";
    const flags = [aliases, `--${config.name}`].filter(Boolean).join(", ");
    const typeLabel = config.type === "boolean" ? "" : ` <${config.type}>`;
    const defaultLabel = config.default !== undefined ? ` (default: ${config.default})` : "";
    lines.push(`  ${flags}${typeLabel}    ${config.description || ""}${defaultLabel}`);
  }

  lines.push(
    ``,
    `Commands:`,
    `  --status            Show current Ralph loop status and history`,
    `  --status --tasks    Show status including current task list`,
    `  --add-context TEXT  Add context for the next iteration (or edit .ralph/ralph-context.md)`,
    `  --clear-context     Clear any pending context`,
    `  --list-tasks        Display the current task list with indices`,
    `  --add-task "desc"   Add a new task to the list`,
    `  --remove-task N     Remove task at index N (including subtasks)`,
    `  --list-suggestions  Show supervisor suggestions and statuses`,
    `  --approve-suggestion ID  Approve and apply a pending supervisor suggestion`,
    `  --reject-suggestion ID   Reject a pending supervisor suggestion`,
    ``,
    `Examples:`,
    `  ralph "Build a REST API for todos"`,
    `  ralph "Fix the auth bug" --max-iterations 10`,
    `  ralph "Add tests" --completion-promise "ALL TESTS PASS" --model anthropic/claude-sonnet-4`,
    `  ralph --prompt-file ./prompt.md --max-iterations 5`,
    `  ralph --status                                        # Check loop status`,
    `  ralph --add-context "Focus on the auth module first"  # Add hint for next iteration`,
    ``,
    `How it works:`,
    `  1. Sends your prompt to OpenCode via SDK`,
    `  2. OpenCode works on the task`,
    `  3. Checks output for completion promise`,
    `  4. If not complete, repeats with same prompt`,
    `  5. OpenCode sees its previous work in files`,
    `  6. Continues until promise detected or max iterations`,
    ``,
    `To stop manually: Ctrl+C`,
    ``,
    `Learn more: https://ghuntley.com/ralph/`,
    ``
  );

  console.log(lines.join("\n"));
}

export const RALPH_ARGS_SCHEMA: ArgConfig[] = [
  {
    name: "model",
    type: "string",
    description: "Model to use (e.g., anthropic/claude-sonnet-4)",
  },
  {
    name: "min-iterations",
    type: "number",
    description: "Minimum iterations before completion allowed",
    default: 1,
    validate: (val: number) => val >= 0 || "--min-iterations must be non-negative",
  },
  {
    name: "max-iterations",
    type: "number",
    description: "Maximum iterations before stopping (0 = unlimited)",
    default: 0,
    validate: (val: number) => val >= 0 || "--max-iterations must be non-negative",
  },
  {
    name: "completion-promise",
    type: "string",
    description: "Phrase that signals completion",
    default: "COMPLETE",
  },
  {
    name: "abort-promise",
    type: "string",
    description: "Phrase that signals early abort (e.g., precondition failed)",
  },
  {
    name: "tasks",
    aliases: ["-t"],
    type: "boolean",
    description: "Enable Tasks Mode for structured task tracking",
  },
  {
    name: "task-promise",
    type: "string",
    description: "Phrase that signals task completion",
    default: "READY_FOR_NEXT_TASK",
  },
  {
    name: "supervisor",
    type: "boolean",
    description: "Enable post-iteration supervisor loop",
  },
  {
    name: "supervisor-model",
    type: "string",
    description: "Supervisor model",
  },
  {
    name: "supervisor-no-action-promise",
    type: "string",
    description: "Promise for no-op supervisor run",
    default: "NO_ACTION_NEEDED",
  },
  {
    name: "supervisor-suggestion-promise",
    type: "string",
    description: "Promise when supervisor suggests change",
    default: "USER_DECISION_REQUIRED",
  },
  {
    name: "supervisor-memory-limit",
    type: "number",
    description: "Number of supervisor memory entries to keep",
    default: 20,
    validate: (val: number) => val > 0 || "--supervisor-memory-limit must be greater than 0",
  },
  {
    name: "supervisor-prompt-template",
    type: "string",
    description: "Custom prompt template for supervisor",
  },
  {
    name: "prompt-file",
    aliases: ["--file", "-f"],
    type: "string",
    description: "Read prompt content from a file",
  },
  {
    name: "prompt-template",
    type: "string",
    description: "Use custom prompt template (supports variables)",
  },
  {
    name: "no-stream",
    type: "boolean",
    description: "Buffer output and print at the end",
  },
  {
    name: "verbose-tools",
    type: "boolean",
    description: "Print every tool line (disable compact tool summary)",
  },
  {
    name: "no-commit",
    type: "boolean",
    description: "Don't auto-commit after each iteration",
  },
  {
    name: "no-plugins",
    type: "boolean",
    description: "Disable non-auth OpenCode plugins for this run",
  },
  {
    name: "allow-all",
    type: "boolean",
    description: "Auto-approve all tool permissions",
  },
  {
    name: "no-allow-all",
    type: "boolean",
    description: "Require interactive permission prompts",
  },
  {
    name: "silent",
    type: "boolean",
    description: "Suppress tool execution details and other descriptive output",
  },
  {
    name: "dry-run",
    type: "boolean",
    description: "Print the prompt that would be sent and exit without running",
  },
];

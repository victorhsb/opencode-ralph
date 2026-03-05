import { describe, expect, test } from "bun:test";
import { createProgram } from "../program";

describe("createProgram", () => {
  test("creates a program with correct name and description", () => {
    const program = createProgram();
    expect(program.name()).toBe("ralph");
    expect(program.description()).toBe(
      "Ralph Wiggum Loop - Iterative AI development with OpenCode",
    );
  });

  test("program has version flag", () => {
    const program = createProgram();
    const options = program.options;
    const versionOption = options.find((opt) => opt.short === "-v");
    expect(versionOption).toBeDefined();
    expect(versionOption?.long).toBe("--version");
  });
});

describe("program options", () => {
  test("has all expected global options defined", () => {
    const program = createProgram();
    const optionFlags = program.options.map((opt) => opt.long);

    expect(optionFlags).toContain("--prompt");
    expect(optionFlags).toContain("--file");
    expect(optionFlags).toContain("--model");
    expect(optionFlags).toContain("--agent");
    expect(optionFlags).toContain("--log-level");
    expect(optionFlags).toContain("--log-file");
    expect(optionFlags).toContain("--structured-logs");
    expect(optionFlags).toContain("--min-iterations");
    expect(optionFlags).toContain("--max-iterations");
    expect(optionFlags).toContain("--completion-promise");
    expect(optionFlags).toContain("--abort-promise");
    expect(optionFlags).toContain("--tasks");
    expect(optionFlags).toContain("--task-promise");
    expect(optionFlags).toContain("--supervisor");
    expect(optionFlags).toContain("--supervisor-model");
    expect(optionFlags).toContain("--supervisor-memory-limit");
    expect(optionFlags).toContain("--supervisor-no-action-promise");
    expect(optionFlags).toContain("--supervisor-suggestion-promise");
    expect(optionFlags).toContain("--supervisor-prompt-template");
    expect(optionFlags).toContain("--prompt-template");
    expect(optionFlags).toContain("--no-stream");
    expect(optionFlags).toContain("--verbose-tools");
    expect(optionFlags).toContain("--no-commit");
    expect(optionFlags).toContain("--no-plugins");
    expect(optionFlags).toContain("--allow-all");
    expect(optionFlags).toContain("--no-allow-all");
    expect(optionFlags).toContain("--silent");
    expect(optionFlags).toContain("--verify");
    expect(optionFlags).toContain("--verify-mode");
    expect(optionFlags).toContain("--verify-timeout-ms");
    expect(optionFlags).toContain("--no-verify-fail-fast");
    expect(optionFlags).toContain("--verify-max-output-chars");
    expect(optionFlags).toContain("--dry-run");
  });

  test("option short flags are configured correctly", () => {
    const program = createProgram();
    const options = program.options;

    const promptOpt = options.find((opt) => opt.long === "--prompt");
    expect(promptOpt?.short).toBe("-p");

    const fileOpt = options.find((opt) => opt.long === "--file");
    expect(fileOpt?.short).toBe("-f");

    const modelOpt = options.find((opt) => opt.long === "--model");
    expect(modelOpt?.short).toBe("-m");

    const agentOpt = options.find((opt) => opt.long === "--agent");
    expect(agentOpt?.short).toBe("-a");

    const minIterOpt = options.find((opt) => opt.long === "--min-iterations");
    expect(minIterOpt?.short).toBe("-i");

    const maxIterOpt = options.find((opt) => opt.long === "--max-iterations");
    expect(maxIterOpt?.short).toBe("-x");

    const completionOpt = options.find(
      (opt) => opt.long === "--completion-promise",
    );
    expect(completionOpt?.short).toBe("-c");

    const abortOpt = options.find((opt) => opt.long === "--abort-promise");
    expect(abortOpt?.short).toBe("-b");

    const tasksOpt = options.find((opt) => opt.long === "--tasks");
    expect(tasksOpt?.short).toBe("-t");

    const taskPromiseOpt = options.find((opt) => opt.long === "--task-promise");
    expect(taskPromiseOpt?.short).toBe("-k");

    const supervisorOpt = options.find((opt) => opt.long === "--supervisor");
    expect(supervisorOpt?.short).toBe("-s");

    const noStreamOpt = options.find((opt) => opt.long === "--no-stream");
    expect(noStreamOpt?.short).toBe("-n");
  });

  test("iteration options have parseInt as default value", () => {
    const program = createProgram();
    const options = program.options;

    const minIterOpt = options.find((opt) => opt.long === "--min-iterations");
    const maxIterOpt = options.find((opt) => opt.long === "--max-iterations");

    expect(minIterOpt?.defaultValue).toBe(1);
    expect(maxIterOpt?.defaultValue).toBe(0);
  });

  test("supervisor-memory-limit has correct default", () => {
    const program = createProgram();
    const options = program.options;

    const memLimitOpt = options.find(
      (opt) => opt.long === "--supervisor-memory-limit",
    );
    expect(memLimitOpt?.defaultValue).toBe(20);
  });

  test("completion-promise has correct default", () => {
    const program = createProgram();
    const options = program.options;

    const completionOpt = options.find(
      (opt) => opt.long === "--completion-promise",
    );
    expect(completionOpt?.defaultValue).toBe("COMPLETE");
  });

  test("task-promise has correct default", () => {
    const program = createProgram();
    const options = program.options;

    const taskPromiseOpt = options.find((opt) => opt.long === "--task-promise");
    expect(taskPromiseOpt?.defaultValue).toBe("READY_FOR_NEXT_TASK");
  });

  test("verify-mode has correct default", () => {
    const program = createProgram();
    const options = program.options;

    const verifyModeOpt = options.find((opt) => opt.long === "--verify-mode");
    expect(verifyModeOpt?.defaultValue).toBe("on-claim");
  });

  test("verify-timeout-ms has correct default", () => {
    const program = createProgram();
    const options = program.options;

    const verifyTimeoutOpt = options.find(
      (opt) => opt.long === "--verify-timeout-ms",
    );
    expect(verifyTimeoutOpt?.defaultValue).toBe(300000);
  });

  test("verify-max-output-chars has correct default", () => {
    const program = createProgram();
    const options = program.options;

    const verifyMaxCharsOpt = options.find(
      (opt) => opt.long === "--verify-max-output-chars",
    );
    expect(verifyMaxCharsOpt?.defaultValue).toBe(4000);
  });

  test("supervisor promises have correct defaults", () => {
    const program = createProgram();
    const options = program.options;

    const noActionPromiseOpt = options.find(
      (opt) => opt.long === "--supervisor-no-action-promise",
    );
    const suggestionPromiseOpt = options.find(
      (opt) => opt.long === "--supervisor-suggestion-promise",
    );

    expect(noActionPromiseOpt?.defaultValue).toBe("NO_ACTION_NEEDED");
    expect(suggestionPromiseOpt?.defaultValue).toBe("USER_DECISION_REQUIRED");
  });
});

describe("program subcommands", () => {
  test("has init subcommand", () => {
    const program = createProgram();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain("init");
  });

  test("has status subcommand", () => {
    const program = createProgram();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain("status");
  });

  test("has task subcommand", () => {
    const program = createProgram();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain("task");
  });

  test("has context subcommand", () => {
    const program = createProgram();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain("context");
  });

  test("has suggestion subcommand", () => {
    const program = createProgram();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain("suggestion");
  });

  test("init subcommand has expected options", () => {
    const program = createProgram();
    const initCmd = program.commands.find((cmd) => cmd.name() === "init");
    expect(initCmd).toBeDefined();

    const initOptions = initCmd!.options.map((opt) => opt.long);
    expect(initOptions).toContain("--force");
    expect(initOptions).toContain("--no-skill");
    expect(initOptions).toContain("--skills-scope");
  });

  test("status subcommand exists", () => {
    const program = createProgram();
    const statusCmd = program.commands.find((cmd) => cmd.name() === "status");
    expect(statusCmd).toBeDefined();
  });

  test("task subcommand has expected subcommands", () => {
    const program = createProgram();
    const taskCmd = program.commands.find((cmd) => cmd.name() === "task");
    expect(taskCmd).toBeDefined();

    const subcommands = taskCmd!.commands.map((cmd) => cmd.name());
    expect(subcommands).toContain("add");
    expect(subcommands).toContain("list");
    expect(subcommands).toContain("remove");
  });

  test("context subcommand has expected subcommands", () => {
    const program = createProgram();
    const contextCmd = program.commands.find((cmd) => cmd.name() === "context");
    expect(contextCmd).toBeDefined();

    const subcommands = contextCmd!.commands.map((cmd) => cmd.name());
    expect(subcommands).toContain("add");
    expect(subcommands).toContain("clear");
  });

  test("suggestion subcommand has expected subcommands", () => {
    const program = createProgram();
    const suggestionCmd = program.commands.find(
      (cmd) => cmd.name() === "suggestion",
    );
    expect(suggestionCmd).toBeDefined();

    const subcommands = suggestionCmd!.commands.map((cmd) => cmd.name());
    expect(subcommands).toContain("list");
    expect(subcommands).toContain("approve");
    expect(subcommands).toContain("reject");
  });
});

describe("program configuration", () => {
  test("verify option is defined and optional", () => {
    const program = createProgram();
    const verifyOpt = program.options.find((opt) => opt.long === "--verify");
    expect(verifyOpt).toBeDefined();
    // Verify option uses a custom collector function for multiple values
    expect(verifyOpt?.long).toBe("--verify");
  });

  test("negated boolean options are configured", () => {
    const program = createProgram();
    const options = program.options;

    const noStreamOpt = options.find((opt) => opt.long === "--no-stream");
    const noCommitOpt = options.find((opt) => opt.long === "--no-commit");
    const noPluginsOpt = options.find((opt) => opt.long === "--no-plugins");
    const noAllowAllOpt = options.find((opt) => opt.long === "--no-allow-all");
    const noVerifyFailFastOpt = options.find(
      (opt) => opt.long === "--no-verify-fail-fast",
    );

    expect(noStreamOpt).toBeDefined();
    expect(noCommitOpt).toBeDefined();
    expect(noPluginsOpt).toBeDefined();
    expect(noAllowAllOpt).toBeDefined();
    expect(noVerifyFailFastOpt).toBeDefined();
  });
});

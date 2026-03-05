# Prompt Builder Module

Constructs dynamic prompts for Ralph Loop iterations using composable sections.

## Overview

The prompt builder takes a `RalphState` and produces a complete prompt string. It supports two modes:
- **Regular mode**: Single task until completion
- **Tasks mode**: Work through a task list sequentially

## Architecture

Prompts are built from 12 small section functions + 2 mode builders:

```
RalphState → buildPrompt → buildTasksModePrompt / buildRegularPrompt → sections
```

## Prompt Sections

| Section | Function | Description |
|---------|----------|-------------|
| Header | `buildHeader` | Iteration title, e.g., `# Ralph Wiggum Loop - Iteration 3` |
| Iteration Info | `buildIterationInfo` | Current position in min/max bounds |
| Mode Intro | `buildTasksModeIntro` / `buildRegularModeIntro` | Sets context for the mode |
| Context | `buildContextSection` | User-added mid-loop context from `.ralph/context.md` |
| Task List | `getTasksModeSection` | Full task list with current task (tasks mode only) |
| Task Content | `buildPromptTaskSection` / `buildMainTaskSection` | User's prompt |
| Output Format | `buildOutputFormatSection` | JSON fields: completed, reasoning, output |
| Instructions | `buildInstructionsSection` | Step-by-step workflow (regular mode only) |
| Critical Rules | `buildCriticalRules` | Rules for completion and promise tags |
| Footer | `buildFooter` | Closing encouragement and mode reminder |

## Section Order

### Tasks Mode
1. Header
2. Tasks mode intro
3. Context
4. Task list (from tasks.ts)
5. Main goal
6. Output format
7. Critical rules (tasks-specific)
8. Iteration info
9. Footer

### Regular Mode
1. Header
2. Iteration info
3. Regular mode intro
4. Context
5. Task
6. Output format
7. Instructions
8. Critical rules
9. Footer

## Exported Functions

### `buildPrompt(state, promptTemplatePath?)`
Main entry point. Returns the complete prompt for the current iteration.

### `loadCustomPromptTemplate(templatePath, state)`
Loads a custom template file with variable substitution.

## Custom Templates

Use `--prompt-template` flag to provide a custom template:

```bash
ralph "Your task" --prompt-template /path/to/template.md
```

### Template Variables

| Variable | Replacement |
|----------|-------------|
| `{{iteration}}` | Current iteration number |
| `{{max_iterations}}` | Max iterations or "unlimited" |
| `{{min_iterations}}` | Minimum iterations |
| `{{prompt}}` | User's main prompt |
| `{{completion_promise}}` | Promise tag for completion |
| `{{abort_promise}}` | Promise tag for abort |
| `{{task_promise}}` | Promise for individual task |
| `{{context}}` | User context |
| `{{tasks}}` | Tasks file content |

## Integration

| Module | Purpose |
|--------|---------|
| `src/state/state.ts` | RalphState input |
| `src/context/context.ts` | User context loading |
| `src/tasks/tasks.ts` | Task list rendering |
| `src/config/config.ts` | Task file paths |
# Ralph CLI Command Reference

Complete reference for all Ralph CLI commands and options.

## Commands Overview

```
ralph [command] [options]
```

### Main Commands

| Command | Description |
|---------|-------------|
| `ralph "<prompt>"` | Run the main Ralph loop |
| `ralph init` | Initialize Ralph in current directory |
| `ralph task` | Task management subcommands |
| `ralph --status` | Show active loop status |
| `ralph --add-context` | Add context for next iteration |
| `ralph --clear-context` | Clear pending context |

---

## ralph init

Initialize Ralph in the current project directory.

```bash
ralph init [options]
```

**Options:**
- `--force` - Overwrite existing `.ralph/` directory
- `--template <name>` - Use specific template (basic, advanced, empty)

**Creates:**
- `.ralph/` directory
- `.ralph/ralph-tasks.md` - Task file
- `.ralph/ralph-context.md` - Context file
- Updates `.gitignore` to exclude `.ralph/`

**Example:**
```bash
ralph init
ralph init --force
```

---

## ralph "<prompt>"

Run the main Ralph loop with a task prompt.

```bash
ralph "<your task description>" [options]
```

**Options:**

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--prompt <text>` | `-p` | - | Task description |
| `--file <path>` | `-f` | - | Read prompt from file |
| `--model <model>` | `-m` | - | Model to use (e.g., anthropic/claude-sonnet-4) |
| `--agent <agent>` | `-a` | - | Agent to use |
| `--min-iterations <n>` | `-i` | 1 | Minimum iterations before completion |
| `--max-iterations <n>` | `-x` | 0 | Maximum iterations (0 = unlimited) |
| `--completion-promise <text>` | `-c` | COMPLETE | Text signaling completion |
| `--abort-promise <text>` | `-b` | - | Text signaling early abort |
| `--tasks` | `-t` | false | Enable Tasks Mode |
| `--task-promise <text>` | `-k` | READY_FOR_NEXT_TASK | Text signaling task completion |
| `--supervisor` | `-s` | false | Enable supervisor mode |
| `--supervisor-model <model>` | - | - | Supervisor model |
| `--supervisor-no-action-promise <text>` | - | NO_ACTION_NEEDED | Supervisor no-op signal |
| `--supervisor-suggestion-promise <text>` | - | USER_DECISION_REQUIRED | Supervisor suggestion signal |
| `--supervisor-memory-limit <n>` | - | 20 | Supervisor memory entries limit |
| `--prompt-template <path>` | - | - | Custom prompt template |
| `--no-stream` | `-n` | false | Buffer output, print at end |
| `--verbose-tools` | - | false | Print every tool line |
| `--no-commit` | - | false | Skip auto-commit |
| `--allow-all` | - | true | Auto-approve permissions |
| `--no-allow-all` | - | false | Require permission prompts |
| `--silent` | - | false | Suppress tool details |
| `--dry-run` | - | false | Print prompt and exit |

**Examples:**

```bash
# Basic run
ralph "Build a REST API" --max-iterations 20

# With model
ralph "Build a REST API" --model anthropic/claude-sonnet-4 --max-iterations 20

# With tasks mode
ralph "Build a REST API" --tasks --max-iterations 20

# With supervisor
ralph "Build a REST API" --supervisor --max-iterations 20

# From file
ralph -f ./prompt.md --max-iterations 10

# Dry run
ralph "Build a REST API" --dry-run
```

---

## ralph task

Task management commands.

### ralph task list

List all tasks with indices.

```bash
ralph task list
```

Shows:
- Task number (index)
- Status icon (⏸️ 🔄 ✅)
- Task description
- Subtasks

### ralph task add

Add a new task.

```bash
ralph task add "<task description>"
```

**Example:**
```bash
ralph task add "Implement user authentication"
ralph task add "Add database migrations"
```

### ralph task remove

Remove a task by index.

```bash
ralph task remove <index>
```

**Example:**
```bash
ralph task remove 3
```

---

## ralph --status

Show status of active Ralph loop.

```bash
ralph --status
```

**Displays:**
- Active loop info (iteration, elapsed time, prompt)
- Pending context
- Current tasks (if tasks mode)
- Iteration history
- Struggle indicators

---

## ralph --add-context

Add context/hints for the next iteration.

```bash
ralph --add-context "<hint text>"
```

**Example:**
```bash
ralph --add-context "Focus on fixing the auth module first"
ralph --add-context "The bug is in utils/parser.ts line 42"
```

Context is automatically consumed after one iteration.

---

## ralph --clear-context

Clear pending context.

```bash
ralph --clear-context
```

---

## ralph --list-suggestions

List supervisor suggestions.

```bash
ralph --list-suggestions
```

---

## ralph --approve-suggestion

Approve and apply a supervisor suggestion.

```bash
ralph --approve-suggestion <id>
```

---

## ralph --reject-suggestion

Reject a supervisor suggestion.

```bash
ralph --reject-suggestion <id>
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RALPH_SUPERVISOR_POLL_INTERVAL` | Override supervisor poll interval (ms) |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (validation, execution, etc.) |
| 130 | Interrupted (Ctrl+C) |

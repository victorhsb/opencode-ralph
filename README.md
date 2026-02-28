<p align="center">
  <h1 align="center">Open Ralph Wiggum</h1>
  <h3 align="center">Autonomous Agentic Loop for OpenCode</h3>
</p>

<p align="center">
  <em>Works exclusively with <b>OpenCode</b> using the official SDK</em><br>
  <em>Based on the <a href="https://ghuntley.com/ralph/">Ralph Wiggum technique</a> by Geoffrey Huntley</em>
  <em>Forked from <a href="https://github.com/th0rgal/ralph-wiggum.git">ralph-wiggum</a> by @th0rgal</em>
</p>

<p align="center">
  <a href="https://github.com/victorhsb/opencode-ralph/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/victorhsb/opencode-ralph"><img src="https://img.shields.io/badge/built%20with-Bun%20%2B%20TypeScript-f472b6.svg" alt="Built with Bun + TypeScript"></a>
</p>

<p align="center">
  <a href="#supported-platform">Supported Platform</a> •
  <a href="#what-is-opencode-ralph">What is Ralph?</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#commands">Commands</a>
</p>

---

## Supported Platform

Open Ralph Wiggum works exclusively with **OpenCode** using the official SDK.

| Platform | Requirement |
|----------|-------------|
| **OpenCode** | SDK v1.2.10+ (via `@opencode-ai/sdk`pinned to 1.2.10 range) |

---

## What is Open Ralph Wiggum?

Open Ralph Wiggum implements the **Ralph Wiggum technique** — an autonomous agentic loop where OpenCode receives the **same prompt repeatedly** until it completes a task. Each iteration, the AI sees its previous work in files and git history, enabling self-correction and incremental progress.

This is a **CLI tool** that wraps OpenCode in a persistent development loop. No external CLIs required — the SDK is bundled.

```bash
# The essence of the Ralph loop:
while true; do
  opencode "Build feature X. Output <promise>DONE</promise> when complete."
done
```

**Why this works:** The AI doesn't talk to itself between iterations. It sees the same prompt each time, but the codebase has changed from previous iterations. This creates a powerful feedback loop where the agent iteratively improves its work until all tests pass.

## Key Features

- **SDK Integration** — Direct OpenCode SDK integration (no subprocess overhead)
- **Self-Correcting Loops** — Agent sees its previous work and fixes its own mistakes
- **Verification Backpressure (opt-in)** — Gate completion on local checks like tests/builds
- **Autonomous Execution** — Set it running and come back to finished code
- **Task Tracking** — Built-in task management with `--tasks` mode
- **Live Monitoring** — Check progress with `--status` from another terminal
- **Mid-Loop Hints** — Inject guidance with `--add-context` without stopping
- **Supervisor** — By using `--supervisor`, between each iteration it will run a short supervisor to evaluate the work being done and suggest improvements.

## Why Use an Agentic Loop?

| Benefit | How it works |
|---------|--------------|
| **Self-Correction** | AI sees test failures from previous runs, fixes them |
| **Persistence** | Walk away, come back to completed work |
| **Iteration** | Complex tasks broken into incremental progress |
| **Automation** | No babysitting—loop handles retries |
| **Observability** | Monitor progress with `--status`, see history and struggle indicators |
| **Mid-Loop Guidance** | Inject hints with `--add-context` without stopping the loop |

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)
- OpenCode account (API key configured in `~/.config/opencode/opencode.json`)

No external CLI tools required - everything is bundled.

## Installation

### npm (recommended)

```bash
npm install -g @victorhsb/opencode-ralph
```

### Bun

```bash
bun add -g @victorhsb/opencode-ralph
```

### From source

```bash
git clone https://github.com/victorhsb/opencode-ralph
cd opencode-ralph
./install.sh
```

```powershell
git clone https://github.com/victorhsb/opencode-ralph
cd opencode-ralph
.\install.ps1
```

This installs the `ralph` CLI command globally.

## Project Initialization

Before running your first loop, initialize Ralph in your project directory. This creates the necessary configuration files and directory structure.

### `ralph init`

```bash
# Initialize Ralph in the current directory
ralph init

# Initialize without installing skills
ralph init --no-skill

# Force re-initialization (overwrite existing files)
ralph init --force
```

### What `init` Creates

The `ralph init` command sets up the following in your project:

| File/Directory | Purpose |
|----------------|---------|
| `.ralph/` | Runtime state directory (automatically gitignored) |
| `.ralph/ralph-tasks.md` | Starter task file for Tasks Mode |
| `.ralph/ralph-context.md` | Context injection file (via `--add-context`) |
| `~/.config/opencode/skills/` | OpenCode-compatible AI assistant skills |
| `.gitignore` | Updated to exclude `.ralph/` from version control |

After initialization, edit `.ralph/ralph-tasks.md` to define your project tasks before running with `--tasks` mode.

### Skills System

Ralph includes **OpenCode-compatible skills** - AI assistant configurations that extend OpenCode's capabilities with Ralph-specific knowledge.

**Built-in Skills:**

| Skill | Description |
|-------|-------------|
| `ralph-cli-manager` | Helps AI assistants safely manage Ralph CLI operations - tasks, monitoring, context injection |
| `ralph-loop-plan-creator` | Assists with planning complex multi-phase projects by breaking them into dependency-ordered phases |

**What Skills Provide:**

- **Specialized Knowledge**: AI assistants understand Ralph's task system, monitoring commands, and best practices
- **Safe Operations**: Guidance on when to use `--add-context`, `--status`, and task management commands
- **Project Planning**: Automatic generation of phase-based plans with dependency ordering for complex MVPs

**Skills Location:**

Skills are embedded in the Ralph binary and extracted to `~/.config/opencode/skills/` during initialization. This allows OpenCode (and compatible AI assistants) to automatically discover and use them when working with Ralph projects.

```bash
# View installed skills
ls ~/.config/opencode/skills/

# Example output:
# ralph-cli-manager/         ralph-loop-plan-creator/
```

Skills are **optional but recommended** - they enhance AI assistant effectiveness when working with Ralph-managed projects.

## Quick Start

```bash
# Simple task with iteration limit
ralph "Create a hello.txt file with 'Hello World'. Output <promise>DONE</promise> when complete." \
  --max-iterations 5

# Build something real
ralph "Build a REST API for todos with CRUD operations and tests. \
  Run tests after each change. Output <promise>COMPLETE</promise> when all tests pass." \
  --max-iterations 20

# With specific model
ralph "Create a small CLI and document usage. Output <promise>COMPLETE</promise> when done." \
  --model anthropic/claude-sonnet-4 --max-iterations 5

# With supervisor
ralph "Build API" --supervisor --max-iterations 15

# With verification gating (completion rejected until checks pass)
ralph "Implement feature and tests" \
  --verify "bun test" \
  --verify "bun run build" \
  --max-iterations 20

# Complex project with Tasks Mode
ralph "Build a full-stack web application with user auth and database" \
  --tasks --max-iterations 50
```

## GitHub Bot Integration

Open Ralph Wiggum includes a GitHub Actions workflow that enables AI-powered code review on issues and pull requests.

### Setup

1. The workflow is automatically available at `.github/workflows/opencode.yml`
2. No additional configuration needed—works out of the box

### Usage

Comment on any issue or pull request with:

```
/oc <your request>
```

Or the full command:

```
/opencode <your request>
```

**Examples:**

```
/oc Explain this PR's changes
/opencoReview the test coverage in src/auth/
/oc Suggest improvements to the error handling
```

The bot will respond with AI-generated analysis using the Zhipu AI model.

## Migration from 1.x to 2.0.0

### What's Changed

Version 2.0.0 is a **breaking change** that migrates from subprocess-based execution to the OpenCode SDK:

- ✅ **SDK Integration**: Uses OpenCode SDK directly (no subprocess)
- ❌ **Removed Agents**: Claude Code, Codex, and Copilot CLI support removed
- ❌ **Removed Flags**: `--agent`, `--rotation`, `--supervisor-agent`, `--use-subprocess`
- ✅ **Better Performance**: Direct SDK integration is faster and more reliable
- ✅ **Simpler Setup**: No external CLIs to install

### Updating Your Commands

**Before (1.x):**
```bash
ralph "Build API" --agent claude-code --model claude-sonnet-4
```

**After (2.0.0):**
```bash
ralph "Build API" --model anthropic/claude-sonnet-4
```

**Before (1.x):**
```bash
ralph "Build API" --rotation "opencode:m1,claude-code:m2"
```

**After (2.0.0):**
```bash
# Rotation not supported - use a single model
ralph "Build API" --model anthropic/claude-sonnet-4
```

**Before (1.x):**
```bash
ralph "Build API" --supervisor --supervisor-agent codex
```

**After (2.0.0):**
```bash
ralph "Build API" --supervisor
# Supervisor always uses OpenCode
```

### Environment Variables

The following environment variables are no longer used:

- `RALPH_CLAUDE_BINARY`
- `RALPH_CODEX_BINARY`
- `RALPH_COPILOT_BINARY`

`RALPH_OPENCODE_BINARY` is also no longer used (SDK is bundled).

## Commands

### Running a Loop

```bash
ralph "<prompt>" [options]

Options:
  --model MODEL            Model to use (e.g., anthropic/claude-sonnet-4)
  --min-iterations N       Minimum iterations before completion (default: 1)
  --max-iterations N       Stop after N iterations (default: unlimited)
  --completion-promise T   Text that signals completion (default: COMPLETE)
  --abort-promise TEXT     Phrase that signals early abort (e.g., precondition failed)
  --tasks, -t              Enable Tasks Mode
  --task-promise T         Text that signals task completion (default: READY_FOR_NEXT_TASK)
  --supervisor             Enable supervisor loop
  --supervisor-model MODEL Supervisor model
  --supervisor-no-action-promise TEXT  Promise for no-op supervisor run (default: NO_ACTION_NEEDED)
  --supervisor-suggestion-promise TEXT Promise for suggested action (default: USER_DECISION_REQUIRED)
  --supervisor-memory-limit N Number of supervisor memory entries to keep (default: 20)
  --supervisor-prompt-template PATH Custom supervisor prompt template
  --verify CMD             Verification command (repeatable)
  --verify-mode MODE       on-claim|every-iteration (default: on-claim)
  --verify-timeout-ms N    Per verification command timeout (default: 300000)
  --[no-]verify-fail-fast  Stop verification on first failure (default: true)
  --verify-max-output-chars N Max stored stdout/stderr per verify step (default: 4000)
  --prompt-file, --file, -f  Read prompt content from a file
  --prompt-template PATH   Use custom prompt template (see Custom Prompts)
  --no-stream              Buffer output and print at the end
  --verbose-tools          Print every tool line (disable compact tool summary)
  --no-plugins             Disable non-auth plugins
  --no-commit              Don't auto-commit after iterations
  --allow-all              Auto-approve all permissions (default: on)
  --no-allow-all           Require interactive permission prompts
  --help                   Show help
```

### Tasks Mode

Tasks Mode allows you to break complex projects into smaller, manageable tasks. Ralph works on one task at a time and tracks progress in a markdown file.

```bash
# Enable Tasks Mode
ralph "Build a complete web application" --tasks --max-iterations 20

# Custom task completion signal
ralph "Multi-feature project" --tasks --task-promise "TASK_DONE"
```

#### Task Management Commands

```bash
# List current tasks
ralph --list-tasks

# Add a new task
ralph --add-task "Implement user authentication"

# Remove task by index
ralph --remove-task 3

# Show status (tasks shown automatically when tasks mode is active)
ralph --status

# Supervisor suggestion workflow
ralph --list-suggestions
ralph --approve-suggestion <id>
ralph --reject-suggestion <id>
```

#### How Tasks Mode Works

1. **Task File**: Tasks are stored in `.ralph/ralph-tasks.md`
2. **One Task Per Iteration**: Ralph focuses on a single task to reduce confusion
3. **Automatic Progression**: When a task completes (`<promise>READY_FOR_NEXT_TASK</promise>`), Ralph moves to the next
4. **Persistent State**: Tasks survive loop restarts
5. **Focused Context**: Smaller contexts per iteration reduce costs and improve reliability

Task status indicators:
- `[ ]` - Not started
- `[/]` - In progress
- `[x]` - Complete

Example task file:
```markdown
# Ralph Tasks

- [ ] Set up project structure
- [x] Initialize git repository
- [/] Implement user authentication
  - [ ] Create login page
  - [ ] Add JWT handling
- [ ] Build dashboard UI
```

### Custom Prompt Templates

You can fully customize the prompt sent to the agent using `--prompt-template`. This is useful for integrating with custom workflows or tools.

```bash
ralph "Build a REST API" --prompt-template ./my-template.md
```

**Available variables:**

| Variable | Description |
|----------|-------------|
| `{{iteration}}` | Current iteration number |
| `{{max_iterations}}` | Maximum iterations (or "unlimited") |
| `{{min_iterations}}` | Minimum iterations |
| `{{prompt}}` | The user's task prompt |
| `{{completion_promise}}` | Completion promise text (e.g., "COMPLETE") |
| `{{abort_promise}}` | Abort promise text (if configured) |
| `{{task_promise}}` | Task promise text (for tasks mode) |
| `{{context}}` | Additional context added mid-loop |
| `{{tasks}}` | Task list content (for tasks mode) |

**Example template (`my-template.md`):**

```markdown
# Iteration {{iteration}} / {{max_iterations}}

## Task
{{prompt}}

## Instructions
1. Check beads for current status
2. Decide what to do next
3. When the epic in beads is complete, output:
   <promise>{{completion_promise}}</promise>

{{context}}
```

### Monitoring & Control

```bash
# Check status of active loop (run from another terminal)
ralph --status

# Add context/hints for the next iteration
ralph --add-context "Focus on fixing the auth module first"

# Clear pending context
ralph --clear-context
```

### Supervisor Mode

Enable an overseer agent that runs after each coder iteration, reviews output/state/tasks, and only suggests changes for user approval.

```bash
ralph "Implement the API and tests" \
  --supervisor \
  --supervisor-model anthropic/claude-sonnet-4 \
  --max-iterations 20
```

When supervisor suggests action, Ralph stores it in `.ralph/supervisor-suggestions.json` and prints:

- `ralph --approve-suggestion <id>` to apply suggestion (`add_task` or `add_context`)
- `ralph --reject-suggestion <id>` to reject it

If completion is detected in the same iteration, Ralph pauses and waits for your decision before exiting.

### Status Dashboard

The `--status` command shows:
- **Active loop info**: Current iteration, elapsed time, prompt
- **Pending context**: Any hints queued for next iteration
- **Current tasks**: Automatically shown when tasks mode is active (or use `--tasks`)
- **Iteration history**: Last 5 iterations with tools used, duration
- **Struggle indicators**: Warnings if agent is stuck (no progress, repeated errors)

```
╔══════════════════════════════════════════════════════════════════╗
║                    Ralph Wiggum Status                           ║
╚══════════════════════════════════════════════════════════════════╝

🔄 ACTIVE LOOP
   Iteration:    3 / 10
   Elapsed:      5m 23s
   Promise:      COMPLETE
   Prompt:       Build a REST API...

📊 HISTORY (3 iterations)
   Total time:   5m 23s

   Recent iterations:
   🔄 #1: 2m 10s | Bash:5 Write:3 Read:2
   🔄 #2: 1m 45s | Edit:4 Bash:3 Read:2
   🔄 #3: 1m 28s | Bash:2 Edit:1

⚠️  STRUGGLE INDICATORS:
   - No file changes in 3 iterations
   💡 Consider using: ralph --add-context "your hint here"
```

### Mid-Loop Context Injection

Guide a struggling agent without stopping the loop:

```bash
# In another terminal while loop is running
ralph --add-context "The bug is in utils/parser.ts line 42"
ralph --add-context "Try using the singleton pattern for config"
```

Context is automatically consumed after one iteration.

## Troubleshooting

### Plugin errors

This package is **CLI-only**. If OpenCode tries to load a `ralph-wiggum` or `opencode-ralph` plugin,
remove it from your OpenCode `plugin` list (opencode.json), or run:

```bash
ralph "Your task" --no-plugins
```

### ProviderModelNotFoundError / Model not configured

If you see `ProviderModelNotFoundError` or "Provider returned error", you need to configure a default model:

1. Edit `~/.config/opencode/opencode.json`:
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "model": "anthropic/claude-sonnet-4"
   }
   ```
2. Or use the `--model` flag: `ralph "task" --model anthropic/claude-sonnet-4`

### SDK Not Found

The SDK is bundled with the package. If you see SDK errors:

1. Ensure OpenCode is configured: `~/.config/opencode/opencode.json`
2. Check your API credentials are set
3. Verify network connectivity to OpenCode

### "bun: command not found"

Install Bun: https://bun.sh

## Writing Good Prompts

### Include Clear Success Criteria

❌ Bad:
```
Build a todo API
```

✅ Good:
```
Build a REST API for todos with:
- CRUD endpoints (GET, POST, PUT, DELETE)
- Input validation
- Tests for each endpoint

Run tests after changes. Output <promise>COMPLETE</promise> when all tests pass.
```

### Use Verifiable Conditions

❌ Bad:
```
Make the code better
```

✅ Good:
```
Refactor auth.ts to:
1. Extract validation into separate functions
2. Add error handling for network failures
3. Ensure all existing tests still pass

Output <promise>DONE</promise> when refactored and tests pass.
```

### Always Set Max Iterations

```bash
# Safety net for runaway loops
ralph "Your task" --max-iterations 20
```

## Recommended PRD Format

Ralph treats prompt files as plain text, so any format works. For best results, use a concise PRD with:

- **Goal**: one sentence summary of the desired outcome
- **Scope**: what is in/out
- **Requirements**: numbered, testable items
- **Constraints**: tech stack, performance, security, compatibility
- **Acceptance criteria**: explicit success checks
- **Completion promise**: include `<promise>COMPLETE</promise>` (or match your `--completion-promise`)

Example (Markdown):

```markdown
# PRD: Add Export Button

## Goal
Let users export reports as CSV from the dashboard.

## Scope
- In: export current report view
- Out: background exports, scheduling

## Requirements
1. Add "Export CSV" button to dashboard header.
2. CSV includes columns: date, revenue, sessions.
3. Works for reports up to 10k rows.

## Constraints
- Keep current UI styling.
- Use existing CSV utility in utils/csv.ts.

## Acceptance Criteria
- Clicking button downloads a valid CSV.
- CSV opens cleanly in Excel/Sheets.
- All existing tests pass.

## Completion Promise
<promise>COMPLETE</promise>
```

### JSON Feature List (Recommended for Complex Projects)

For larger projects, a structured JSON feature list works better than prose. Based on [Anthropic's research on effective agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), JSON format reduces the chance of agents inappropriately modifying test definitions.

Create a `features.json` file:

```json
{
  "features": [
    {
      "category": "functional",
      "description": "Export button downloads CSV with current report data",
      "steps": [
        "Navigate to dashboard",
        "Click 'Export CSV' button",
        "Verify CSV file downloads",
        "Open CSV and verify columns: date, revenue, sessions",
        "Verify data matches displayed report"
      ],
      "passes": false
    },
    {
      "category": "functional",
      "description": "Export handles large reports up to 10k rows",
      "steps": [
        "Load report with 10,000 rows",
        "Click 'Export CSV' button",
        "Verify export completes without timeout",
        "Verify all rows present in CSV"
      ],
      "passes": false
    },
    {
      "category": "ui",
      "description": "Export button matches existing dashboard styling",
      "steps": [
        "Navigate to dashboard",
        "Verify button uses existing button component",
        "Verify button placement in header area"
      ],
      "passes": false
    }
  ]
}
```

Then reference it in your prompt:

```
Read features.json for the feature list. Work through each feature one at a time.
After verifying a feature works end-to-end, update its "passes" field to true.
Do NOT modify the description or steps - only change the passes boolean.
Output <promise>COMPLETE</promise> when all features pass.
```

**Why JSON?** Agents are less likely to inappropriately modify JSON test definitions compared to Markdown. The structured format keeps agents focused on implementation rather than redefining success criteria.

## When to Use Ralph

**Good for:**
- Tasks with automatic verification (tests, linters, type checking)
- Well-defined tasks with clear completion criteria
- Greenfield projects where you can walk away
- Iterative refinement (getting tests to pass)

**Not good for:**
- Tasks requiring human judgment
- One-shot operations
- Unclear success criteria
- Production debugging

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────────┐    same prompt    ┌──────────┐              │
│   │          │ ───────────────▶  │          │              │
│   │  ralph   │                   │ OpenCode │              │
│   │   CLI    │ ◀─────────────── │   SDK    │              │
│   │          │   output + files  │          │              │
│   └──────────┘                   └──────────┘              │
│        │                              │                     │
│        │ check for                    │ modify              │
│        │ <promise>                    │ files               │
│        ▼                              ▼                     │
│   ┌──────────┐                   ┌──────────┐              │
│   │ Complete │                   │   Git    │              │
│   │   or     │                   │  Repo    │              │
│   │  Retry   │                   │ (state)  │              │
│   └──────────┘                   └──────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. Ralph sends your prompt to OpenCode SDK
2. The SDK executes the agent, modifies files
3. Ralph checks output for completion promise
4. If not found, repeat with same prompt
5. AI sees previous work in files
6. Loop until success or max iterations

## Architecture

```
┌──────────────────────────────────────────────────┐
│              Ralph CLI Process                   │
│                                                  │
│  ┌──────────────┐    ┌──────────────────┐     │
│  │  Main Loop   │───▶ │ OpenCode SDK     │     │
│  │              │    │  ┌────────────┐  │     │
│  │  - Prompt    │    │  │ Session    │  │     │
│  │  - Check     │    │  │ ┌────────┐ │  │     │
│  │    response  │    │  │ │ Prompt │ │  │     │
│  │  - Repeat    │    │  │ │   ↓    │ │  │     │
│  │              │    │  │ │ AI     │ │  │     │
│  └──────────────┘    │  │ │ Tools  │ │  │     │
│                      │  │ └────────┘ │  │     │
│                      │  └────────────┘  │     │
│                      └──────────────────┘     │
│                                                  │
│  One SDK server per Ralph loop                   │
│  Fresh session per iteration                     │
│  Sessions accumulate in OpenCode                 │
└──────────────────────────────────────────────────┘
```

## Project Structure

```
ralph-wiggum/
├── ralph.ts                      # Top-level CLI entrypoint
├── src/
│   ├── cli/                      # CLI argument parsing and commands
│   │   ├── args.ts               # Argument parsing
│   │   └── commands.ts           # Command handlers
│   ├── config/                   # Configuration and constants
│   │   └── config.ts             # Paths, defaults, constants
│   ├── context/                  # Mid-loop context management
│   │   └── context.ts            # Add/clear context helpers
│   ├── fs-tracker/               # File system tracking
│   │   └── fs-tracker.ts         # Change detection utilities
│   ├── io/                       # File I/O utilities
│   │   └── files.ts              # File operations
│   ├── loop/                     # Main iteration loop
│   │   ├── loop.ts               # Loop orchestration
│   │   └── iteration.ts          # Per-iteration execution
│   ├── prompts/                  # Prompt building
│   │   └── prompts.ts            # Template processing
│   ├── sdk/                      # OpenCode SDK integration
│   │   ├── client.ts             # SDK client initialization
│   │   ├── executor.ts           # Prompt execution
│   │   └── output.ts             # Response formatting
│   ├── state/                    # State management
│   │   └── state.ts              # Loop state persistence
│   ├── supervisor/               # Supervisor mode
│   │   └── supervisor.ts         # Suggestion pipeline
│   ├── tasks/                    # Tasks mode
│   │   └── tasks.ts              # Task file parsing
│   └── utils/                    # General utilities
│       └── utils.ts              # Helper functions
├── bin/ralph.js                  # Compiled CLI entrypoint
├── package.json                  # Package config
├── AGENTS.md                     # Agent operational guide
├── ARCHITECTURE.md               # Technical architecture docs
├── install.sh / install.ps1     # Installation scripts
└── uninstall.sh / uninstall.ps1 # Uninstallation scripts
```

### State Files (in .ralph/)

During operation, Ralph stores state in `.ralph/` (automatically created and gitignored):
- `ralph-loop.state.json` - Active loop state (running/paused, iteration count)
- `ralph-history.json` - Iteration history with metrics (duration, tools used)
- `ralph-context.md` - Pending context/hints for next iteration (via `--add-context`)
- `ralph-tasks.md` - Task list for Tasks Mode (created when `--tasks` is used)
- `supervisor-suggestions.json` - Supervisor suggestions and approval status
- `supervisor-memory.md` - Rolling supervisor memory across iterations

**Note:** The `.ralph/` directory is runtime state and should not be committed to git.

## Uninstall

```bash
npm uninstall -g @victorhsb/opencode-ralph
```

## Learn More

- [Original Ralph Wiggum technique by Geoffrey Huntley](https://ghuntley.com/ralph/)
- [Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

## License

MIT
### Verification and Completion Gating

Verification is opt-in via `--verify`.

- Verification commands run in the order provided.
- Default mode is `--verify-mode on-claim`, which runs checks only when the agent claims completion (or task completion in tasks mode).
- `--verify-mode every-iteration` runs checks after every iteration.
- If the agent claims completion and any verification command fails or times out, Ralph rejects the completion claim and continues the loop.
- Verification failures are stored in `.ralph/ralph-loop.state.json` / `.ralph/ralph-history.json` and injected into the next iteration prompt as explicit feedback.

This is the current hard reliability gate. Supervisor mode remains suggestion-based and does not replace verification checks.

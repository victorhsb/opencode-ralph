---
name: ralph-cli-manager
description: "Expert guidance for MANAGING Ralph CLI (NEVER running it). Use when the user needs to initialize or set up Ralph in a project, manage tasks via task commands, write effective Ralph prompts for the USER to run, monitor or control active Ralph loops via status/context commands, edit task files directly, or understand Ralph best practices. CRITICAL: You must NEVER execute ralph with a quoted prompt argument yourself - only provide such commands to the user. You CAN safely run ralph init, ralph task commands, ralph --status, ralph --add-context, and edit .ralph/ files."
---

# Ralph CLI Manager

Guide for using Ralph Wiggum - an autonomous agentic loop tool for iterative AI development with OpenCode.

## ⚠️ CRITICAL: DO NOT LAUNCH RALPH LOOPS

**YOU MUST NEVER launch ralph loops (`ralph "..."`) by yourself.**

Ralph is an autonomous AI loop runner that spawns its own agent sessions. Launching ralph loops from within an AI session creates:
- Nested AI loops that waste tokens
- Confusion about which agent is controlling the session
- Potential conflicts with the user's actual ralph instance

**Your role is MANAGEMENT ONLY:**
- ✅ `ralph init` - Initialize ralph in a project
- ✅ `ralph task add` - Add tasks to the task list
- ✅ `ralph task remove` - Remove tasks
- ✅ `ralph task list` - View current tasks
- ✅ `ralph --status` - Check if a loop is running
- ✅ `ralph --add-context` - Add hints to an active loop
- ✅ Write/edit `.ralph/ralph-tasks.md` directly
- ✅ Write prompts for the user to use

**ABSOLUTELY FORBIDDEN:**
- ❌ `ralph "Build something"` - Never run the main loop
- ❌ `ralph "..." --tasks` - Never run tasks mode
- ❌ `ralph "..." --supervisor` - Never run supervisor mode
- ❌ Any command that executes `ralph "<prompt>"`

If a user asks you to "run ralph" or "start a ralph loop", provide them with:
1. The command they should run themselves
2. A well-crafted prompt they can use
3. Instructions on how to monitor it

## When to Use Ralph

See [references/when-to-use-ralph.md](references/when-to-use-ralph.md) for complete decision guidance.

**Quick heuristics:**

Use Ralph if you can answer YES to ALL:
1. Is there a specific, measurable goal?
2. Can the AI verify completion itself (tests, lint, etc.)?
3. Would multiple attempts help (iteration = better)?
4. Can you walk away and check back later?

Use synchronous agent if ANY apply:
1. You need to explore/discuss options
2. Success is subjective or requires your input
3. One good attempt is enough
4. You want immediate back-and-forth
5. The task is simple or small

## Quick Start

```bash
# Initialize Ralph in a project
ralph init

# Add tasks
ralph task add "Implement user authentication"
ralph task add "Add database schema"
```

## Task Management Workflow

### 1. Initialize Project

```bash
ralph init              # Creates .ralph/ directory with starter files
```

Creates:
- `.ralph/ralph-tasks.md` - Task tracking file
- `.ralph/ralph-context.md` - Context/hints file
- `.gitignore` entry for `.ralph/`

### 2. Add Tasks

```bash
# Add single task
ralph task add "Implement JWT authentication"

# Common task patterns
ralph task add "Set up project structure"
ralph task add "Create database migrations"
ralph task add "Implement API endpoints"
ralph task add "Add tests"
```

### 3. View Tasks

```bash
ralph task list
```

Shows:
- Task index (for removal)
- Status: ⏸️ (todo) / 🔄 (in-progress) / ✅ (complete)
- Subtasks if any

### 4. Remove Tasks

```bash
ralph task remove 3     # Remove task at index 3
```

### 5. Run with Tasks Mode (User only)

**⚠️ DO NOT RUN THIS YOURSELF - Provide to user**

```bash
# USER EXECUTES THIS, NOT YOU
ralph "Build the API" --tasks --max-iterations 20
```

When the user runs this, Ralph will:
- Run opencode on one task at a time
- Mark tasks complete automatically
- Move to next task when `<promise>READY_FOR_NEXT_TASK</promise>` detected
- Stop when all tasks complete

## Writing Effective Ralph Prompts

### Required Elements

Every Ralph prompt should include:

1. **Clear goal** - What to build/implement
2. **Constraints** - Tech stack, file locations, patterns to follow
3. **Verification steps** - How to check completion
4. **Completion promise** - Signal when done: `<promise>COMPLETE</promise>`

### Prompt Template

```
## Goal
[One sentence: What to accomplish]

## Scope
- In: [what's included]
- Out: [what's excluded]

## Requirements
1. [First requirement]
2. [Second requirement]
3. [Third requirement]

## Constraints
- [Tech stack, patterns, etc.]

## Verification
- [How to verify completion]

## Completion Promise
When all requirements are met and verified, output:
<promise>COMPLETE</promise>
```

### Task-Specific Prompts (PROVIDE TO USER)

**⚠️ DO NOT EXECUTE - Craft and provide to user**

When writing prompts for tasks mode:
- Focus on ONE task at a time
- Include task completion signal: `<promise>READY_FOR_NEXT_TASK</promise>`
- Don't mention other tasks (Ralph handles sequencing)

**Example prompt to give the user:**

```
ralph "Implement JWT authentication:
- Add /login and /register endpoints
- Use bcrypt for password hashing
- Return JWT token on successful login
- Add middleware to protect routes

Test the endpoints manually. Output <promise>READY_FOR_NEXT_TASK</promise> when done." \
  --tasks --max-iterations 10
```

**Remember:** You write the prompt, the user runs the command.

## Monitoring and Control

### Check Status

```bash
ralph --status
```

Shows:
- Active loop info (iteration, elapsed time)
- Current tasks
- Recent history
- Struggle indicators

### Add Context Mid-Loop

```bash
# From another terminal while loop is running
ralph --add-context "The bug is in utils/parser.ts line 42"
```

### Clear Context

```bash
ralph --clear-context
```

### Supervisor Suggestions

When supervisor suggests actions:

```bash
ralph --list-suggestions
ralph --approve-suggestion <id>
ralph --reject-suggestion <id>
```

## Task File Format

`.ralph/ralph-tasks.md` uses markdown:

```markdown
# Ralph Tasks

- [ ] Set up project structure
- [/] Implement user authentication
  - [ ] Create login endpoint
  - [ ] Create register endpoint
  - [ ] Add JWT middleware
- [ ] Build dashboard UI
```

Status markers:
- `[ ]` - Not started
- `[/]` - In progress
- `[x]` - Complete

## Best Practices

### Task Size
- Keep tasks small (1-2 hours of work)
- Use subtasks for complex features
- Order tasks by dependency

### Iteration Limits
- Always set `--max-iterations` as safety net
- Start with 10-20 for small tasks
- Use 50+ for complex projects

### Prompt Quality
- Be specific about file locations
- Include example inputs/outputs
- Mention testing requirements
- Use clear completion criteria

### Context Injection
- Use `--add-context` when agent is stuck
- Be specific: file paths, line numbers, error messages
- Clear context after use to avoid stale hints

### Completion Promises
- Use unique promises per project: `COMPLETE`, `DONE`, `FINISHED`
- Be consistent in prompts
- Match `--completion-promise` flag if customized

## Command Safety

See [references/safety-guide.md](references/safety-guide.md) for detailed safety rules.

**Quick validation:**
- Does this command have a quoted string prompt? → **FORBIDDEN**
- Is this a `ralph task *` command? → **SAFE**
- Is this `ralph init` or `ralph --status`? → **SAFE**
- Is this `ralph "..."` with any flags? → **FORBIDDEN**

Use the validation script to check commands:

```bash
./scripts/validate-ralph-command.sh 'ralph init'
# Output: ✓ SAFE: This is a management command

./scripts/validate-ralph-command.sh 'ralph "Build something"'
# Output: ✗ FORBIDDEN: This command would launch a ralph loop
```

## References

- [references/commands.md](references/commands.md) - Complete command reference
- [references/when-to-use-ralph.md](references/when-to-use-ralph.md) - Decision guidance
- [references/safety-guide.md](references/safety-guide.md) - Detailed safety rules

## Summary

**What you CAN do:**
- Initialize projects with `ralph init`
- Manage tasks with `ralph task add/list/remove`
- Monitor loops with `ralph --status`
- Add context with `ralph --add-context`
- Edit `.ralph/ralph-tasks.md` directly
- Write prompts for users to run

**What you MUST NEVER do:**
- Run `ralph "<prompt>"` commands
- Run ralph with any prompt string
- Execute the main ralph loop

**Remember:** Your job is to be a ralph expert and help users use it effectively. You prepare everything, they execute the loops.

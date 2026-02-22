---
name: ralph-cli-manager
description: "Expert guidance for MANAGING Ralph CLI (NEVER running it). Use when the user needs to (1) Initialize or set up Ralph in a project, (2) Manage tasks with Ralph (add, remove, list, track progress) via task commands, (3) Write effective Ralph prompts for the USER to run, (4) Monitor or control active Ralph loops via status/context commands, (5) Edit task files directly, or (6) Understand Ralph best practices. CRITICAL: You must NEVER execute ralph with a quoted prompt argument yourself - only provide such commands to the user. You CAN safely run ralph init, ralph task commands, ralph --status, ralph --add-context, and edit .ralph/ files. Covers task management, prompt writing, loop monitoring, and best practices for autonomous AI development loops."
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

## When to Use Ralph vs Synchronous Agent

Understanding when Ralph is appropriate is critical. Ralph is NOT always the right tool.

### What Ralph Is

Ralph is an **autonomous loop orchestrator** that:
- Runs the same prompt repeatedly until completion
- Self-corrects by seeing its own previous work
- Works "AFK" (away from keyboard) on well-defined tasks
- Performs ONE task per loop iteration
- Is monolithic (single process, single repository)

Think of it as: "Throw clay on the pottery wheel, spin it, check result, repeat until right."

### ✅ Use Ralph When

| Scenario | Why Ralph Works |
|----------|-----------------|
| **Self-verifying tasks** | Tests, linters, type checks provide automatic feedback |
| **Well-defined requirements** | Clear success criteria → `<promise>COMPLETE</promise>` |
| **Greenfield projects** | Set up, walk away, return to finished code |
| **Getting tests to pass** | Each iteration sees failures, fixes them |
| **Iterative refinement** | "Make it work, make it right, make it fast" |
| **Bulk work AFK** | Complex multi-step tasks you want done while away |
| **Tasks with automatic verification** | Build passes, tests pass, linting passes |
| **CRUD/boilerplate generation** | Repetitive work with clear patterns |

**Example good Ralph task:**
```
"Build a REST API for todos with CRUD endpoints.
Run tests after each change.
Output <promise>COMPLETE</promise> when all tests pass."
```
✅ Clear goal, automatic verification (tests), defined completion.

### ❌ DO NOT Use Ralph When

| Scenario | Why Ralph Fails | Use Instead |
|----------|-----------------|-------------|
| **Simple questions** | Overkill, wastes tokens | Single prompt |
| **Exploratory work** | No clear "done" state | Interactive session |
| **Human judgment needed** | Can't make subjective decisions | You decide |
| **Quick fixes** | Overhead > benefit | Direct edit |
| **No completion criteria** | Loops forever | Define criteria first |
| **Need immediate feedback** | Ralph is AFK work | Synchronous chat |
| **Debugging/understanding** | Needs interactive exploration | Read, discuss |
| **Real-time interaction** | Ralph is autonomous | Live session |
| **Vague requirements** | Can't verify completion | Clarify first |
| **One-shot operations** | No iteration needed | Single command |

**Example bad Ralph task:**
```
"Improve the code quality"
```
❌ No verification, subjective, no completion criteria. Will loop forever.

**Better approach:**
Use a synchronous agent to discuss what "quality" means, identify specific issues, then use Ralph for each fix:
```
"Refactor auth.ts to extract validation into separate functions.
Ensure all existing tests still pass.
Output <promise>COMPLETE</promise> when done."
```

### Decision Flowchart

```
User wants to build something
         │
         ▼
  Is there clear        ───No───▶ Don't use Ralph yet.
  completion criteria?            Clarify requirements first.
         │
        Yes
         │
         ▼
  Can completion be      ───No───▶ Don't use Ralph.
  automatically verified?          Needs human judgment.
         │
        Yes
         │
         ▼
  Is it a single        ───Yes──▶ Use synchronous agent.
  quick operation?                Ralph overhead not worth it.
         │
         No
         │
         ▼
  Does it benefit       ───No───▶ Use synchronous agent.
  from iteration?                  One-shot is fine.
         │
        Yes
         │
         ▼
         └────────────────▶ ✅ Use Ralph
                           Set max-iterations as safety net
```

### Quick Heuristics

**Use Ralph if you can answer YES to ALL:**
1. Is there a specific, measurable goal?
2. Can the AI verify completion itself (tests, lint, etc.)?
3. Would multiple attempts help (iteration = better)?
4. Can you walk away and check back later?

**Use synchronous agent if ANY apply:**
1. You need to explore/discuss options
2. Success is subjective or requires your input
3. One good attempt is enough
4. You want immediate back-and-forth
5. The task is simple or small

### Real-World Examples

**Good for Ralph:**
- "Create 20 API endpoints following the pattern in handlers/user.go"
- "Fix all TypeScript errors in the codebase"
- "Migrate all tests from Jest to Vitest"
- "Add input validation to all form fields"
- "Implement all routes defined in openapi.yaml"

**Good for Synchronous Agent:**
- "Help me understand this legacy codebase"
- "What's the best architecture for my use case?"
- "Review this code and suggest improvements"
- "Debug why this function returns null sometimes"
- "Explain the difference between these two approaches"

### When in Doubt

Start synchronous. If you find yourself:
- Repeating the same corrections
- The task has clear sub-tasks
- You could walk away if it just worked

Then switch to Ralph with proper task setup.

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

### 5. Run with Tasks Mode (User only; that's just a reference)

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

### Examples

**Bad:**
```
Build a todo API
```

**Good:**
```
Build a REST API for todos with:
- CRUD endpoints (GET, POST, PUT, DELETE)
- Input validation
- Tests for each endpoint

Run tests after changes. Output <promise>COMPLETE</promise> when all tests pass.
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

### How to Help Users Run Ralph

When a user asks you to run ralph:

1. **Ask clarifying questions** about what they want to build
2. **Craft a detailed prompt** following the prompt writing guidelines
3. **Check if `.ralph/` exists** - if not, suggest running `ralph init` first
4. **Set up tasks** if needed using `ralph task add`
5. **Write a good prompt** for them to run themselves using the `ralph -f prompt.md`; 

**Example interaction:**

User: "Build me an auth system"

Your response:
```
I'll help you set up Ralph to build an auth system. First, let me initialize Ralph and add some tasks:

```bash
ralph init
ralph task add "Create database schema for users and sessions"
ralph task add "Implement JWT authentication middleware"
ralph task add "Create login and register endpoints"
ralph task add "Add password hashing with bcrypt"
```

Now run this command in your terminal:

```bash
ralph "Build a complete authentication system with JWT:
- Create users and sessions tables
- Implement login/register endpoints
- Add JWT middleware for protected routes
- Use bcrypt for password hashing

Output <promise>READY_FOR_NEXT_TASK</promise> after each task is complete." \
  --tasks --max-iterations 30
```

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

## Command Safety Validation

This skill includes a validation script to help ensure ralph commands are safe:

**Script:** `scripts/validate-ralph-command.sh`

Use this script to check if a ralph command is safe to execute:

```bash
./scripts/validate-ralph-command.sh 'ralph init'
# Output: ✓ SAFE: This is a management command

./scripts/validate-ralph-command.sh 'ralph "Build something"'
# Output: ✗ FORBIDDEN: This command would launch a ralph loop
```

**When in doubt, ask yourself:**
- Does this command have a quoted string prompt? → **FORBIDDEN**
- Is this a `ralph task *` command? → **SAFE**
- Is this `ralph init` or `ralph --status`? → **SAFE**
- Is this `ralph "..."` with any flags? → **FORBIDDEN**

## Common Commands Reference

See [references/commands.md](references/commands.md) for complete command reference.

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

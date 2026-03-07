# Ralph Command Safety Guide

This guide explains which Ralph CLI commands are safe to execute and which are forbidden.

## Critical Rule

**YOU MUST NEVER launch ralph loops (`ralph "..."`) by yourself.**

Ralph is an autonomous AI loop runner that spawns its own agent sessions. Launching ralph loops from within an AI session creates:
- Nested AI loops that waste tokens
- Confusion about which agent is controlling the session
- Potential conflicts with the user's actual ralph instance

## Safe Commands

These commands are safe to execute:

| Command | Purpose |
|---------|---------|
| `ralph init` | Initialize ralph in a project |
| `ralph init --force` | Re-initialize with overwrite |
| `ralph task add "..."` | Add a task to the task list |
| `ralph task remove <n>` | Remove task at index n |
| `ralph task list` | View all tasks |
| `ralph --status` | Check if a loop is running |
| `ralph --add-context "..."` | Add hints to an active loop |
| `ralph --clear-context` | Clear pending context |
| `ralph --list-suggestions` | List supervisor suggestions |
| `ralph --approve-suggestion <id>` | Approve a suggestion |
| `ralph --reject-suggestion <id>` | Reject a suggestion |

## Forbidden Commands

**ABSOLUTELY FORBIDDEN - Never execute these:**

| Pattern | Example | Why Forbidden |
|---------|---------|---------------|
| `ralph "<prompt>"` | `ralph "Build something"` | Launches autonomous loop |
| `ralph "..." --tasks` | `ralph "..." --tasks` | Launches tasks mode loop |
| `ralph "..." --supervisor` | `ralph "..." --supervisor` | Launches supervisor mode |
| `ralph "..." <any flag>` | `ralph "..." -x 20` | Any quoted prompt is forbidden |

## Quick Validation

Use this heuristic when unsure:

- Does this command have a quoted string prompt? → **FORBIDDEN**
- Is this a `ralph task *` command? → **SAFE**
- Is this `ralph init` or `ralph --status`? → **SAFE**
- Is this `ralph "..."` with any flags? → **FORBIDDEN**

## Validation Script

Use the included script to validate commands:

```bash
# From skill directory
./scripts/validate-ralph-command.sh 'ralph init'
# Output: ✓ SAFE: This is a management command

./scripts/validate-ralph-command.sh 'ralph "Build something"'
# Output: ✗ FORBIDDEN: This command would launch a ralph loop

./scripts/validate-ralph-command.sh 'ralph task add "Test"'
# Output: ✓ SAFE: This is a management command
```

## What To Do When User Asks to Run Ralph

If a user asks you to "run ralph" or "start a ralph loop":

1. **Ask clarifying questions** about what they want to build
2. **Check if `.ralph/` exists** - if not, suggest running `ralph init` first
3. **Set up tasks** if needed using `ralph task add`
4. **Craft a detailed prompt** following the prompt writing guidelines
5. **Provide the command** for them to run themselves

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

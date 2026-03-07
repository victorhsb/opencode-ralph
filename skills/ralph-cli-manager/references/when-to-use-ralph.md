# When to Use Ralph vs Synchronous Agent

Understanding when Ralph is appropriate is critical. Ralph is NOT always the right tool.

## What Ralph Is

Ralph is an **autonomous loop orchestrator** that:
- Runs the same prompt repeatedly until completion
- Self-corrects by seeing its own previous work
- Works "AFK" (away from keyboard) on well-defined tasks
- Performs ONE task per loop iteration
- Is monolithic (single process, single repository)

Think of it as: "Throw clay on the pottery wheel, spin it, check result, repeat until right."

## Use Ralph When

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

## DO NOT Use Ralph When

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

## Decision Flowchart

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
  from iteration?                 One-shot is fine.
         │
        Yes
         │
         ▼
         └────────────────▶ ✅ Use Ralph
                           Set max-iterations as safety net
```

## Quick Heuristics

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

## Real-World Examples

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

## When in Doubt

Start synchronous. If you find yourself:
- Repeating the same corrections
- The task has clear sub-tasks
- You could walk away if it just worked

Then switch to Ralph with proper task setup.

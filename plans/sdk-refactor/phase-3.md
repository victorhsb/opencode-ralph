# Phase 3: Remove Multi-Agent Support

**Status**: Not Started  
**Estimated Duration**: 2-3 hours  
**Breaking Change**: Yes  
**Prerequisites**: Phase 2 complete  
**Version Bump**: 2.0.0  

---

## Goal

Remove all multi-agent support code, leaving only OpenCode SDK execution. This is the first **breaking change** that removes functionality - users can no longer use Claude Code, Codex, or Copilot CLI with Ralph.

---

## Overview

In this phase, we will:
1. Remove the `AGENTS` record and all agent configurations
2. Remove `--agent` CLI flag
3. Remove `--rotation` CLI flag and related logic
4. Remove `--supervisor-agent` CLI flag
5. Simplify state structure (remove `agent` field)
6. Remove subprocess fallback entirely
7. Remove `--use-subprocess` flag
8. Remove cross-platform binary resolution
9. Remove agent-specific output parsing

---

## Files to Modify

```
ralph.ts              # Remove agent abstractions
package.json          # Remove agent-related keywords
README.md             # Update documentation (Phase 4)
```

---

## Step-by-Step Implementation

### Step 1: Remove Agent Type Definitions

**File**: `ralph.ts`

**Remove** (lines 27-172):

```typescript
// REMOVE ENTIRELY:
const AGENT_TYPES = ["opencode", "claude-code", "codex", "copilot"] as const;
type AgentType = (typeof AGENT_TYPES)[number];

type AgentEnvOptions = { ... };
type AgentBuildArgsOptions = { ... };

interface AgentConfig {
  type: AgentType;
  command: string;
  buildArgs: (prompt: string, model: string, options?: AgentBuildArgsOptions) => string[];
  buildEnv: (options: AgentEnvOptions) => Record<string, string>;
  parseToolOutput: (line: string) => string | null;
  configName: string;
}

// REMOVE: resolveCommand function
function resolveCommand(cmd: string, envOverride?: string): string { ... }

// REMOVE ENTIRELY: AGENTS record
const AGENTS: Record<AgentType, AgentConfig> = {
  opencode: { ... },
  "claude-code": { ... },  // REMOVE
  codex: { ... },          // REMOVE
  copilot: { ... },        // REMOVE
};
```

**Keep only OpenCode-related minimal structure**:

```typescript
// Simplified - just track that we're using OpenCode
// No need for complex abstraction since it's the only option

// Keep for reference/history tracking:
type AgentType = "opencode";  // Single value now

// Keep minimal config for status display:
interface AgentConfig {
  configName: "OpenCode";
}

const CURRENT_AGENT: AgentConfig = {
  configName: "OpenCode",
};
```

### Step 2: Remove Agent Selection

**File**: `ralph.ts`

**Remove from argument parsing** (around lines 1067-1073):

```typescript
// REMOVE:
if (arg === "--agent") {
  const val = args[++i];
  if (!val || !AGENT_TYPES.includes(val as AgentType)) {
    console.error("Error: --agent requires: 'opencode', 'claude-code', 'codex', or 'copilot'");
    process.exit(1);
  }
  agentType = val as AgentType;
}

// REMOVE from state tracking:
let agentType: AgentType = "opencode";  // Was configurable, now fixed

// Remove from RalphState interface:
interface RalphState {
  // ... other fields
  agent: AgentType;  // REMOVE - always "opencode"
}
```

### Step 3: Remove Rotation Feature

**File**: `ralph.ts`

**Remove** (lines 1008-1062):

```typescript
// REMOVE all rotation-related variables:
let rotationInput = "";
let rotation: string[] | null = null;

// REMOVE: parseRotationInput function
function parseRotationInput(raw: string): string[] { ... }

// REMOVE from RalphState:
interface RalphState {
  // ...
  rotation?: string[];       // REMOVE
  rotationIndex?: number;    // REMOVE
}

// REMOVE from argument parsing:
if (arg === "--rotation") {
  const val = args[++i];
  if (!val) {
    console.error("Error: --rotation requires a value");
    process.exit(1);
  }
  rotationInput = val;
}

// REMOVE rotation validation:
if (rotationInput) {
  rotation = parseRotationInput(rotationInput);
} else if (!AGENT_TYPES.includes(agentType)) {
  // This check is now unnecessary
}
```

**Remove from state handling**:

```typescript
// REMOVE from state resumption:
if (resuming) {
  rotation = existingState.rotation ?? null;  // REMOVE
}

// REMOVE from state initialization:
const state: RalphState = {
  // ...
  agent: initialAgentType,     // REMOVE
  rotation: rotation ?? undefined,      // REMOVE
  rotationIndex: rotationActive ? 0 : undefined,  // REMOVE
};
```

**Remove from status display** (lines 557-588):

```typescript
// REMOVE rotation display from --status:
if (rotationActive) {
  const activeIndex = state.rotation && state.rotation.length > 0
    ? ((state.rotationIndex ?? 0) % state.rotation.length + state.rotation.length) % state.rotation.length
    : 0;
  console.log(`\n   Rotation (position ${activeIndex + 1}/${state.rotation.length}):`);
  state.rotation.forEach((entry, index) => {
    const activeLabel = index === activeIndex ? "  **ACTIVE**" : "";
    console.log(`   ${index + 1}. ${entry}${activeLabel}`);
  });
}
```

### Step 4: Remove Supervisor Agent Selection

**File**: `ralph.ts`

**Remove** (lines 1128-1136):

```typescript
// REMOVE:
if (arg === "--supervisor-agent") {
  const val = args[++i];
  if (!val || !AGENT_TYPES.includes(val as AgentType)) {
    console.error("Error: --supervisor-agent requires: 'opencode', 'claude-code', 'codex', or 'copilot'");
    process.exit(1);
  }
  supervisorAgent = val as AgentType;
  supervisorOptionsTouched = true;
}

// REMOVE variables:
let supervisorAgent: AgentType | null = null;  // REMOVE

// Supervisor now always uses OpenCode, just with optional different model
```

**Update SupervisorConfig**:

```typescript
// BEFORE:
interface SupervisorConfig {
  enabled: boolean;
  agent: AgentType;
  model: string;
  // ...
}

// AFTER:
interface SupervisorConfig {
  enabled: boolean;
  model: string;  // Always OpenCode, just specify model
  // ...
}
```

**Update supervisor initialization**:

```typescript
// BEFORE:
const effectiveSupervisorAgent = supervisorAgent ?? initialAgentType;
const supervisorConfig: SupervisorConfig = {
  enabled: supervisorEnabled,
  agent: effectiveSupervisorAgent,
  model: effectiveSupervisorModel,
  // ...
};

// AFTER:
const supervisorConfig: SupervisorConfig = {
  enabled: supervisorEnabled,
  model: effectiveSupervisorModel,  // Always OpenCode
  // ...
};
```

### Step 5: Remove Subprocess Fallback

**File**: `ralph.ts`

**Remove subprocess execution path**:

```typescript
// REMOVE: useSubprocess flag
let useSubprocess = false;

// REMOVE from argument parsing:
if (arg === "--use-subprocess") {
  useSubprocess = true;
}

// REMOVE subprocess execution block:
if (useSubprocess) {
  // Legacy subprocess path - REMOVE ENTIRELY
} else {
  // SDK path - now the ONLY path
}

// Keep only SDK path:
const result = await executeSdkIteration({ ... });
```

**Remove subprocess-related imports and functions**:

```typescript
// REMOVE from imports:
import { $ } from "bun";  // Only needed for subprocess, keep for file operations?

// Check: Is $ used elsewhere? If only for subprocess, remove. If for file operations, keep.

// REMOVE: streamProcessOutput function
// REMOVE: validateAgent function
// REMOVE: Bun.which() calls
```

### Step 6: Remove Agent-Specific Output Parsing

**File**: `ralph.ts`

**Remove** (lines 1966-2033):

```typescript
// REMOVE: extractClaudeStreamDisplayLines function
// This was Claude Code specific

function extractClaudeStreamDisplayLines(rawLine: string): string[] { ... }  // REMOVE

// In streamProcessOutput (if kept temporarily):
// Remove Claude-specific handling:
const outputLines = options.agent.type === "claude-code" 
  ? extractClaudeStreamDisplayLines(line) 
  : [line];  // REMOVE - now only SDK path
```

### Step 7: Remove Binary Resolution

**File**: `ralph.ts`

**Remove** (lines 43-59):

```typescript
// REMOVE:
const IS_WINDOWS = process.platform === "win32";  // Keep if used elsewhere

// REMOVE: resolveCommand function
function resolveCommand(cmd: string, envOverride?: string): string { ... }

// REMOVE: Environment variable support for binaries
// - RALPH_OPENCODE_BINARY
// - RALPH_CLAUDE_BINARY
// - RALPH_CODEX_BINARY
// - RALPH_COPILOT_BINARY
```

### Step 8: Remove Agent Validation

**File**: `ralph.ts`

**Remove** (lines 1396-1403):

```typescript
// REMOVE: validateAgent function
async function validateAgent(agent: AgentConfig): Promise<void> {
  const path = Bun.which(agent.command);
  if (!path) {
    console.error(`Error: ${agent.configName} CLI ('${agent.command}') not found.`);
    process.exit(1);
  }
}

// REMOVE validation calls:
await validateAgent(AGENTS[initialAgentType]);

// REMOVE multi-agent validation:
if (rotationActive) {
  const uniqueAgents = Array.from(new Set(runtimeRotation!.map(entry => entry.split(":")[0]))) as AgentType[];
  for (const agent of uniqueAgents) {
    await validateAgent(AGENTS[agent]);
  }
}
```

### Step 9: Update Help Text

**File**: `ralph.ts`

**Update help output** (lines 176-253):

Remove agent-related options:

```typescript
// BEFORE:
Options:
  --agent AGENT       AI agent to use: opencode (default), claude-code, codex, copilot
  --rotation LIST     Agent/model rotation for each iteration (comma-separated)
  --supervisor-agent AGENT  Supervisor agent: opencode, claude-code, codex, copilot
  --no-plugins        Disable non-auth OpenCode plugins for this run (opencode only)

// AFTER:
Options:
  --model MODEL       Model to use (e.g., anthropic/claude-sonnet-4)
  --no-plugins        Disable non-auth OpenCode plugins for this run

// Also remove from examples:
// BEFORE:
ralph "Fix the bug" --agent codex --model gpt-5-codex

// AFTER:
ralph "Fix the bug" --model gpt-5-codex
```

### Step 10: Update Iteration History

**File**: `ralph.ts`

**Update history tracking** (lines 263-285):

```typescript
// BEFORE:
interface IterationHistory {
  iteration: number;
  agent: AgentType;  // Was "opencode" | "claude-code" | "codex" | "copilot"
  model: string;
  // ...
}

// AFTER:
interface IterationHistory {
  iteration: number;
  agent: "opencode";  // Always this value
  model: string;
  // ...
}
```

**Update history display** (lines 647-651):

```typescript
// BEFORE:
const agentLabel = iter.agent ?? "unknown";
const modelLabel = iter.model ?? "unknown";
const agentModel = `${agentLabel} / ${modelLabel}`;

// AFTER (simpler):
const modelLabel = iter.model ?? "unknown";
const agentModel = `OpenCode / ${modelLabel}`;
```

### Step 11: Clean Up Status Display

**File**: `ralph.ts`

**Update --status output** (lines 557-562):

```typescript
// BEFORE:
if (!rotationActive) {
  const agentLabel = state.agent ? (AGENTS[state.agent]?.configName ?? state.agent) : "OpenCode";
  console.log(`   Agent:        ${agentLabel}`);
  if (state.model) console.log(`   Model:        ${state.model}`);
}

// AFTER:
console.log(`   Agent:        OpenCode`);
if (state.model) console.log(`   Model:        ${state.model}`);
```

**Update supervisor status** (lines 569-578):

```typescript
// BEFORE:
console.log(`   Sup Agent:    ${(AGENTS[state.supervisor.agent]?.configName ?? state.supervisor.agent)}`);

// AFTER:
console.log(`   Sup Agent:    OpenCode`);
```

### Step 12: Update Package Metadata

**File**: `package.json`

**Update keywords** (remove agent-specific terms):

```json
{
  "keywords": [
    "opencode",
    "ai",
    "ralph-wiggum",
    "iterative-development",
    "automation",
    "ai-agent",
    "coding-assistant",
    "llm",
    "self-correcting",
    "autonomous",
    "developer-tools",
    "cli",
    "bun",
    "typescript"
  ]
}

// REMOVED: "claude", "claude-code", "codex", "gpt"
```

---

## Testing Requirements

### Unit Tests

```typescript
// Test agent removal
describe("Agent Abstraction", () => {
  test("only OpenCode is available", () => {
    // Verify AGENTS only has opencode
    // Or verify AGENTS doesn't exist
  });
  
  test("--agent flag is rejected", () => {
    // Test that --agent throws error or is ignored
  });
  
  test("--rotation flag is rejected", () => {
    // Test that --rotation throws error or is ignored
  });
});
```

### Integration Tests

```bash
# Test that basic execution still works
ralph "Create hello.txt" --max-iterations 2

# Verify --agent is rejected
ralph "Task" --agent claude-code  # Should error

# Verify --rotation is rejected
ralph "Task" --rotation "opencode:model"  # Should error

# Verify supervisor works
ralph "Build API" --supervisor --max-iterations 5

# Verify model selection still works
ralph "Task" --model anthropic/claude-sonnet-4
```

### Breaking Change Verification

```bash
# These should all fail with clear error messages:
ralph "Task" --agent claude-code
ralph "Task" --agent codex
ralph "Task" --agent copilot
ralph "Task" --rotation "opencode:m1,claude-code:m2"
ralph "Task" --supervisor-agent codex
```

### Regression Tests

```bash
# These should still work:
ralph --status
ralph "Task" --max-iterations 5
ralph "Task" --tasks --max-iterations 5
ralph "Task" --supervisor --max-iterations 5
ralph "Task" --model anthropic/claude-sonnet-4
```

### Verification Checklist

- [ ] `--agent` flag removed/deprecated
- [ ] `--rotation` flag removed/deprecated
- [ ] `--supervisor-agent` flag removed/deprecated
- [ ] `--use-subprocess` flag removed/deprecated
- [ ] AGENTS record removed
- [ ] resolveCommand function removed
- [ ] validateAgent function removed
- [ ] Subprocess fallback removed
- [ ] Status display simplified
- [ ] Help text updated
- [ ] State structure simplified
- [ ] History tracking still works
- [ ] All iteration features work
- [ ] Clear error for removed flags

---

## Breaking Changes Summary

### Removed Flags

| Flag | Status | Alternative |
|------|--------|-------------|
| `--agent` | Removed | Not needed (always OpenCode) |
| `--rotation` | Removed | Not needed (single agent) |
| `--supervisor-agent` | Removed | Not needed (always OpenCode) |
| `--use-subprocess` | Removed | Not needed (SDK only) |

### Changed Behavior

| Aspect | Before | After |
|--------|--------|-------|
| Default execution | Subprocess | SDK |
| Supported agents | 4 (OpenCode, Claude, Codex, Copilot) | 1 (OpenCode) |
| Agent selection | Via `--agent` | None (fixed) |
| Rotation | Supported | Not supported |
| Supervisor agent | Configurable | Fixed (OpenCode) |

### Environment Variables Removed

- `RALPH_CLAUDE_BINARY`
- `RALPH_CODEX_BINARY`
- `RALPH_COPILOT_BINARY`
- `RALPH_OPENCODE_BINARY` (still valid but not used)

---

## Migration Guide (for Phase 4)

Draft content for README:

```markdown
## Migration from 1.x to 2.0.0

### Breaking Changes

1. **Multi-agent support removed**: Only OpenCode is supported
2. **SDK is default**: No longer spawns subprocess
3. **Rotation removed**: `--rotation` flag no longer exists

### Updating Your Commands

**Before:**
```bash
ralph "Build API" --agent claude-code --model claude-sonnet-4
```

**After:**
```bash
ralph "Build API" --model anthropic/claude-sonnet-4
```

**Before:**
```bash
ralph "Build API" --rotation "opencode:m1,claude-code:m2"
```

**After:**
```bash
# Not supported - use single model or manual switching
ralph "Build API" --model anthropic/claude-sonnet-4
```

**Before:**
```bash
ralph "Build API" --supervisor --supervisor-agent codex
```

**After:**
```bash
ralph "Build API" --supervisor
# Supervisor always uses OpenCode
```
```

---

## Success Criteria

Phase 3 is complete when:

1. All agent-related code removed
2. All subprocess fallback code removed
3. `--agent`, `--rotation`, `--supervisor-agent`, `--use-subprocess` flags removed
4. State structure simplified (no agent field)
5. Status display simplified
6. Help text updated
7. Clear error messages for removed flags
8. All tests pass
9. Package.json keywords updated

---

## Next Phase

After Phase 3 completion, proceed to [Phase 4: Cleanup and Documentation](./phase-4.md).

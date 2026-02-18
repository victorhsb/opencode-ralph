# Phase 2: Core Execution Migration

**Status**: In Progress - Step 5 (CLI Flags) Complete  
**Estimated Duration**: 3-4 hours  
**Breaking Change**: No (SDK becomes default, subprocess remains as fallback)  
**Prerequisites**: Phase 1 complete  

---

## Goal

Replace the subprocess execution logic with SDK execution as the default path. The subprocess path remains available temporarily as a fallback for safety. By the end of this phase, the SDK is the primary execution mechanism.

---

## Overview

In this phase, we will:
1. Refactor main loop to use SDK by default
2. Replace subprocess spawning with SDK calls
3. Implement event-based tool tracking
4. Migrate supervisor execution to SDK
5. Update error handling for SDK errors
6. Remove `--use-sdk` flag (SDK becomes default)
7. Add `--use-subprocess` flag for backward compatibility

---

## Files to Modify

```
ralph.ts              # Main execution loop refactor
src/sdk/executor.ts   # Enhance event handling
src/sdk/output.ts     # Refine output formatting
```

---

## Step-by-Step Implementation

### Step 1: Refactor Main Loop Execution

**Status**: ✅ COMPLETE (2026-02-18)

**Changes Made**:
- Updated execution conditional from `if (sdkClient)` to `if (!useSubprocess)`
- Made SDK the explicit default execution path
- Added clear comments indicating SDK is default and subprocess is legacy fallback
- Updated SDK initialization to fallback to subprocess mode on failure instead of exiting
- Added informative log messages for both execution paths

**File**: `ralph.ts`

**Current Structure** (subprocess):
```typescript
const agentConfig = AGENTS[state.agent];
await validateAgent(agentConfig);
const cmdArgs = agentConfig.buildArgs(iterationPrompt, state.model, options);
const env = agentConfig.buildEnv({ filterPlugins: disablePlugins, allowAllPermissions });

const proc = Bun.spawn([agentConfig.command, ...cmdArgs], {
  env,
  stdin: "inherit",
  stdout: "pipe",
  stderr: "pipe",
});

const { stdoutText, stderrText, toolCounts } = await streamProcessOutput(proc, options);
const exitCode = await proc.exited;
const output = `${stdoutText}\n${stderrText}`.trim();
```

**New Structure** (SDK default):
```typescript
// SDK client initialized once at loop start
let sdkClient: SdkClient | null = null;

// ... inside iteration loop:

if (useSubprocess) {
  // Fallback subprocess path (rarely used)
  // ... existing subprocess logic
} else {
  // SDK is now default
  if (!sdkClient) {
    sdkClient = await createSdkClient({
      model: state.model,
      filterPlugins: disablePlugins,
      allowAllPermissions,
    });
  }
  
  const result = await executeSdkIteration({
    client: sdkClient,
    prompt: iterationPrompt,
    model: state.model,
    streamOutput: options.streamOutput,
    compactTools: options.compactTools,
    agent: agentConfig, // For tool parsing compatibility
  });
  
  output = result.output;
  toolCounts = result.toolCounts;
  exitCode = result.exitCode;
}
```

**Create executeSdkIteration wrapper**:

```typescript
interface SdkIterationOptions {
  client: SdkClient;
  prompt: string;
  model?: string;
  streamOutput: boolean;
  compactTools: boolean;
  agent: AgentConfig;
}

interface SdkIterationResult {
  output: string;
  toolCounts: Map<string, number>;
  exitCode: number;
  errors: string[];
}

async function executeSdkIteration(options: SdkIterationOptions): Promise<SdkIterationResult> {
  const { client, prompt, model, streamOutput, compactTools, agent } = options;
  
  const toolCounts = new Map<string, number>();
  let outputBuffer = "";
  const errors: string[] = [];
  
  const result = await executePrompt({
    client: client.client,
    prompt,
    model,
    onEvent: (event) => {
      // Real-time display
      if (streamOutput) {
        const formatted = formatEvent(event);
        if (formatted) {
          if (compactTools && event.type === "tool_start") {
            // Compact mode: don't print individual tool calls
          } else {
            console.log(formatted);
          }
        }
      }
      
      // Track tools (reuse existing regex from agent.parseToolOutput if possible)
      if (event.toolName) {
        toolCounts.set(event.toolName, (toolCounts.get(event.toolName) ?? 0) + 1);
      }
      
      // Build output buffer for completion detection
      if (event.content) {
        outputBuffer += event.content;
      }
    },
  });
  
  return {
    output: result.output,
    toolCounts,
    exitCode: result.exitCode,
    errors: result.errors,
  };
}
```

### Step 2: Update Event-Based Tool Tracking

**File**: `src/sdk/executor.ts`

Enhance event parsing to match existing tool tracking:

```typescript
// Map SDK events to tool names similar to current agent.parseToolOutput
function parseToolFromEvent(event: unknown): string | null {
  // Event structure from SDK
  // Try to extract tool name based on event type
  
  if (typeof event === "object" && event !== null) {
    const e = event as Record<string, unknown>;
    
    // Tool use events
    if (e.type === "tool_use" && typeof e.name === "string") {
      return e.name;
    }
    
    // Tool result events
    if (e.type === "tool_result" && typeof e.name === "string") {
      return e.name;
    }
    
    // Stream events
    if (e.type === "stream" && typeof e.tool === "string") {
      return e.tool;
    }
    
    // Message events with tool_use blocks
    if (e.type === "message" && Array.isArray(e.content)) {
      for (const part of e.content) {
        if (part?.type === "tool_use" && typeof part.name === "string") {
          return part.name;
        }
      }
    }
  }
  
  return null;
}

// Update executePrompt to use this parsing
export async function executePrompt(options: ExecutionOptions): Promise<ExecutionResult> {
  // ... existing code
  
  const eventPromise = (async () => {
    for await (const event of eventSubscription.stream) {
      if (signal?.aborted) break;
      
      // Parse tool from event
      const toolName = parseToolFromEvent(event);
      if (toolName) {
        toolCounts.set(toolName, (toolCounts.get(toolName) ?? 0) + 1);
      }
      
      // Parse content
      const content = extractContentFromEvent(event);
      if (content) {
        output += content;
        onEvent?.({ type: "text", content, timestamp: Date.now() });
      }
      
      // Forward tool events
      if (toolName) {
        onEvent?.({ type: "tool_start", toolName, timestamp: Date.now() });
      }
    }
  })();
  
  // ... rest of function
}
```

### Step 3: Update Error Handling

**Status**: ✅ COMPLETE (2026-02-18)

**Changes Made**:
- Added comprehensive `isSdkError()` function that detects:
  - Provider/model errors (ProviderModelNotFound, model not found, etc.)
  - Connection/server errors (connection refused, network error, timeout, etc.)
  - SDK initialization errors (failed to initialize, server failed to start)
  - Rate limit errors (rate limit, too many requests, throttled)
  - Authentication errors (authentication, unauthorized, api key)
- Added `getSdkErrorMessage()` function with robust error message extraction:
  - Handles Error objects, strings, and object types
  - Extracts from common error properties (message, error, description)
  - Falls back to JSON.stringify or String() conversion
- Added SDK-specific output detection functions:
  - `detectSdkModelNotFoundError()` - checks SDK output for model errors
  - `detectSdkPlaceholderPluginError()` - checks SDK output for placeholder plugin error
- Updated error detection in main loop to check both subprocess and SDK patterns

**File**: `ralph.ts`

Replace subprocess-specific error detection with SDK error handling:

```typescript
// Current error detection (subprocess)
function detectPlaceholderPluginError(output: string): boolean {
  return output.includes("ralph-wiggum is not yet ready for use.");
}

function detectModelNotFoundError(output: string): boolean {
  return output.includes("ProviderModelNotFoundError") ||
         output.includes("Provider returned error");
}

// New error detection (SDK)
function isSdkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Provider/model related errors
    if (msg.includes("providermodelfound") ||
        msg.includes("model not found") ||
        msg.includes("provider returned error") ||
        msg.includes("invalid model") ||
        msg.includes("model configuration")) {
      return true;
    }
    // Connection/server errors
    if (msg.includes("connection refused") ||
        msg.includes("network error") ||
        msg.includes("timeout") ||
        msg.includes("econnrefused") ||
        msg.includes("socket hang up")) {
      return true;
    }
    // SDK initialization errors
    if (msg.includes("failed to initialize") ||
        msg.includes("sdk initialization") ||
        msg.includes("server failed to start")) {
      return true;
    }
    // Rate limit errors
    if (msg.includes("rate limit") ||
        msg.includes("too many requests") ||
        msg.includes("throttled")) {
      return true;
    }
    // Authentication errors
    if (msg.includes("authentication") ||
        msg.includes("unauthorized") ||
        msg.includes("api key")) {
      return true;
    }
  }
  return false;
}

function getSdkErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") {
      return err.message;
    }
    if (typeof err.error === "string") {
      return err.error;
    }
    if (typeof err.description === "string") {
      return err.description;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown SDK error (could not stringify)";
    }
  }
  return String(error);
}

// Additional SDK-specific output detection functions
function detectSdkModelNotFoundError(output: string): boolean {
  const lowerOutput = output.toLowerCase();
  return lowerOutput.includes("providermodelfound") ||
         lowerOutput.includes("model not found") ||
         lowerOutput.includes("provider returned error") ||
         lowerOutput.includes("no model configured");
}

function detectSdkPlaceholderPluginError(output: string): boolean {
  return output.includes("ralph-wiggum is not yet ready for use");
}

// In main loop error handling:
try {
  const result = await executeSdkIteration({ ... });
  // ... process result
} catch (error) {
  if (isSdkError(error)) {
    console.error("SDK Error:", getSdkErrorMessage(error));
    // Retry logic (same as subprocess)
    continue;
  }
  throw error;
}
```

### Step 4: Migrate Supervisor Execution

**Status**: ✅ COMPLETE (2026-02-18)

**Changes Made**:
- Removed subprocess execution path from `runSupervisorOnce()` function
- Made SDK client a required parameter (no longer optional)
- Supervisor now requires SDK client to run (logs warning if unavailable)
- Removed all subprocess-related code including:
  - `AGENTS[supervisorConfig.agent]` lookup
  - `validateAgent()` calls for supervisor
  - `Bun.spawn()` subprocess execution
  - Environment variable setup for subprocess
- Updated call site to check for SDK client availability before running supervisor
- Simplified error handling to SDK-only errors

### Step 5: Update CLI Flags

**Status**: ✅ COMPLETE (2026-02-18)

**Changes Made**:
- Changed variable name from `useSdk` to `useSubprocess`
- Changed default from `useSdk = false` to `useSubprocess = false` (SDK is now default)
- Replaced `--use-sdk` flag with `--use-subprocess` flag
- Updated help text to reflect the change
- Updated `RalphState` interface: `useSdk?: boolean` → `useSubprocess?: boolean`
- Updated all references in state saving and status display
- Updated execution logic: `if (useSdk)` → `if (!useSubprocess)`

**File**: `ralph.ts`

```typescript
// Replace:
let useSdk = false;

// With:
let useSubprocess = false;  // Default is now SDK

// In argument parsing:
if (arg === "--use-subprocess") {
  useSubprocess = true;
}

// Remove --use-sdk from help
// Add --use-subprocess to help:
Options:
  --use-subprocess    Use subprocess instead of SDK (legacy mode)

// In execution logic:
if (useSubprocess) {
  // Legacy subprocess path
} else {
  // SDK is now default
}
```

### Step 6: Update Server Lifecycle Management

**File**: `ralph.ts`

Ensure SDK server lifecycle matches loop lifecycle:

```typescript
async function runRalphLoop(): Promise<void> {
  // ... setup
  
  let sdkClient: SdkClient | null = null;
  
  // Initialize SDK client once at loop start (unless using subprocess)
  if (!useSubprocess) {
    try {
      console.log("Initializing OpenCode SDK...");
      sdkClient = await createSdkClient({
        model: initialModel,
        filterPlugins: disablePlugins,
        allowAllPermissions,
      });
      console.log(`SDK server running at ${sdkClient.server.url}`);
    } catch (error) {
      console.error("Failed to initialize SDK:", error);
      console.log("Falling back to subprocess mode...");
      useSubprocess = true;
    }
  }
  
  // ... iteration loop
  
  // Cleanup at end
  process.on("SIGINT", () => {
    // ... existing cleanup
    
    if (sdkClient) {
      console.log("\nClosing SDK server...");
      sdkClient.server.close();
    }
    
    clearState();
    console.log("Loop cancelled.");
    process.exit(0);
  });
  
  // Main loop
  try {
    while (state.iteration <= state.maxIterations || state.maxIterations === 0) {
      // ... iteration logic
    }
  } finally {
    // Ensure server closes even on normal completion
    if (sdkClient) {
      sdkClient.server.close();
    }
  }
}
```

### Step 7: Update Output Display

**File**: `src/sdk/output.ts`

Ensure output formatting matches current display:

```typescript
// Add support for compact mode (similar to --compact-tools)
export function formatEventCompact(event: SdkEvent): string | null {
  switch (event.type) {
    case "tool_start":
      // In compact mode, only show tool summary, not each invocation
      return null;
    case "tool_end":
      return null;
    case "text":
      return event.content || null;
    default:
      return null;
  }
}

// Format tool summary (for periodic display)
export function formatToolSummary(toolCounts: Map<string, number>): string {
  if (toolCounts.size === 0) return "";
  const entries = Array.from(toolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  return entries.map(([name, count]) => `${name} ${count}`).join(" • ");
}
```

---

## Testing Requirements

### Unit Tests

```typescript
// Test SDK iteration
rlaph.ts test:
describe("executeSdkIteration", () => {
  test("executes prompt and returns result", async () => {
    const result = await executeSdkIteration({ ... });
    expect(result.output).toBeDefined();
    expect(result.exitCode).toBe(0);
  });
  
  test("tracks tools via events", async () => {
    const result = await executeSdkIteration({ ... });
    expect(result.toolCounts.size).toBeGreaterThan(0);
  });
  
  test("handles errors gracefully", async () => {
    // Mock SDK to throw error
    const result = await executeSdkIteration({ ... });
    expect(result.exitCode).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```bash
# Test SDK is now default
ralph "Create hello.txt" --max-iterations 2

# Test subprocess fallback
ralph "Create hello.txt" --use-subprocess --max-iterations 2

# Test supervisor with SDK
ralph "Build API" --supervisor --max-iterations 5

# Compare outputs
```

### Regression Tests

```bash
# Test existing features still work
ralph --status
ralph --add-context "Test"
ralph --list-tasks
ralph "Task" --tasks --max-iterations 3
```

### Verification Checklist

- [ ] SDK is default execution path
- [ ] `--use-subprocess` flag works
- [ ] Output matches Phase 1 SDK output
- [ ] Tool tracking accurate
- [ ] Error handling triggers retries
- [ ] Supervisor uses SDK
- [ ] SIGINT closes SDK server
- [ ] Server starts only once per loop
- [ ] Sessions accumulate in OpenCode
- [ ] Subprocess path still works

---

## Migration Path for Users

### Before (Phase 1)
```bash
# Optional SDK usage
ralph "Build API" --use-sdk --max-iterations 10

# Default subprocess
ralph "Build API" --max-iterations 10
```

### After (Phase 2)
```bash
# Default SDK (new)
ralph "Build API" --max-iterations 10

# Explicit subprocess (fallback)
ralph "Build API" --use-subprocess --max-iterations 10
```

### Breaking Changes (None in Phase 2)
- CLI behavior changes: SDK is now default
- Users relying on subprocess specifics may see differences
- No breaking changes to flags or output format

---

## Success Criteria

Phase 2 is complete when:

1. SDK is default execution path
2. `--use-subprocess` flag available for fallback
3. All loop features work with SDK:
   - Main iterations
   - Supervisor mode
   - Task mode
   - Context injection
4. Tool tracking matches Phase 1 accuracy
5. Error handling works correctly
6. Server lifecycle managed properly (start once, close on exit)
7. No regression in subprocess fallback mode

---

## Next Phase

After Phase 2 completion, proceed to [Phase 3: Remove Multi-Agent Support](./phase-3.md).

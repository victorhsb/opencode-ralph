# Open Ralph Wiggum Architecture

## Overview

Open Ralph Wiggum implements the Ralph Wiggum technique - continuous self-referential AI loops for iterative development. The system orchestrates OpenCode agents in a persistent loop until a task is completed.

## System Architecture

### Components

1. **CLI Interface** (`ralph.ts`)
   - Command-line argument parsing
   - State management (.ralph/ directory)
   - Loop orchestration
   - Event handling (SIGINT, cleanup)

2. **SDK Client** (`src/sdk/client.ts`)
   - OpenCode SDK initialization
   - Server lifecycle management
   - Configuration mapping (model, permissions, plugins)
   - Server cleanup and shutdown

3. **Executor** (`src/sdk/executor.ts`)
   - Prompt execution via SDK
   - Event streaming (text, thinking, tool_use, tool_result)
   - Tool tracking via events
   - Error handling and detection

4. **Output Formatter** (`src/sdk/output.ts`)
   - Response formatting for display
   - Event display formatting
   - Text extraction from messages
   - Event string conversion

### Data Flow

```
User Input
    ↓
CLI Parser (ralph.ts)
    ↓
State Manager (load/save .ralph/)
    ↓
Loop Controller (runRalphLoop)
    ↓
SDK Client Initialization (createSdkClient)
    ↓
Main Loop:
    ├─→ Load context/tasks
    ├─→ Build prompt (with templates)
    ├─→ Execute via SDK (executePrompt)
    │   └─→ OpenCode SDK Server
    │       └─→ AI Agent
    ├─→ Stream events (text, tool_use, tool_result)
    ├─→ Track tools used
    ├─→ Format output (formatResponseParts)
    ├─→ Check for completion promise
    ├─→ Save state/history
    └─→ Check for task completion (if --tasks)
    ↓
Complete or Repeat
    ↓
Cleanup (close SDK server)
```

### State Management

State stored in `.ralph/` directory:

- `ralph-loop.state.json` - Active loop state (running/paused, iteration count, start time)
- `ralph-history.json` - Iteration history with metrics (duration, tools used, status)
- `ralph-context.md` - Pending context/hints for next iteration
- `ralph-tasks.md` - Task list for Tasks Mode (created when `--tasks` is used)
- `supervisor-suggestions.json` - Supervisor suggestions and approval status
- `supervisor-memory.md` - Rolling supervisor memory across iterations

### Session Lifecycle

1. **Loop Start**: Initialize SDK client (SDK server starts)
2. **Per Iteration**:
   - Create fresh session
   - Send prompt to SDK
   - Stream events in real-time
   - Collect response and tool usage
   - Session remains in OpenCode history
3. **Loop End**: Close SDK server (cleanup)

### SDK Integration

#### SDK Client (`src/sdk/client.ts`)

- **createSdkClient()**: Initializes OpenCode SDK client
  - Maps CLI options to SDK configuration
  - Handles model specification
  - Configures permissions (allow-all or interactive)
  - Filters plugins (if --no-plugins)

- **Server Lifecycle**:
  - One server per Ralph loop
  - Starts when loop begins
  - Persists across iterations
  - Closed on SIGINT or normal completion

#### Executor (`src/sdk/executor.ts`)

- **executePrompt()**: Executes a prompt via SDK
  - Creates new session per iteration
  - Subscribes to event stream
  - Tracks tools used via events
  - Returns execution result (text, tools used, completed)

#### Event Types

The SDK provides structured events:
- `text`: AI text output
- `thinking`: AI reasoning (optional)
- `tool_use`: Tool invocation start
- `tool_result`: Tool invocation end

### Tool Tracking

Tools are tracked via event observation:
1. Subscribe to SDK event stream
2. Parse `tool_use` events as they arrive
3. Increment counters for each tool type
4. Display periodic summaries during iteration
5. Store tool usage in iteration history

### Task Mode

When `--tasks` is enabled:

1. **Task File**: Tasks stored in `.ralph/ralph-tasks.md`
2. **One Task Per Iteration**: Ralph focuses on single task
3. **Automatic Progression**:
   - Agent outputs `<promise>READY_FOR_NEXT_TASK</promise>`
   - Ralph marks current task as complete
   - Moves to next incomplete task
4. **Task Status**:
   - `[ ]` - Not started
   - `[/]` - In progress
   - `[x]` - Complete

### Supervisor Mode

When `--supervisor` is enabled:

1. **After Each Coder Iteration**: Supervisor agent runs
2. **Reviews Output**: Analyzes state, history, tasks
3. **Suggests Actions**: Stored in `supervisor-suggestions.json`
   - `add_task`: Suggest new task
   - `add_context`: Add context hint
4. **User Approval**:
   - `ralph --approve-suggestion <id>` to apply
   - `ralph --reject-suggestion <id>` to reject

## Configuration

### Ralph Configuration

Via CLI flags:
- `--model MODEL`: Target model (e.g., anthropic/claude-sonnet-4)
- `--allow-all`: Auto-approve all permissions (default: on)
- `--no-allow-all`: Require interactive permission prompts
- `--no-plugins`: Disable non-auth plugins
- `--min-iterations N`: Minimum iterations before completion
- `--max-iterations N`: Stop after N iterations
- `--completion-promise TEXT`: Completion signal (default: COMPLETE)
- `--abort-promise TEXT`: Early abort signal

### SDK Configuration

Maps to OpenCode config:
- `model`: Provider/model specification
- `permission`: All "allow" when `--allow-all`, otherwise interactive
- `plugin`: Filtered when `--no-plugins` (auth plugins only)

### OpenCode Config

OpenCode reads from `~/.config/opencode/opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4",
  "apiKey": "...",
  "permissions": {...},
  "plugins": [...]
}
```

## Error Handling

1. **SDK Errors**: Caught and logged with `getSdkErrorMessage()`
2. **Error Detection**: `isSdkError()` checks for SDK-specific errors
3. **Retry Logic**: Same as subprocess mode (retry on transient errors)
4. **Timeout**: AbortSignal support for time limits
5. **Cleanup**: Server close on SIGINT (Ctrl+C)

## Performance Considerations

- **Server Startup**: Starts once per loop (not per iteration)
- **Event Streaming**: Real-time event flow avoids buffering
- **Tool Tracking**: Event-driven (no post-processing)
- **Session Management**: Fresh session per iteration, accumulate in OpenCode history
- **State Persistence**: Efficient JSON storage in .ralph/

## Security

- **API Keys**: Managed via OpenCode config (not environment variables)
- **Permissions**: Configurable (allow-all or interactive)
- **No Shell Execution**: SDK handles all tool invocations safely
- **Plugin Filtering**: Auth plugins only when `--no-plugins` is used

## Code Structure

```
ralph-wiggum/
├── ralph.ts                      # Main CLI entry point
├── src/
│   └── sdk/                      # SDK integration layer
│       ├── client.ts             # SDK client initialization
│       ├── executor.ts           # Prompt execution and event handling
│       └── output.ts             # Response and event formatting
├── .ralph/                       # Runtime state directory
│   ├── ralph-loop.state.json     # Active loop state
│   ├── ralph-history.json        # Iteration history
│   ├── ralph-context.md          # Pending context
│   ├── ralph-tasks.md            # Task list (when --tasks enabled)
│   ├── supervisor-suggestions.json  # Supervisor suggestions
│   └── supervisor-memory.md      # Supervisor memory
├── bin/
│   └── ralph.js                  # Compiled CLI wrapper
├── package.json                  # Package configuration
└── README.md                     # Documentation
```

## Extension Points

### Custom Prompt Templates

Use `--prompt-template PATH` to customize the prompt sent to the agent:

**Available variables:**
- `{{iteration}}` - Current iteration number
- `{{max_iterations}}` - Maximum iterations (or "unlimited")
- `{{min_iterations}}` - Minimum iterations
- `{{prompt}}` - The user's task prompt
- `{{completion_promise}}` - Completion promise text
- `{{abort_promise}}` - Abort promise text (if configured)
- `{{task_promise}}` - Task promise text (for tasks mode)
- `{{context}}` - Additional context added mid-loop
- `{{tasks}}` - Task list content (for tasks mode)

### Custom Supervisor Templates

Use `--supervisor-prompt-template PATH` to customize supervisor behavior.

## Design Decisions

### Why SDK Over Subprocess?

1. **Performance**: No subprocess overhead, direct API calls
2. **Reliability**: Better error handling, no parsing issues
3. **Simplicity**: No cross-platform binary resolution
4. **Events**: Real-time event streaming for better UX
5. **Setup**: No external CLI tools to install

### Why One Server Per Loop?

- Reduces startup overhead
- Maintains consistent configuration
- Enables session accumulation for context
- Clean shutdown on completion or interruption

### Why Fresh Session Per Iteration?

- Provides clean state for each iteration
- Allows agent to focus on current task
- Prevents session bloat
- Maintains clear iteration boundaries

### Why Event-Based Tool Tracking?

- Real-time feedback during iteration
- No post-processing required
- Accurate tool usage metrics
- Works across different output formats

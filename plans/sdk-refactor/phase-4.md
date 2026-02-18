# Phase 4: Cleanup and Documentation

**Status**: Not Started  
**Estimated Duration**: 2-3 hours  
**Breaking Change**: Yes (completing changes)  
**Prerequisites**: Phase 3 complete  
**Version Bump**: 2.0.0 (finalized)  

---

## Goal

Finalize the migration by cleaning up any remaining code, updating all documentation, and ensuring the codebase is ready for the 2.0.0 release. This phase focuses on polish, documentation, and removing any leftover artifacts.

---

## Overview

In this phase, we will:
1. Remove unused functions and imports
2. Clean up temporary files and configurations
3. Update README.md with migration guide
4. Update installation scripts
5. Add architecture documentation
6. Finalize package.json
7. Update .gitignore
8. Create CHANGELOG.md
9. Perform final regression testing

---

## Files to Modify

```
ralph.ts              # Final cleanup
README.md             # Complete rewrite
package.json          # Final version bump
install.sh            # Update checks
install.ps1           # Update checks
.gitignore            # Remove obsolete entries
CHANGELOG.md          # Create new file
ARCHITECTURE.md       # Create new file (optional)
```

---

## Step-by-Step Implementation

### Step 1: Remove Unused Functions

**File**: `ralph.ts`

After Phase 3, identify and remove any remaining unused code:

```typescript
// REMOVE if no longer used:

// Subprocess streaming (replaced by SDK events)
function streamProcessOutput(...)  // REMOVE

// Tool tracking from text (now event-based)
function collectToolSummaryFromText(...)  // REMOVE (if exists)

// ANSI stripping (if only for subprocess output parsing)
function stripAnsi(...)  // Keep if used elsewhere, else REMOVE

// Cross-platform checks (if only for subprocess)
const IS_WINDOWS = ...  // Keep if used elsewhere, else REMOVE

// Validation functions (now SDK handles this)
async function validateAgent(...)  // REMOVE (Phase 3)

// Command resolution (no longer needed)
function resolveCommand(...)  // REMOVE (Phase 3)
```

**Clean up imports**:

```typescript
// Review and remove unused imports:
import { $ } from "bun";  // Keep - used for git operations
import { ... } from "fs";  // Keep - used for state files
// etc.
```

### Step 2: Remove Config File Generation

**File**: `ralph.ts`

SDK handles configuration internally, so remove config file generation:

```typescript
// REMOVE: ensureRalphConfig function
function ensureRalphConfig(options: { ... }): string { ... }  // REMOVE

// REMOVE: loadPluginsFromConfig function
function loadPluginsFromConfig(configPath: string): string[] { ... }  // REMOVE

// SDK now handles plugin filtering and permissions internally
// No need to write temporary config files
```

**Update environment variable handling**:

```typescript
// REMOVE: OPENCODE_CONFIG env var setting
// Was used in buildEnv for opencode agent
// SDK handles config internally
```

### Step 3: Update State Directory

**File**: `ralph.ts`

Review state files and remove obsolete ones:

```typescript
// Current state files (keep all):
const stateDir = join(process.cwd(), ".ralph");
const statePath = join(stateDir, "ralph-loop.state.json");
const contextPath = join(stateDir, "ralph-context.md");
const historyPath = join(stateDir, "ralph-history.json");
const tasksPath = join(stateDir, "ralph-tasks.md");
const supervisorMemoryPath = join(stateDir, "supervisor-memory.md");
const supervisorSuggestionsPath = join(stateDir, "supervisor-suggestions.json");

// REMOVE (if exists):
const legacyConfigPath = join(stateDir, "ralph-opencode.config.json");  // REMOVE
```

### Step 4: Update .gitignore

**File**: `.gitignore`

Remove obsolete entries:

```diff
# Keep these:
.ralph/ralph-loop.state.json
.ralph/ralph-history.json
.ralph/ralph-context.md
.ralph/ralph-tasks.md
.ralph/supervisor-memory.md
.ralph/supervisor-suggestions.json

# REMOVE these (SDK doesn't need):
-.ralph/ralph-opencode.config.json
```

### Step 5: Update Package.json

**File**: `package.json`

**Update version**:

```json
{
  "name": "@th0rgal/ralph-wiggum",
  "version": "2.0.0",
  "description": "Ralph Wiggum technique for iterative AI development with OpenCode SDK"
}
```

**Update description** (remove multi-agent references):

```json
{
  "description": "Ralph Wiggum technique for iterative AI development loops with OpenCode"
}
```

**Update keywords** (already done in Phase 3, verify):

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
```

**Add SDK dependency** (verify from Phase 1):

```json
{
  "dependencies": {
    "@opencode-ai/sdk": "^1.0.0"
  }
}
```

**Update repository references** (if changed):

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/victorhsb/open-ralph-wiggum.git"
  }
}
```

### Step 6: Update Installation Scripts

**File**: `install.sh`

Update to reflect SDK-only requirements:

```bash
#!/bin/bash

echo "Installing Open Ralph Wiggum..."

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo "Error: Bun is required but not installed."
    echo "Install Bun: https://bun.sh"
    exit 1
fi

# OpenCode CLI is NOT required - we use the SDK
# But warn if OpenCode CLI is not installed (for reference)
if ! command -v opencode &> /dev/null; then
    echo "Note: OpenCode CLI not found. Not required - uses SDK."
    echo "      Install if you want CLI access: npm install -g opencode-ai"
fi

# Install dependencies
bun install

# Link for global access
bun link

echo "Installation complete!"
echo ""
echo "Usage: ralph \"<prompt>\" [options]"
```

**File**: `install.ps1`

```powershell
# Similar updates for PowerShell
```

### Step 7: Rewrite README.md

**File**: `README.md`

Major sections to rewrite:

#### Header

```markdown
# Open Ralph Wiggum

**Autonomous Agentic Loop for OpenCode**

> ⚠️ **Version 2.0.0** - Now uses OpenCode SDK directly. See [Migration Guide](#migration-from-1x-to-200).
```

#### Supported Agents

```markdown
## Supported Platform

Open Ralph Wiggum works exclusively with **OpenCode** using the official SDK.

| Platform | Requirement |
|----------|-------------|
| **OpenCode** | SDK v1.0.0+ (bundled) |
```

#### Prerequisites

```markdown
## Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)
- OpenCode account (API key configured in `~/.config/opencode/opencode.json`)

No external CLI tools required - everything is bundled.
```

#### Installation

```markdown
## Installation

### npm

```bash
npm install -g @th0rgal/ralph-wiggum
```

### Bun

```bash
bun add -g @th0rgal/ralph-wiggum
```

### From Source

```bash
git clone https://github.com/victorhsb/open-ralph-wiggum
cd open-ralph-wiggum
./install.sh
```
```

#### Quick Start

```markdown
## Quick Start

```bash
# Simple task
ralph "Create a hello.txt file" --max-iterations 5

# With specific model
ralph "Build API" --model anthropic/claude-sonnet-4 --max-iterations 10

# With supervisor
ralph "Build API" --supervisor --max-iterations 15

# Tasks mode
ralph "Build full-stack app" --tasks --max-iterations 50
```
```

#### Migration Guide Section

```markdown
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
```

#### Commands Section

```markdown
## Commands

### Running a Loop

```bash
ralph "<prompt>" [options]

Options:
  --model MODEL            Model to use (e.g., anthropic/claude-sonnet-4)
  --min-iterations N       Minimum iterations before completion (default: 1)
  --max-iterations N       Stop after N iterations (default: unlimited)
  --completion-promise T   Text that signals completion (default: COMPLETE)
  --tasks, -t              Enable Tasks Mode
  --supervisor             Enable supervisor loop
  --no-plugins             Disable non-auth plugins
  --allow-all              Auto-approve all permissions (default: on)
  --help                   Show help
```

### Monitoring & Control

```bash
ralph --status           # Check loop status
ralph --add-context      # Inject hints mid-loop
ralph --list-tasks       # Show current tasks
```
```

#### Troubleshooting

```markdown
## Troubleshooting

### SDK Not Found

The SDK is bundled with the package. If you see SDK errors:

1. Ensure OpenCode is configured: `~/.config/opencode/opencode.json`
2. Check your API credentials are set
3. Verify network connectivity to OpenCode

### Model Not Configured

If you see model errors:

```bash
# Set default model in config
# Edit ~/.config/opencode/opencode.json:
{
  "model": "anthropic/claude-sonnet-4"
}

# Or use --model flag
ralph "task" --model anthropic/claude-sonnet-4
```
```

#### Architecture

```markdown
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
```

### Step 8: Create CHANGELOG.md

**File**: `CHANGELOG.md` (new file)

```markdown
# Changelog

All notable changes to Open Ralph Wiggum.

## [2.0.0] - YYYY-MM-DD

### Breaking Changes

- **SDK Migration**: Migrated from subprocess execution to OpenCode SDK
- **Removed Multi-Agent Support**: Claude Code, Codex, and Copilot CLI no longer supported
- **Removed Flags**:
  - `--agent` (no longer needed, always OpenCode)
  - `--rotation` (no longer supported)
  - `--supervisor-agent` (supervisor always uses OpenCode)
  - `--use-subprocess` (SDK is now default)
- **Removed Environment Variables**:
  - `RALPH_CLAUDE_BINARY`
  - `RALPH_CODEX_BINARY`
  - `RALPH_COPILOT_BINARY`
  - `RALPH_OPENCODE_BINARY`

### Added

- Direct OpenCode SDK integration (`@opencode-ai/sdk`)
- Real-time event streaming for tool tracking
- Improved performance (no subprocess overhead)
- Simplified setup (no external CLIs required)

### Changed

- Default execution now uses SDK instead of subprocess
- Server lifecycle: starts once per loop, persists until completion
- Sessions: fresh per iteration, accumulate in OpenCode history

### Removed

- Subprocess-based agent execution
- Cross-platform binary resolution
- Agent-specific output parsing
- Temporary config file generation

## [1.2.1] - Previous Version

- Last version with multi-agent support
- Subprocess-based execution
- Support for OpenCode, Claude Code, Codex, and Copilot CLI
```

### Step 9: Create Architecture Document (Optional)

**File**: `ARCHITECTURE.md` (new file)

```markdown
# Open Ralph Wiggum Architecture

## Overview

Open Ralph Wiggum implements the Ralph Wiggum technique - continuous self-referential AI loops for iterative development.

## System Architecture

### Components

1. **CLI Interface** (`ralph.ts`)
   - Command-line argument parsing
   - State management
   - Loop orchestration

2. **SDK Client** (`src/sdk/client.ts`)
   - OpenCode SDK initialization
   - Server lifecycle management
   - Configuration mapping

3. **Executor** (`src/sdk/executor.ts`)
   - Prompt execution
   - Event streaming
   - Tool tracking

4. **Output Formatter** (`src/sdk/output.ts`)
   - Response formatting
   - Event display

### Data Flow

```
User Input
    ↓
CLI Parser
    ↓
State Manager (load/save .ralph/)
    ↓
Loop Controller
    ↓
SDK Executor
    ↓
OpenCode Server
    ↓
AI Response
    ↓
Completion Detector
    ↓
Repeat or Exit
```

### State Management

State stored in `.ralph/`:
- `ralph-loop.state.json`: Active loop state
- `ralph-history.json`: Iteration history
- `ralph-context.md`: Pending context
- `ralph-tasks.md`: Task list
- `supervisor-memory.md`: Supervisor decisions
- `supervisor-suggestions.json`: Pending suggestions

### Session Lifecycle

1. **Loop Start**: Initialize SDK client (server starts)
2. **Per Iteration**:
   - Create fresh session
   - Send prompt
   - Stream events
   - Collect response
   - (Session remains in OpenCode history)
3. **Loop End**: Close SDK server

### Event Types

The SDK provides structured events:
- `text`: AI text output
- `thinking`: AI reasoning (optional)
- `tool_use`: Tool invocation start
- `tool_result`: Tool invocation end

### Tool Tracking

Tools are tracked via event observation:
1. Subscribe to event stream
2. Parse tool_use events
3. Increment counters
4. Display periodic summaries

## Configuration

### Ralph Configuration

Via CLI flags:
- `--model`: Target model
- `--allow-all`: Permission mode
- `--no-plugins`: Plugin filtering

### SDK Configuration

Maps to OpenCode config:
- `model`: Provider/model specification
- `permission`: All "allow" when `--allow-all`
- `plugin`: Filtered when `--no-plugins`

## Error Handling

1. **SDK Errors**: Caught and logged
2. **Retry Logic**: Same as subprocess mode
3. **Timeout**: AbortSignal support
4. **Cleanup**: Server close on SIGINT

## Performance Considerations

- Server starts once per loop (not per iteration)
- Event streaming avoids buffering
- Tool tracking is event-driven
- Sessions accumulate (no cleanup needed)

## Security

- API keys via OpenCode config (not env vars)
- Permissions configurable
- No shell execution (SDK handles it)
```

### Step 10: Final Regression Testing

Create comprehensive test script:

```bash
#!/bin/bash
# test-regression.sh

echo "Running Ralph 2.0.0 Regression Tests..."

# Test 1: Basic execution
echo "Test 1: Basic execution"
ralph "Create a file named test1.txt with 'hello'" --max-iterations 3

# Test 2: Model selection
echo "Test 2: Model selection"
ralph "Create a file named test2.txt" --model anthropic/claude-sonnet-4 --max-iterations 2

# Test 3: Tasks mode
echo "Test 3: Tasks mode"
ralph "Create test3a.txt and test3b.txt" --tasks --max-iterations 5

# Test 4: Supervisor
echo "Test 4: Supervisor"
ralph "Create test4.txt" --supervisor --max-iterations 3

# Test 5: Context injection
echo "Test 5: Context injection"
ralph --add-context "Use uppercase" "Create test5.txt"

# Test 6: Status
echo "Test 6: Status"
ralph --status

# Test 7: Help
echo "Test 7: Help"
ralph --help

# Test 8: Version
echo "Test 8: Version"
ralph --version

echo "Regression tests complete!"
```

---

## Verification Checklist

### Code Cleanup

- [ ] All unused functions removed
- [ ] All unused imports removed
- [ ] Temporary files cleaned up
- [ ] No commented-out code
- [ ] Consistent formatting

### Documentation

- [ ] README.md updated
- [ ] CHANGELOG.md created
- [ ] Migration guide complete
- [ ] Architecture document (optional)
- [ ] Examples updated
- [ ] Troubleshooting section current

### Package

- [ ] Version bumped to 2.0.0
- [ ] Description updated
- [ ] Keywords updated
- [ ] Dependencies correct
- [ ] Installation scripts updated

### Configuration

- [ ] .gitignore updated
- [ ] No obsolete entries
- [ ] State directory documented

### Tests

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Regression tests pass
- [ ] Manual testing complete
- [ ] Breaking changes documented

---

## Release Checklist

Before tagging 2.0.0:

1. [ ] All Phase 4 tasks complete
2. [ ] Documentation reviewed
3. [ ] Tests passing
4. [ ] CHANGELOG finalized
5. [ ] Version bumped
6. [ ] git tag v2.0.0
7. [ ] npm publish
8. [ ] GitHub release notes

---

## Success Criteria

Phase 4 is complete when:

1. All code cleanup done
2. README.md fully updated
3. CHANGELOG.md created
4. Installation scripts work
5. All tests pass
6. No breaking change regressions
7. Documentation accurate
8. Package ready for publish

---

## End of Migration

After Phase 4, Open Ralph Wiggum 2.0.0 is complete:

- ✅ SDK-based execution
- ✅ Single agent (OpenCode)
- ✅ Clean codebase
- ✅ Updated documentation
- ✅ Ready for release

---

**Next Action**: Tag release v2.0.0 and publish to npm.

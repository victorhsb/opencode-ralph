# Changelog

All notable changes to Open Ralph Wiggum.

## [2.0.0] - 2025-02-18

### Breaking Changes

- **SDK Migration**: Migrated from subprocess execution to OpenCode SDK
- **Removed Multi-Agent Support**: Claude Code, Codex, and Copilot CLI no longer supported
- **Removed Flags**:
  - `--agent` (no longer needed, always OpenCode)
  - `--rotation` (no longer supported)
  - `--supervisor-agent` (supervisor always uses OpenCode)
  - `--use-subprocess` (SDK is now default and only execution path)
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
- Server lifecycle management (one SDK server per loop)
- Event-based tool tracking via SDK events

### Changed

- Default execution now uses SDK instead of subprocess
- Server lifecycle: starts once per loop, persists until completion
- Sessions: fresh per iteration, accumulate in OpenCode history
- Error detection updated for SDK-specific error messages
- Status command now always shows OpenCode (removed rotation info)

### Removed

- Subprocess-based agent execution
- Cross-platform binary resolution
- Agent-specific output parsing
- Temporary config file generation
- Multi-agent rotation system
- AGENTS record and agent type system
- Agent CLI flags: `--agent`, `--rotation`, `--supervisor-agent`
- Subprocess execution code: `streamProcessOutput`, `validateAgent`, `extractClaudeStreamDisplayLines`
- Configuration file generation: `ensureRalphConfig`, `loadPluginsFromConfig`

### Internal

- Added `src/sdk/` directory with SDK integration modules
- Implemented `createSdkClient` for SDK client initialization
- Implemented `executePrompt` for prompt execution via SDK
- Implemented `formatResponseParts` for output formatting
- Implemented event subscription and parsing for tool tracking
- Added SDK server cleanup on SIGINT and normal completion
- Updated supervisor execution to accept SDK client parameter
- Refactored iteration history to remove agent field

## [1.2.1] - Previous Version

- Last version with multi-agent support
- Subprocess-based execution
- Support for OpenCode, Claude Code, Codex, and Copilot CLI

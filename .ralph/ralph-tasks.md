# Ralph Tasks - SDK Migration

## Phase 1: SDK Infrastructure

- [x] Add @opencode-ai/sdk dependency to package.json
- [x] Create src/sdk directory structure
- [x] Create src/sdk/client.ts with createSdkClient function
- [x] Implement SdkClientOptions interface in client.ts
- [x] Implement configuration mapping (model, permissions, plugins) in client.ts
- [x] Create src/sdk/executor.ts with executePrompt function
- [x] Implement ExecutionResult and ExecutionOptions interfaces in executor.ts
- [x] Implement event subscription and parsing in executor.ts
- [x] Implement tool tracking via events in executor.ts
- [x] Create src/sdk/output.ts with formatResponseParts function
- [x] Implement extractTextFromMessage function in output.ts
- [x] Implement formatEvent function in output.ts
- [x] Add --use-sdk CLI flag to ralph.ts
- [x] Import SDK modules in ralph.ts
- [x] Add SDK client initialization in runRalphLoop
- [x] Add conditional SDK execution path (parallel to subprocess)
- [x] Update supervisor execution with SDK path
- [x] Test SDK execution with --use-sdk flag
- [x] Verify tool tracking works via SDK events
- [x] Verify output format matches subprocess mode

## Phase 2: Core Execution Migration

- [x] Create executeSdkIteration wrapper function
- [x] Replace --use-sdk with --use-subprocess flag (invert default)
- [x] Make SDK the default execution path in main loop
- [x] Update error detection for SDK errors
- [x] Add isSdkError and getSdkErrorMessage functions
- [x] Update runSupervisorOnce to accept sdkClient parameter
- [x] Remove subprocess path from supervisor (make SDK default)
- [x] Implement SDK server lifecycle management (start once per loop)
- [x] Add SDK server cleanup on SIGINT
- [x] Add SDK server cleanup on normal completion
- [x] Test SDK is now default execution and `--use-subprocess` fallback still works
- [x] Verify error handling triggers retries correctly

## Phase 3: Remove Multi-Agent Support

- [x] **P3-T1: Remove Agent Type System** - Remove AGENTS record. (AGENT_TYPES, AgentType, AgentEnvOptions, AgentBuildArgsOptions, AgentConfig, resolveCommand already removed.)

- [x] **P3-T2: Remove Agent CLI Flags** - Remove --agent, --rotation, --supervisor-agent flags from argument parsing. Remove parseRotationInput function, rotation variables, and rotation/rotationIndex from RalphState. Update SupervisorConfig to remove agent field.

- [x] **P3-T3: Remove Subprocess Execution** - Remove --use-subprocess flag, subprocess execution code, streamProcessOutput, validateAgent, extractClaudeStreamDisplayLines, IS_WINDOWS constant, loadPluginsFromConfig, and ensureRalphConfig. SDK is now the only execution path.

- [x] **P3-T4: Update Displays & Metadata** - Update --status to always show OpenCode (remove rotation info), fix IterationHistory agent field, update help text and examples to remove agent options, remove agent-related keywords from package.json. Test that removed flags produce clear errors.

## Phase 4: Cleanup & Documentation

- [x] **P4-T1: Code Cleanup** - Remove unused imports from ralph.ts, remove OPENCODE_CONFIG env var handling, update .gitignore to remove ralph-opencode.config.json entry.

- [x] **P4-T2: Package & Install Updates** - Update package.json version to 2.0.0, update description, update install.sh and install.ps1 to remove multi-agent checks and note SDK-only requirements.

- [ ] **P4-T3: README Rewrite** - Rewrite header (v2.0.0 notice), prerequisites, installation, quick start, commands, and troubleshooting sections. Add migration guide showing command changes (before/after examples). Remove all agent-specific sections.

- [ ] **P4-T4: Release Preparation** - Create CHANGELOG.md with v2.0.0 entry documenting breaking changes, removed flags, added SDK features. Create ARCHITECTURE.md (optional). Run comprehensive regression tests and verify all features work.

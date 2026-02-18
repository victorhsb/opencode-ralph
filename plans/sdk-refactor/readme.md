# Open Ralph Wiggum 2.0.0: SDK Migration Plan

**Version**: 2.0.0  
**Status**: Planning Phase  
**Estimated Effort**: 11-16 hours

---

## Executive Summary

This plan outlines the migration of Open Ralph Wiggum from subprocess-based execution to direct OpenCode SDK integration. This is a **breaking change** that will:

- Replace subprocess spawning (`Bun.spawn`) with the OpenCode SDK (`@opencode-ai/sdk`)
- Remove multi-agent support (Claude Code, Codex, GitHub Copilot CLI)
- Focus exclusively on OpenCode as the execution engine
- Maintain all existing Ralph-specific features (tasks mode, supervisor, context injection, etc.)
- Keep model flexibility via the `--model` flag

### Why 2.0.0?

This is a **breaking change** that fundamentally alters the architecture:
- CLI now requires the OpenCode SDK instead of external binaries
- Removed support for other AI agents
- Changed execution model from subprocess to SDK client/server

---

## Architecture Overview (Post-Migration)

```
┌─────────────────────────────────────────────────────────────┐
│                     Ralph CLI Process                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 Main Event Loop                          ││
│  │  ┌──────────────┐      ┌─────────────────────────────┐ ││
│  │  │  Iteration N │ ───▶ │  SDK Client                 │ ││
│  │  │              │      │  ┌───────────────────────┐  │ ││
│  │  │  - Build     │      │  │ Server (127.0.0.1:4096)│  │ ││
│  │  │    prompt    │      │  │                       │  │ ││
│  │  │  - Call SDK  │      │  │ ┌─────────────────┐   │  │ ││
│  │  │  - Check     │      │  │ │ Fresh Session   │   │  │ ││
│  │  │    response  │      │  │ │ ┌─────────────┐ │   │  │ ││
│  │  │  - Track     │      │  │ │ │ Prompt      │ │   │  │ ││
│  │  │    tools     │      │  │ │ │ ↓           │ │   │  │ ││
│  │  │  - Detect    │      │  │ │ │ AI Response │ │   │  │ ││
│  │  │    complete  │      │  │ │ │ ↓           │ │   │  │ ││
│  │  │              │      │  │ │ │ Tool Calls  │ │   │  │ ││
│  │  └──────────────┘      │  │ │ └─────────────┘ │   │  │ ││
│  │                         │  │ └─────────────────┘   │  │ ││
│  │                         │  └───────────────────────┘  │ ││
│  │                         └─────────────────────────────┘ ││
│  │                                    │                     ││
│  │                         Event Stream (real-time)        ││
│  │                                    │                     ││
│  │                         ↓ Parse events for tool tracking  ││
│  │                                    │                     ││
│  │                         ┌──────────┴──────────┐         ││
│  │                         │ Output + Tool Stats   │         ││
│  │                         └──────────────────────┘         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                                    │
                                    │ Iteration Complete?
                                    │
                              ┌─────▼─────┐
                              │  Repeat   │
                              │  Next     │
                              │  Iteration│
                              └───────────┘

Key Principle: One SDK server per Ralph loop, fresh session per iteration.
```

### Server Lifecycle

- **Server starts**: Once when Ralph loop begins (`createOpencode()`)
- **Server persists**: Throughout entire Ralph loop execution
- **Sessions**: Fresh session created per iteration (no persistence across iterations)
- **Server stops**: When Ralph loop ends or is interrupted (SIGINT)

### What Stays the Same

| Feature | Status |
|---------|--------|
| Task mode (`--tasks`) | ✅ Preserved |
| Supervisor mode | ✅ Preserved |
| Context injection (`--add-context`) | ✅ Preserved |
| Prompt templates | ✅ Preserved |
| Completion promise detection | ✅ Preserved |
| History tracking | ✅ Preserved |
| Max/min iterations | ✅ Preserved |
| Model selection (`--model`) | ✅ Preserved |
| State persistence (`.ralph/`) | ✅ Preserved |

### What's Removed

| Feature | Status |
|---------|--------|
| Claude Code support | ❌ Removed |
| Codex support | ❌ Removed |
| Copilot CLI support | ❌ Removed |
| Agent rotation (`--rotation`) | ❌ Removed |
| Agent selection (`--agent`) | ❌ Removed |
| Supervisor agent selection | ❌ Removed (uses same agent) |
| External binary spawning | ❌ Removed |

---

## Directory Structure

```
plans/sdk-refactor/
├── readme.md           # This file - overview and index
├── phase-1.md          # SDK Infrastructure
├── phase-2.md          # Core Execution Migration
├── phase-3.md          # Remove Multi-Agent Support
└── phase-4.md          # Cleanup and Documentation
```

---

## Phase Summary

| Phase | Name | Duration | Key Deliverable | Breaking? |
|-------|------|----------|-----------------|-----------|
| Phase 1 | SDK Infrastructure | 4-6 hours | SDK modules added, `--use-sdk` flag | No |
| Phase 2 | Core Execution | 3-4 hours | SDK becomes default execution path | No* |
| Phase 3 | Remove Multi-Agent | 2-3 hours | Clean removal of agent abstraction | Yes |
| Phase 4 | Cleanup & Docs | 2-3 hours | Updated README, architecture docs | Yes |

*Phase 2 adds SDK as default but maintains subprocess fallback temporarily

---

## Implementation Order

```
Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4
   │           │           │           │
   │           │           │           └─▶ Updated README.md
   │           │           │           └─▶ Architecture docs
   │           │           │           └─▶ Final cleanup
   │           │           │
   │           │           └─▶ Remove AGENTS record
   │           │           └─▶ Remove --rotation
   │           │           └─▶ Remove --agent flag
   │           │
   │           └─▶ Replace Bun.spawn with SDK
   │           └─▶ Event-based tool tracking
   │           └─▶ Remove --use-sdk flag
   │
   └─▶ Create SDK client module
   └─▶ Create execution module
   └─▶ Create output formatter
   └─▶ Add --use-sdk flag
```

---

## Key Technical Decisions

### 1. Server Lifecycle: Long-Running Server

**Decision**: Start SDK server once at loop start, keep running until loop ends.

**Rationale**:
- Avoid server startup overhead per iteration
- Sessions are still fresh per iteration
- Simpler error handling

**Implementation**:
```typescript
// Loop start
const { client, server } = await createSdkClient(config);

// Each iteration
const session = await client.session.create({ body: { title: `Iteration ${n}` } });
const result = await client.session.prompt({ ... });
// Session left to accumulate in OpenCode history

// Loop end (cleanup)
server.close();
```

### 2. Event Streaming: Real-Time Tool Tracking

**Decision**: Use `client.event.subscribe()` for real-time tool usage tracking.

**Rationale**:
- Maintains "live output" feel of current implementation
- More reliable than stdout parsing
- Structured data instead of regex matching

**Event Types to Handle**:
- Tool invocation events
- Tool result events
- Message part events (text, thinking, tool_use)

### 3. Model Flexibility: Preserve `--model`

**Decision**: Keep `--model` flag for model selection within OpenCode.

**Rationale**:
- Users may want different models for different tasks
- Supervisor may use different model than main loop
- Aligns with OpenCode's multi-model support

**Usage**:
```bash
ralph "Build API" --model anthropic/claude-sonnet-4
ralph "Build API" --model openai/gpt-4o
```

### 4. Session Handling: Fresh Per Iteration

**Decision**: Create new session for each iteration.

**Rationale**:
- Maintains Ralph's "fresh start" philosophy
- Each iteration sees same prompt without prior conversation context
- Matches current subprocess behavior
- Sessions accumulate in OpenCode history for reference

---

## SDK Configuration Mapping

Current Ralph options → SDK Config:

| Ralph Option | SDK Config Field | Notes |
|--------------|------------------|-------|
| `--model` | `config.model` | Provider/model format preserved |
| `--allow-all` | `config.permission` | Map to permission object |
| `--no-plugins` | `config.plugin` | Filter to auth-only |
| N/A | `config.hostname` | 127.0.0.1 (default) |
| N/A | `config.port` | 4096 (default) |

**Permission Mapping**:
```typescript
config.permission = {
  read: "allow",
  edit: "allow",
  glob: "allow",
  grep: "allow",
  list: "allow",
  bash: "allow",
  // ... etc
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SDK API changes | Medium | High | Pin SDK version in package.json |
| Performance regression | Low | Medium | Benchmark before/after migration |
| Event stream errors | Medium | Medium | Add timeout and error recovery |
| Breaking user workflows | High | Medium | Major version bump + migration guide |
| Server startup failures | Low | High | Retry logic with exponential backoff |

---

## Testing Checklist

### Phase 1
- [ ] SDK client initializes correctly
- [ ] SDK server starts/stops properly
- [ ] `--use-sdk` flag works
- [ ] Output matches subprocess mode
- [ ] Tool tracking counts match

### Phase 2
- [ ] SDK becomes default execution
- [ ] Event streaming displays correctly
- [ ] Tool tracking works via events
- [ ] Error handling triggers retries
- [ ] Supervisor mode uses SDK
- [ ] SIGINT cleanup works

### Phase 3
- [ ] No agent-related code remains
- [ ] `--rotation` removed
- [ ] `--agent` removed
- [ ] State structure simplified
- [ ] All tests pass

### Phase 4
- [ ] README updated
- [ ] Examples updated
- [ ] Architecture documented
- [ ] Installation scripts updated
- [ ] Full regression test

---

## Next Steps

1. Review all phase documents
2. Create feature branch: `v2-sdk-migration`
3. Begin Phase 1 implementation
4. Test each phase before proceeding
5. Merge to main when complete
6. Tag release: `v2.0.0`

---

## References

- [OpenCode SDK Documentation](https://opencode.ai/docs/pt-br/sdk/)
- [Original Ralph Wiggum Technique](https://ghuntley.com/ralph/)
- OpenCode SDK Package: `@opencode-ai/sdk`

---

## Phase Documents

- [Phase 1: SDK Infrastructure](./phase-1.md)
- [Phase 2: Core Execution Migration](./phase-2.md)
- [Phase 3: Remove Multi-Agent Support](./phase-3.md)
- [Phase 4: Cleanup and Documentation](./phase-4.md)

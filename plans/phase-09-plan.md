# Phase 09: Documentation Improvements

## 0) Metadata

- Phase number and name: 09 - Documentation Improvements
- Task label: Create ADRs, CONTRIBUTING.md, and API docs
- Depends on phase(s): 06, 08
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 3-5 iterations

## 1) Objective

- Primary outcome: Architecture Decision Records, contributor guidelines, and generated API documentation
- Why this phase now: Lower priority but valuable for project maturity; documents decisions from previous phases

## 2) Scope

- In scope for this phase:
  - Create `docs/adr/` directory
  - Write ADRs for key decisions:
    - Why SDK over subprocess?
    - Why JSON over SQLite (or decision from Phase 11)?
    - Why Bun over Node?
    - Configuration file design (Phase 05)
    - Error handling strategy (Phase 04)
  - Create `CONTRIBUTING.md` with development setup
  - Document release process
  - Generate API docs from TypeScript using TypeDoc (optional)

- Out of scope for this phase:
  - Rewriting all existing documentation
  - Video tutorials
  - External blog posts

## 3) Required Context to Load First

### Required Files and Docs

- `README.md` - Existing documentation
- `ARCHITECTURE.md` - Architecture overview
- `docs/improvement-plan.md` - Decisions made
- History of key decisions (from git log if needed)

### Optional Deep-Dive Resources

- ADR templates and examples
- TypeDoc documentation

## 4) Constraints and Contracts

- Documentation standards:
  - Keep ADRs concise but complete
  - Use established ADR format
  - CONTRIBUTING.md should be actionable

## 5) Implementation Plan

1. **Create docs/adr/ directory**
   - `mkdir -p docs/adr`

2. **Write ADR 001: SDK over Subprocess**
   - Create `docs/adr/001-sdk-over-subprocess.md`:
   ```markdown
   # ADR 001: Use SDK Instead of Subprocess

   ## Status
   Accepted

   ## Context
   Ralph needed to integrate with OpenCode. Two options:
   - Subprocess: Spawn opencode CLI
   - SDK: Use @opencode-ai/sdk directly

   ## Decision
   Use the SDK for tighter integration, better type safety, and programmatic control.

   ## Consequences
   - Positive: Type safety, better error handling, direct API access
   - Negative: Dependency on SDK version, tighter coupling
   ```

3. **Write ADR 002: JSON over SQLite**
   - Create `docs/adr/002-json-over-sqlite.md`:
   ```markdown
   # ADR 002: Use JSON for State Storage

   ## Status
   Accepted (pending Phase 11 evaluation)

   ## Context
   State files need storage. Options:
   - JSON files (current)
   - SQLite database

   ## Decision
   Continue with JSON for simplicity and debuggability.

   ## Consequences
   - Positive: Human-readable, simple, no additional dependencies
   - Negative: No querying, potential corruption, larger files over time
   ```

4. **Write ADR 003: Bun over Node**
   - Create `docs/adr/003-bun-over-node.md`:
   ```markdown
   # ADR 003: Use Bun Runtime

   ## Status
   Accepted

   ## Context
   JavaScript runtime options: Node.js, Deno, Bun

   ## Decision
   Use Bun for built-in TypeScript support, faster execution, and modern APIs.

   ## Consequences
   - Positive: Fast, built-in TS, good DX
   - Negative: Newer ecosystem, some compatibility issues
   ```

5. **Write ADR 004: Configuration File Design**
   - Document decisions from Phase 05
   - Explain precedence rules
   - Explain why both JSON and TypeScript configs

6. **Write ADR 005: Error Handling Strategy**
   - Document error hierarchy design
   - Explain user-friendly vs developer messages
   - Document error codes

7. **Create CONTRIBUTING.md**
   - Create `CONTRIBUTING.md`:
   ```markdown
   # Contributing to Ralph

   ## Development Setup

   1. Clone the repository
   2. Install Bun: https://bun.sh
   3. Run `bun install`
   4. Run `bun run build` to verify

   ## Running Tests

   ```bash
   bun run test        # Run package test script
   bun test            # Run all discovered tests
   bun test --coverage # With coverage
   ```

   ## Code Style

   - TypeScript strict mode enabled
   - 2-space indentation
   - ESM imports
   - Semicolons required

   ## Pull Request Process

   1. Ensure tests pass
   2. Update documentation if needed
   3. Follow existing patterns
   ```

8. **Document release process**
   - Add to CONTRIBUTING.md or create `docs/release.md`:
     - Version bumping
     - Tagging
     - Publishing (if applicable)
     - GitHub releases

9. **Generate API docs (optional)**
   - Install TypeDoc: `bun add -d typedoc`
   - Create typedoc.json configuration
   - Generate docs: `bunx typedoc`
   - Add to .gitignore if not committing

10. **Update README**
    - Add links to ADRs and CONTRIBUTING.md
    - Add documentation section

## 6) Verification

- Command: Manual review of created documents
- Expected result: All ADRs created, CONTRIBUTING.md helpful, links work
- Failure triage note: N/A (documentation phase)

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - docs/adr/ directory created with 5 ADRs
  - CONTRIBUTING.md created
  - Release process documented
  - README updated with links
  - TypeDoc generated (optional)

## 8) Handoff to Next Phase

- Artifacts produced:
  - `docs/adr/*.md` - Architecture Decision Records
  - `CONTRIBUTING.md` - Contribution guidelines
  - Updated `README.md`

- What changed that next phase must know:
  - Documentation structure established
  - ADR template available for future decisions

- New risks or assumptions:
  - None significant

- Master plan updates required:
  - Mark Phase 09 as complete

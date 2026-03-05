# Phase 01: Dependency Version Pinning

## 0) Metadata

- Phase number and name: 01 - Dependency Version Pinning
- Task label: Pin @opencode-ai/sdk and add dependency management
- Depends on phase(s): None (first phase)
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 3-5 iterations

## 1) Objective

- Primary outcome: Pin `@opencode-ai/sdk` to a specific version and set up dependency management
- Why this phase now: High priority, low effort, foundational for stability

## 2) Scope

- In scope for this phase:
  - Pin `@opencode-ai/sdk` to specific version (check current latest, likely ^0.15.0 or similar)
  - Review and pin other dependencies if needed
  - Add Dependabot configuration for automated update PRs
  - Document SDK version compatibility in README

- Out of scope for this phase:
  - Major dependency upgrades
  - Removing unused dependencies
  - Adding new dependencies

## 3) Required Context to Load First

### Required Files and Docs

- `package.json` - Check current dependency versions
- `README.md` - For documentation updates
- `.github/` directory structure - For adding dependabot config

### Optional Deep-Dive Resources

- npm semver documentation (if unclear on ^ vs ~ semantics)

## 4) Constraints and Contracts

- Public interfaces that must remain stable:
  - Existing package.json scripts must continue to work
  - All imports from @opencode-ai/sdk must still resolve

- Data contracts that must remain stable:
  - package.json structure

## 5) Implementation Plan

1. **Check current SDK version and latest available**
   - Run `npm view @opencode-ai/sdk versions --json` or check npm registry
   - Note the current version in package.json
   - Decide target version (latest stable 0.x)

2. **Update package.json**
   - Change `"@opencode-ai/sdk": "^0.x"` to specific version (e.g., `"^0.15.0"`)
   - Review other dependencies with `^0.x` patterns
   - Run `bun install` to update lockfile

3. **Add Dependabot configuration**
   - Create `.github/dependabot.yml`:
   ```yaml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
       open-pull-requests-limit: 5
   ```

4. **Update README documentation**
   - Add SDK version compatibility section
   - Document that `@opencode-ai/sdk` version is pinned

5. **Verify build and tests still pass**
   - Run `bun install`
   - Run `bun run build`
   - Run `bun run test`

## 6) Verification

- Command: `bun run build && bun run test`
- Expected result: Build succeeds, all tests pass, no type errors
- Failure triage note: If SDK version breaks build, check changelog for breaking changes and adjust

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - package.json updated with pinned SDK version
  - Dependabot config created
  - README updated with version info
  - Build passes
  - Tests pass

## 8) Handoff to Next Phase

- Artifacts produced:
  - Updated package.json with pinned dependencies
  - New .github/dependabot.yml
  - Updated README.md

- What changed that next phase must know:
  - SDK version is now fixed
  - Automatic dependency updates configured via Dependabot

- New risks or assumptions:
  - None significant

- Master plan updates required:
  - Mark Phase 01 as complete in master plan

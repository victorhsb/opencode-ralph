# Phase 06: CI/CD Pipeline

## 0) Metadata

- Phase number and name: 06 - CI/CD Pipeline
- Task label: Add GitHub Actions CI workflow
- Depends on phase(s): 01, 03
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 3-5 iterations

## 1) Objective

- Primary outcome: GitHub Actions CI workflow that runs tests, type checks, and build on PRs and pushes
- Why this phase now: High impact for quality assurance, can run in parallel with later phases

## 2) Scope

- In scope for this phase:
  - Create `.github/workflows/ci.yml`
  - Run on push and pull_request events
  - Test on Ubuntu and macOS
  - Install dependencies with Bun
  - Run type check (if tsconfig exists)
  - Run tests
  - Run build verification
  - Add status badge to README

- Out of scope for this phase:
  - Deployment automation (no deployment target defined)
  - Linting (no linter configured yet)
  - Multiple Bun versions (use latest)
  - Windows support (Bun Windows support is evolving)

## 3) Required Context to Load First

### Required Files and Docs

- `.github/workflows/opencode.yml` - Existing workflow (reference)
- `package.json` - Scripts available
- `README.md` - For badge
- Current test setup and commands

### Optional Deep-Dive Resources

- GitHub Actions documentation
- oven-sh/setup-bun action documentation

## 4) Constraints and Contracts

- Platform constraints:
  - Must use `oven-sh/setup-bun@v1` for Bun installation
  - Ubuntu and macOS runners available

- Performance constraints:
  - Workflow should complete in < 5 minutes
  - Use caching for node_modules if possible

## 5) Implementation Plan

1. **Review existing workflow**
   - Read `.github/workflows/opencode.yml` for reference
   - Understand current setup

2. **Create CI workflow**
   - Create `.github/workflows/ci.yml`:
   ```yaml
   name: CI

   on:
     push:
       branches: [main, master]
     pull_request:
       branches: [main, master]

   jobs:
     test:
       runs-on: ${{ matrix.os }}
       strategy:
         matrix:
           os: [ubuntu-latest, macos-latest]

       steps:
         - name: Checkout
           uses: actions/checkout@v4

         - name: Setup Bun
           uses: oven-sh/setup-bun@v1
           with:
             bun-version: latest

         - name: Install dependencies
           run: bun install

         - name: Type check
           run: bun run typecheck
           if: success() || failure()  # Run even if install fails

         - name: Run tests
           run: bun run test
           if: success() || failure()

         - name: Build
           run: bun run build
           if: success() || failure()
   ```

3. **Add caching (optional optimization)**
   - Add `actions/cache` for `~/.bun/install/cache` if builds are slow
   - Test with and without to measure impact

4. **Test workflow locally (if possible)**
   - Use `act` tool if available
   - Otherwise, verify YAML syntax

5. **Add README badge**
   - Add CI status badge to README.md:
   ```markdown
   [![CI](https://github.com/victorhsb/opencode-ralph/actions/workflows/ci.yml/badge.svg)](https://github.com/victorhsb/opencode-ralph/actions/workflows/ci.yml)
   ```

6. **Verify workflow triggers**
   - Push to a test branch
   - Create a test PR
   - Verify all checks run

7. **Document branch protection (optional)**
   - Note in README that main branch requires CI passing
   - Actual protection rules need GitHub UI

## 6) Verification

- Command: Push workflow to branch and check Actions tab
- Expected result: Workflow runs and passes on Ubuntu and macOS
- Failure triage note: Check Bun installation, check test commands exist

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - `.github/workflows/ci.yml` created
  - Workflow runs on push and PR
  - Tests pass on Ubuntu and macOS
  - Type check runs (if applicable)
  - Build verification runs
  - README badge added
  - Build passes locally

## 8) Handoff to Next Phase

- Artifacts produced:
  - `.github/workflows/ci.yml`
  - Updated README.md with badge

- What changed that next phase must know:
  - CI/CD active on repository
  - All changes will be tested automatically
  - Keep tests passing!

- New risks or assumptions:
  - GitHub Actions minutes available (public repos are free)
  - Bun setup action maintained

- Master plan updates required:
  - Mark Phase 06 as complete
  - Note CI/CD availability

## 9) Implementation Status (Iteration 4)

- Status: COMPLETE
- Implemented:
  - Added GitHub Actions CI workflow at `.github/workflows/ci.yml`
  - Configured triggers for `push` and `pull_request` on `main` and `master`
  - Added Ubuntu and macOS matrix execution
  - Added Bun setup using `oven-sh/setup-bun@v1`
  - Added pipeline steps for dependency install, typecheck, tests, and build
  - Added CI status badge to `README.md`
  - Updated `plans/master-plan.md` to reflect Phase 06 completion
- Notes for next phases:
  - Phase 07 can rely on CI to validate logging changes on both OS targets
  - Keep `bun run typecheck`, `bun run test`, and `bun run build` green to avoid CI regressions

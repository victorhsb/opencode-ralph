# Phase 10: Performance Monitoring

## 0) Metadata

- Phase number and name: 10 - Performance Monitoring
- Task label: Add iteration tracking and basic performance metrics
- Depends on phase(s): 07
- Planned completion tag: READY_FOR_NEXT_TASK
- Estimated iteration budget: 4-6 iterations

## 1) Objective

- Primary outcome: Basic performance monitoring with iteration timing, token usage (if available), and cost estimation
- Why this phase now: Lower priority operational insight; builds on logging infrastructure

## 2) Scope

- In scope for this phase:
  - Track duration per iteration
  - Track total session time
  - Track token usage per iteration (if SDK exposes it)
  - Add cost estimation per iteration (based on model)
  - Log performance metrics via logger (Phase 07)
  - Add performance summary at session end

- Out of scope for this phase:
  - Prometheus metrics export (optional stretch)
  - Memory usage tracking (complex in Bun)
  - Detailed profiling
  - Historical performance comparison

## 3) Required Context to Load First

### Required Files and Docs

- `src/loop/loop.ts` - Where to add timing
- `src/sdk/` - Check if SDK exposes token usage
- `src/logger/index.ts` (Phase 07) - For logging metrics
- Model pricing information (OpenCode/OpenRouter docs)

### Optional Deep-Dive Resources

- SDK documentation for token usage
- Performance.now() or Bun.nanoseconds() for timing

## 4) Constraints and Contracts

- Performance constraints:
  - Monitoring should add minimal overhead (< 1ms per iteration)
  - Don't impact main execution flow

- Data contracts:
  - Metrics should be logged, not stored in state (keep state small)

## 5) Implementation Plan

1. **Research SDK capabilities**
   - Check if @opencode-ai/sdk exposes token usage
   - Check if response includes token counts
   - Document what's available

2. **Create performance tracker**
   - Create `src/performance/tracker.ts`:
   ```typescript
   import { logger } from "../logger";

   export interface IterationMetrics {
     iteration: number;
     startTime: number;
     endTime?: number;
     duration?: number;
     inputTokens?: number;
     outputTokens?: number;
     estimatedCost?: number;
   }

   export class PerformanceTracker {
     private metrics: IterationMetrics[] = [];
     private currentIteration: IterationMetrics | null = null;

     startIteration(iteration: number): void {
       this.currentIteration = {
         iteration,
         startTime: performance.now(),
       };
     }

     endIteration(tokenUsage?: { input?: number; output?: number }): void {
       if (!this.currentIteration) return;

       this.currentIteration.endTime = performance.now();
       this.currentIteration.duration = 
         this.currentIteration.endTime - this.currentIteration.startTime;
       
       if (tokenUsage) {
         this.currentIteration.inputTokens = tokenUsage.input;
         this.currentIteration.outputTokens = tokenUsage.output;
         this.currentIteration.estimatedCost = this.calculateCost(tokenUsage);
       }

       this.metrics.push(this.currentIteration);
       
       logger.debug("Iteration metrics", this.currentIteration);
       
       this.currentIteration = null;
     }

     private calculateCost(tokenUsage: { input?: number; output?: number }): number {
       // Pricing per 1K tokens (adjust based on actual model)
       const inputPrice = 0.003;  // $3 per 1M tokens
       const outputPrice = 0.015; // $15 per 1M tokens
       
       const inputCost = (tokenUsage.input ?? 0) / 1000 * inputPrice;
       const outputCost = (tokenUsage.output ?? 0) / 1000 * outputPrice;
       
       return inputCost + outputCost;
     }

     getSummary() {
       const totalDuration = this.metrics.reduce((sum, m) => sum + (m.duration ?? 0), 0);
       const totalTokens = this.metrics.reduce(
         (sum, m) => sum + (m.inputTokens ?? 0) + (m.outputTokens ?? 0), 
         0
       );
       const totalCost = this.metrics.reduce((sum, m) => sum + (m.estimatedCost ?? 0), 0);

       return {
         iterations: this.metrics.length,
         totalDuration,
         averageDuration: totalDuration / this.metrics.length,
         totalTokens,
         totalCost,
       };
     }

     printSummary(): void {
       const summary = this.getSummary();
       logger.info("Performance Summary", {
         iterations: summary.iterations,
         totalDuration: `${(summary.totalDuration / 1000).toFixed(2)}s`,
         avgDuration: `${(summary.averageDuration / 1000).toFixed(2)}s`,
         totalTokens: summary.totalTokens,
         estimatedCost: `$${summary.totalCost.toFixed(4)}`,
       });
     }
   }
   ```

3. **Integrate with loop**
   - Import tracker in `src/loop/loop.ts`
   - Start timing at iteration begin
   - End timing when iteration completes
   - Extract token usage from SDK response if available
   - Print summary at session end

4. **Make configurable**
   - Add to config schema:
   ```typescript
   performance: z.object({
     trackTokens: z.boolean().optional().default(true),
     estimateCost: z.boolean().optional().default(true),
   }).optional(),
   ```

5. **Add performance tests**
   - Create `src/performance/__tests__/tracker.test.ts`:
     - Test timing calculations
     - Test cost estimation
     - Test summary generation

6. **Update documentation**
   - Add performance section to README
   - Document metrics collected
   - Explain cost estimation methodology

## 6) Verification

- Command: `bun test ./src/performance/__tests__/ && bun run build`
- Manual test: Run Ralph with `--log-level DEBUG` and verify metrics logged
- Expected result: Tests pass, metrics appear in logs, no performance impact
- Failure triage note: Check SDK response structure for token usage

## 7) Completion Contract

- Emit promise tag: READY_FOR_NEXT_TASK
- Conditions before emitting the tag:
  - Performance tracker implemented
  - Integrated with main loop
  - Token usage tracked (if SDK supports)
  - Cost estimation working
  - Summary printed at end
  - Tests pass
  - Documentation updated
  - Build passes

## 8) Handoff to Next Phase

- Artifacts produced:
  - `src/performance/tracker.ts` - Performance tracking
  - `src/performance/__tests__/tracker.test.ts` - Tests
  - Updated loop with timing
  - Updated config schema

- What changed that next phase must know:
  - Performance tracking available
  - Use tracker for any new long-running operations

- New risks or assumptions:
  - Token usage may not be available from SDK (graceful degradation)
  - Cost estimates are approximate

- Master plan updates required:
  - Mark Phase 10 as complete

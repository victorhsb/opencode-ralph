import { describe, expect, test } from "bun:test";
import { PerformanceTracker } from "../tracker";

describe("PerformanceTracker", () => {
  test("tracks iteration duration and token totals", () => {
    let nowMs = 1000;
    const tracker = new PerformanceTracker({
      now: () => nowMs,
      model: "anthropic/claude-sonnet-4",
    });

    tracker.startIteration(1);
    nowMs = 1800;
    tracker.endIteration({ inputTokens: 2000, outputTokens: 500 });

    const summary = tracker.getSummary();
    expect(summary.iterationCount).toBe(1);
    expect(summary.totalIterationDurationMs).toBe(800);
    expect(summary.averageIterationDurationMs).toBe(800);
    expect(summary.totalInputTokens).toBe(2000);
    expect(summary.totalOutputTokens).toBe(500);
    expect(summary.totalTokens).toBe(2500);
  });

  test("estimates cost from known pricing", () => {
    let nowMs = 10;
    const tracker = new PerformanceTracker({
      now: () => nowMs,
      model: "openai/gpt-5",
      trackTokens: true,
      estimateCost: true,
    });

    tracker.startIteration(1);
    nowMs = 1010;
    tracker.endIteration({ inputTokens: 1000000, outputTokens: 1000000 });

    const summary = tracker.getSummary();
    expect(summary.totalEstimatedCostUsd).toBeCloseTo(11.25, 6);
  });

  test("skips cost estimation when disabled", () => {
    let nowMs = 0;
    const tracker = new PerformanceTracker({
      now: () => nowMs,
      estimateCost: false,
    });

    tracker.startIteration(1);
    nowMs = 50;
    tracker.endIteration({ inputTokens: 1000, outputTokens: 2000 });

    const summary = tracker.getSummary();
    expect(summary.totalEstimatedCostUsd).toBe(0);
  });

  test("handles no iterations gracefully", () => {
    let nowMs = 500;
    const tracker = new PerformanceTracker({ now: () => nowMs });

    nowMs = 1500;
    const summary = tracker.getSummary();

    expect(summary.iterationCount).toBe(0);
    expect(summary.totalIterationDurationMs).toBe(0);
    expect(summary.averageIterationDurationMs).toBe(0);
    expect(summary.sessionDurationMs).toBe(1000);
    expect(summary.totalTokens).toBe(0);
  });
});

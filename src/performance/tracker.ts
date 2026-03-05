import { logger } from "../logger";

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface IterationMetrics {
  iteration: number;
  startedAtMs: number;
  endedAtMs?: number;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
}

export interface PerformanceSummary {
  iterationCount: number;
  totalIterationDurationMs: number;
  averageIterationDurationMs: number;
  sessionDurationMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
}

interface PerformanceTrackerOptions {
  model?: string;
  trackTokens?: boolean;
  estimateCost?: boolean;
  now?: () => number;
}

interface ModelPricing {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

const DEFAULT_MODEL_PRICING: ModelPricing = {
  inputPerMillionUsd: 3,
  outputPerMillionUsd: 15,
};

function resolveModelPricing(model: string | undefined): ModelPricing {
  if (!model) {
    return DEFAULT_MODEL_PRICING;
  }

  const normalized = model.toLowerCase();

  if (normalized.includes("openai/gpt-5-mini")) {
    return { inputPerMillionUsd: 0.25, outputPerMillionUsd: 2 };
  }

  if (normalized.includes("openai/gpt-5")) {
    return { inputPerMillionUsd: 1.25, outputPerMillionUsd: 10 };
  }

  if (normalized.includes("openai/gpt-4.1")) {
    return { inputPerMillionUsd: 2, outputPerMillionUsd: 8 };
  }

  if (normalized.includes("anthropic/claude-sonnet-4")) {
    return { inputPerMillionUsd: 3, outputPerMillionUsd: 15 };
  }

  return DEFAULT_MODEL_PRICING;
}

export class PerformanceTracker {
  private readonly model: string | undefined;
  private readonly trackTokens: boolean;
  private readonly estimateCost: boolean;
  private readonly now: () => number;
  private readonly sessionStartedAtMs: number;
  private readonly metrics: IterationMetrics[] = [];
  private currentIteration: IterationMetrics | null = null;

  constructor(options: PerformanceTrackerOptions = {}) {
    this.model = options.model;
    this.trackTokens = options.trackTokens ?? true;
    this.estimateCost = options.estimateCost ?? true;
    this.now = options.now ?? Date.now;
    this.sessionStartedAtMs = this.now();
  }

  startIteration(iteration: number): void {
    this.currentIteration = {
      iteration,
      startedAtMs: this.now(),
    };
  }

  endIteration(tokenUsage?: TokenUsage): void {
    if (!this.currentIteration) {
      return;
    }

    const endedAtMs = this.now();
    const metric = this.currentIteration;
    metric.endedAtMs = endedAtMs;
    metric.durationMs = endedAtMs - metric.startedAtMs;

    if (this.trackTokens && tokenUsage) {
      if (tokenUsage.inputTokens !== undefined) {
        metric.inputTokens = tokenUsage.inputTokens;
      }
      if (tokenUsage.outputTokens !== undefined) {
        metric.outputTokens = tokenUsage.outputTokens;
      }
      metric.totalTokens = tokenUsage.totalTokens
        ?? (tokenUsage.inputTokens ?? 0) + (tokenUsage.outputTokens ?? 0);

      if (this.estimateCost) {
        metric.estimatedCostUsd = this.calculateEstimatedCostUsd(tokenUsage);
      }
    }

    this.metrics.push(metric);

    logger.debug("Performance iteration metrics", {
      iteration: metric.iteration,
      durationMs: metric.durationMs,
      inputTokens: metric.inputTokens,
      outputTokens: metric.outputTokens,
      totalTokens: metric.totalTokens,
      estimatedCostUsd: metric.estimatedCostUsd,
    });

    this.currentIteration = null;
  }

  getSummary(): PerformanceSummary {
    const totalIterationDurationMs = this.metrics.reduce((sum, metric) => {
      return sum + (metric.durationMs ?? 0);
    }, 0);

    const totalInputTokens = this.metrics.reduce((sum, metric) => {
      return sum + (metric.inputTokens ?? 0);
    }, 0);

    const totalOutputTokens = this.metrics.reduce((sum, metric) => {
      return sum + (metric.outputTokens ?? 0);
    }, 0);

    const totalTokens = this.metrics.reduce((sum, metric) => {
      return sum + (metric.totalTokens ?? 0);
    }, 0);

    const totalEstimatedCostUsd = this.metrics.reduce((sum, metric) => {
      return sum + (metric.estimatedCostUsd ?? 0);
    }, 0);

    return {
      iterationCount: this.metrics.length,
      totalIterationDurationMs,
      averageIterationDurationMs: this.metrics.length > 0
        ? totalIterationDurationMs / this.metrics.length
        : 0,
      sessionDurationMs: this.now() - this.sessionStartedAtMs,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalEstimatedCostUsd,
    };
  }

  logSummary(): void {
    const summary = this.getSummary();
    logger.info("Performance summary", {
      model: this.model,
      iterations: summary.iterationCount,
      totalIterationDurationMs: summary.totalIterationDurationMs,
      averageIterationDurationMs: summary.averageIterationDurationMs,
      sessionDurationMs: summary.sessionDurationMs,
      totalInputTokens: summary.totalInputTokens,
      totalOutputTokens: summary.totalOutputTokens,
      totalTokens: summary.totalTokens,
      totalEstimatedCostUsd: Number(summary.totalEstimatedCostUsd.toFixed(6)),
    });
  }

  private calculateEstimatedCostUsd(tokenUsage: TokenUsage): number {
    const pricing = resolveModelPricing(this.model);
    const inputCost = ((tokenUsage.inputTokens ?? 0) / 1000000) * pricing.inputPerMillionUsd;
    const outputCost = ((tokenUsage.outputTokens ?? 0) / 1000000) * pricing.outputPerMillionUsd;
    return inputCost + outputCost;
  }
}

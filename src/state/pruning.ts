export interface PruningOptions {
  maxIterations: number;
}

export function shouldPrune(iterationCount: number, options: PruningOptions): boolean {
  return iterationCount > options.maxIterations;
}

export function getIterationsToKeep<T>(allIterations: T[], options: PruningOptions): T[] {
  if (options.maxIterations <= 0) {
    return [];
  }

  return allIterations.slice(-options.maxIterations);
}

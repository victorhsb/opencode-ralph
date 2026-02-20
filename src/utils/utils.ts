/**
 * Utilities Module
 *
 * Common utility functions for formatting, error detection,
 * and promise checking.
 */

export function formatDurationLong(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatToolSummary(toolCounts: Map<string, number>, maxItems = 6): string {
  if (!toolCounts.size) return "";
  const entries = Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, maxItems);
  const remaining = entries.length - shown.length;
  const parts = shown.map(([name, count]) => `${name} ${count}`);
  if (remaining > 0) {
    parts.push(`+${remaining} more`);
  }
  return parts.join(" • ");
}

export function printIterationSummary(params: {
  iteration: number;
  elapsedMs: number;
  toolCounts: Map<string, number>;
  exitCode: number;
  completionDetected: boolean;
  model: string;
}): void {
  const toolSummary = formatToolSummary(params.toolCounts);
  const duration = formatDuration(params.elapsedMs);
  console.log(`Iteration ${params.iteration} completed in ${duration} (${params.model})`);
  console.log("\nIteration Summary");
  console.log("────────────────────────────────────────────────────────────────────");
  console.log(`Iteration: ${params.iteration}`);
  console.log(`Elapsed:   ${duration} (${params.model})`);
  if (toolSummary) {
    console.log(`Tools:     ${toolSummary}`);
  } else {
    console.log("Tools:     none");
  }
  console.log(`Exit code: ${params.exitCode}`);
  console.log(`Completion promise: ${params.completionDetected ? "detected" : "not detected"}`);
}

export function checkCompletion(output: string, promise: string): boolean {
  const escapedPromise = escapeRegex(promise);
  
  // Use matchAll to get all matches with their indices
  const promisePattern = new RegExp(`<promise>\\s*${escapedPromise}\\s*</promise>`, "gi");
  const matches = Array.from(output.matchAll(promisePattern));
  if (matches.length === 0) return false;

  const negationPatterns = [
    /\bnot\s+(yet\s+)?(say|output|write|respond|print)/,
    /\bdon'?t\s+(say|output|write|respond|print)/,
    /\bwon'?t\s+(say|output|write|respond|print)/,
    /\bwill\s+not\s+(say|output|write|respond|print)/,
    /\bshould\s+not\s+(say|output|write|respond|print)/,
    /\bwouldn'?t\s+(say|output|write|respond|print)/,
    /\bavoid\s+(saying|outputting|writing)/,
    /\bwithout\s+(saying|outputting|writing)/,
    /\bbefore\s+(saying|outputting|I\s+say)/,
    /\buntil\s+(I\s+)?(say|output|can\s+say)/,
  ];

  let lastMatchEndIndex = 0;

  for (const match of matches) {
    const matchIndex = match.index!;
    const matchEndIndex = matchIndex + match[0].length;
    
    // Context should start after the previous match (if any) to avoid
    // including negations from earlier in the text
    const contextStart = Math.max(lastMatchEndIndex, matchIndex - 100);
    const contextBefore = output.substring(contextStart, matchIndex).toLowerCase();

    const hasNegation = negationPatterns.some(pattern => pattern.test(contextBefore));
    if (hasNegation) {
      lastMatchEndIndex = matchEndIndex;
      continue;
    }

    // Count quotes from start of string up to match position.
    // Only count quotes that appear at word boundaries (not contractions like Here's, don't)
    const fullTextBefore = output.substring(0, matchIndex);
    // Match quotes that are: at start of string, after whitespace, or before whitespace/end
    // This excludes apostrophes in the middle of words (contractions)
    const quotesBefore = (fullTextBefore.match(/(^|\s)["'`]|["'`](\s|$)/g) || []).length;
    if (quotesBefore % 2 === 1) continue;

    return true;
  }

  return false;
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractErrors(output: string): string[] {
  const errors: string[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes("error:") ||
      lower.includes("failed:") ||
      lower.includes("exception:") ||
      lower.includes("typeerror") ||
      lower.includes("syntaxerror") ||
      lower.includes("referenceerror") ||
      (lower.includes("test") && lower.includes("fail"))
    ) {
      const cleaned = line.trim().substring(0, 200);
      if (cleaned && !errors.includes(cleaned)) {
        errors.push(cleaned);
      }
    }
  }

  return errors.slice(0, 10);
}

export function stripAnsi(input: string): string {
  return input.replace(/\x1B\[[0-9;]*m/g, "");
}

export function detectPlaceholderPluginError(output: string): boolean {
  return output.includes("ralph-wiggum is not yet ready for use. This is a placeholder package.");
}

export function detectModelNotFoundError(output: string): boolean {
  return output.includes("ProviderModelNotFoundError") ||
         output.includes("Provider returned error") ||
         output.includes("model not found") ||
         output.includes("No model configured");
}

export function isSdkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("providermodelfound") ||
        msg.includes("model not found") ||
        msg.includes("provider returned error") ||
        msg.includes("invalid model") ||
        msg.includes("model configuration")) {
      return true;
    }
    if (msg.includes("connection refused") ||
        msg.includes("network error") ||
        msg.includes("timeout") ||
        msg.includes("econnrefused") ||
        msg.includes("socket hang up")) {
      return true;
    }
    if (msg.includes("failed to initialize") ||
        msg.includes("sdk initialization") ||
        msg.includes("server failed to start")) {
      return true;
    }
    if (msg.includes("rate limit") ||
        msg.includes("too many requests") ||
        msg.includes("throttled")) {
      return true;
    }
    if (msg.includes("authentication") ||
        msg.includes("unauthorized") ||
        msg.includes("api key")) {
      return true;
    }
  }
  return false;
}

export function getSdkErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") {
      return err.message;
    }
    if (typeof err.error === "string") {
      return err.error;
    }
    if (typeof err.description === "string") {
      return err.description;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown SDK error (could not stringify)";
    }
  }
  return String(error);
}

export function detectSdkModelNotFoundError(output: string): boolean {
  const lowerOutput = output.toLowerCase();
  return lowerOutput.includes("providermodelfound") ||
         lowerOutput.includes("model not found") ||
         lowerOutput.includes("provider returned error") ||
         lowerOutput.includes("no model configured");
}

export function detectSdkPlaceholderPluginError(output: string): boolean {
  return output.includes("ralph-wiggum is not yet ready for use");
}

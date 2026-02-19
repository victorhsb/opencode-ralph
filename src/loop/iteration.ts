/**
 * Iteration Module
 *
 * Handles single iteration execution in the Ralph loop.
 */

import { executePrompt } from "../sdk/executor";
import type { SdkClient } from "../sdk/client";

export interface SdkIterationOptions {
  client: SdkClient;
  prompt: string;
  model?: string;
  streamOutput: boolean;
  compactTools: boolean;
}

export interface SdkIterationResult {
  output: string;
  toolCounts: Map<string, number>;
  exitCode: number;
  errors: string[];
}

export async function executeSdkIteration(options: SdkIterationOptions): Promise<SdkIterationResult> {
  const { client, prompt, model, streamOutput, compactTools } = options;

  const toolCounts = new Map<string, number>();
  const errors: string[] = [];
  let output = "";

  let lastPrintedAt = Date.now();
  let lastToolSummaryAt = 0;
  const toolSummaryIntervalMs = 3000;
  const heartbeatIntervalMs = 10000;

  const maybePrintToolSummary = (force = false) => {
    if (!compactTools || toolCounts.size === 0) return;
    const now = Date.now();
    if (!force && now - lastToolSummaryAt < toolSummaryIntervalMs) {
      return;
    }
    const summary = formatToolSummary(toolCounts);
    if (summary) {
      console.log(`| Tools    ${summary}`);
      lastPrintedAt = now;
      lastToolSummaryAt = now;
    }
  };

  const heartbeatTimer = setInterval(() => {
    const now = Date.now();
    if (now - lastPrintedAt >= heartbeatIntervalMs) {
      console.log("| ...");
      lastPrintedAt = now;
    }
  }, heartbeatIntervalMs);

  try {
    const result = await executePrompt({
      client: client.client,
      prompt,
      model,
      onEvent: (event) => {
        if (!streamOutput) return;

        if (event.type === "tool_start" && event.toolName) {
          toolCounts.set(event.toolName, (toolCounts.get(event.toolName) ?? 0) + 1);
          if (compactTools) {
            maybePrintToolSummary();
          } else {
            console.log(`| ${event.type === "tool_start" ? `🔧 ${event.toolName}...` : ""}`);
          }
          lastPrintedAt = Date.now();
        }

        if (event.type === "text" && event.content) {
          process.stdout.write(event.content);
          lastPrintedAt = Date.now();
        }
      },
    });

    clearInterval(heartbeatTimer);
    process.stdout.write("\n");

    output = result.output;

    for (const [tool, count] of result.toolCounts) {
      toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + count);
    }

    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }

    if (compactTools) {
      maybePrintToolSummary(true);
    }

    return {
      output,
      toolCounts,
      exitCode: result.exitCode,
      errors,
    };
  } catch (error) {
    clearInterval(heartbeatTimer);
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      output,
      toolCounts,
      exitCode: 1,
      errors,
    };
  }
}

function formatToolSummary(toolCounts: Map<string, number>, maxItems = 6): string {
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

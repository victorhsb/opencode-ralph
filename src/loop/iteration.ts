/**
 * Iteration Module
 *
 * Handles single iteration execution in the Ralph loop.
 */

import { executePrompt } from "../sdk/executor.js";
import { formatToolResult } from "../sdk/output.js";
import { SubagentMonitor } from "../sdk/subagent-monitor.js";
import {
  formatSubagentOutput,
  formatSubagentStart,
  formatSubagentEnd,
} from "../sdk/subagent-output.js";
import type { SdkClient } from "../sdk/client.js";
import type { StructuredOutput } from "../sdk/executor.js";
import type { SubagentInfo } from "../sdk/subagent-types.js";

export interface SdkIterationOptions {
  client: SdkClient;
  prompt: string;
  model: string | null;
  agent?: string;
  streamOutput: boolean;
  compactTools: boolean;
  silent?: boolean;
  useStructuredOutput?: boolean;
}

export interface SdkIterationResult {
  output: string;
  toolCounts: Map<string, number>;
  exitCode: number;
  errors: string[];
  structuredOutput?: StructuredOutput;
}

export async function executeSdkIteration(options: SdkIterationOptions): Promise<SdkIterationResult> {
  const { client, prompt, model, agent, streamOutput, compactTools, silent, useStructuredOutput } = options;

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

  let subagentMonitor: SubagentMonitor | undefined;
  let sessionId: string | undefined;

  try {
    // Create session first so we can monitor it for subagents
    const sessionResponse = await client.client.session.create({
      title: `Ralph iteration ${Date.now()}`,
    });

    if (sessionResponse.error || !sessionResponse.data) {
      errors.push(`Failed to create session: ${sessionResponse.error ?? "Unknown error"}`);
      clearInterval(heartbeatTimer);
      return {
        output,
        toolCounts,
        exitCode: 1,
        errors,
      };
    }

    sessionId = sessionResponse.data.id;

    // Create and start subagent monitor before executing prompt
    subagentMonitor = new SubagentMonitor({
      client: client.client,
      parentSessionId: sessionId,
      onSubagentStarted: (info: SubagentInfo) => {
        if (!silent) {
          console.log(formatSubagentStart(info));
        }
      },
      onSubagentEvent: (subagentEvent) => {
        if (!silent && subagentEvent.event.type === "text" && subagentEvent.event.content) {
          process.stdout.write(formatSubagentOutput(subagentEvent.subagent, subagentEvent.event.content));
        }
      },
      onSubagentCompleted: (info: SubagentInfo) => {
        if (!silent) {
          console.log(formatSubagentEnd(info));
        }
      },
    });

    // Start monitoring before executing the prompt
    await subagentMonitor.start();

    const result = await executePrompt(
      client.client,
      prompt,
      model ?? undefined,
      agent,
      {
        sessionId,
        onEvent: (event) => {
          if (event.type === "tool_start" && event.toolName) {
            toolCounts.set(event.toolName, (toolCounts.get(event.toolName) ?? 0) + 1);
            if (!silent && streamOutput) {
              console.log(`🔧 ${event.toolName}...`);
              lastPrintedAt = Date.now();
            }
          }

          if (event.type === "tool_end" && event.toolName && !silent) {
            if (streamOutput && event.result) {
              const formattedResult = formatToolResult(event.toolName, event.result);
              if (formattedResult) {
                console.log(formattedResult);
              }
              console.log(`✓ ${event.toolName}`);
              lastPrintedAt = Date.now();
            }
          }

          if (streamOutput && event.type === "text" && event.content) {
            process.stdout.write(event.content);
            lastPrintedAt = Date.now();
          }
        },
      },
    );

    process.stdout.write("\n");
    output = result.output;

    if (!streamOutput) {
      for (const [tool, count] of result.toolCounts) {
        toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + count);
      }
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
      ...(result.structuredOutput !== undefined && { structuredOutput: result.structuredOutput }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      output,
      toolCounts,
      exitCode: 1,
      errors,
    };
  } finally {
    clearInterval(heartbeatTimer);
    if (subagentMonitor) {
      await subagentMonitor.stop();
    }
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

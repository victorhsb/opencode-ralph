/**
 * Iteration Module
 *
 * Handles single iteration execution in the Ralph loop.
 */

import { executePrompt } from "../sdk/executor.js";
import { formatToolResult } from "../sdk/output.js";
import { SubagentMonitor } from "../sdk/subagent-monitor.js";
import {
  formatSubagentStart,
  formatSubagentEnd,
} from "../sdk/subagent-output.js";
import { SubagentStreamingFormatter } from "../sdk/subagent-streaming-formatter.js";
import type { SdkClient } from "../sdk/client.js";
import type { StructuredOutput, TokenUsage } from "../sdk/executor.js";
import type { SubagentInfo } from "../sdk/subagent-types.js";
import { logger as console } from "../logger/index.js";

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
  tokenUsage?: TokenUsage;
}

export async function executeSdkIteration(options: SdkIterationOptions): Promise<SdkIterationResult> {
  const { client, prompt, model, agent, streamOutput, compactTools, silent, useStructuredOutput } = options;

  const toolCounts = new Map<string, number>();
  const errors: string[] = [];
  let output = "";

  let lastPrintedAt = Date.now();
  let lastToolSummaryAt = 0;
  let lastEventTime = Date.now();
  let lastEventType: string | null = null;
  const toolSummaryIntervalMs = 3000;
  const heartbeatIntervalMs = 10000;
  const minHeartbeatDelayMs = 30000;

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

  const formatElapsedTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}min${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ""}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ""}`;
  };

  const getHeartbeatMessage = (): string => {
    const elapsed = Date.now() - lastEventTime;
    const formattedTime = formatElapsedTime(elapsed);

    if (lastEventType === "text") {
      return `| ... (waiting for model, ${formattedTime} since last output)`;
    }
    if (lastEventType === "tool_start") {
      return `| ... (tool execution in progress, ${formattedTime} elapsed)`;
    }
    return `| ... (model generating, ${formattedTime} elapsed)`;
  };

  const heartbeatTimer = setInterval(() => {
    const now = Date.now();
    // Capture local copies to avoid race conditions with shared mutable state
    const localLastEventTime = lastEventTime;
    const localLastEventType = lastEventType;
    const localLastPrintedAt = lastPrintedAt;
    const timeSinceLastEvent = now - localLastEventTime;
    if (now - localLastPrintedAt >= heartbeatIntervalMs && timeSinceLastEvent >= minHeartbeatDelayMs) {
      // Use local copies for message formatting
      const elapsed = now - localLastEventTime;
      const formattedTime = formatElapsedTime(elapsed);
      let message: string;
      if (localLastEventType === "text") {
        message = `| ... (waiting for model, ${formattedTime} since last output)`;
      } else if (localLastEventType === "tool_start") {
        message = `| ... (tool execution in progress, ${formattedTime} elapsed)`;
      } else {
        message = `| ... (model generating, ${formattedTime} elapsed)`;
      }
      console.log(message);
      lastPrintedAt = now;
    }
  }, heartbeatIntervalMs);

  let subagentMonitor: SubagentMonitor | undefined;
  let sessionId: string | undefined;
  const subagentFormatters = new Map<string, SubagentStreamingFormatter>();

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
          subagentFormatters.set(info.sessionId, new SubagentStreamingFormatter(info));
        }
      },
      onSubagentEvent: (subagentEvent) => {
        if (!silent && subagentEvent.event.type === "text" && subagentEvent.event.content) {
          const formatter = subagentFormatters.get(subagentEvent.subagent.sessionId);
          if (formatter) {
            process.stdout.write(formatter.formatChunk(subagentEvent.event.content));
          }
        }
      },
      onSubagentCompleted: (info: SubagentInfo) => {
        if (!silent) {
          console.log(formatSubagentEnd(info));
          subagentFormatters.delete(info.sessionId);
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
          // Update event tracking for contextual heartbeat
          lastEventType = event.type;
          lastEventTime = Date.now();

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

    // Note: toolCounts are already populated by the onEvent callback,
    // so we don't merge result.toolCounts here to avoid double counting.
    // When streamOutput is false, the callback still runs and counts tools.

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
      ...(result.tokenUsage !== undefined && { tokenUsage: result.tokenUsage }),
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
    // Ensure heartbeat timer is always cleared to prevent resource leaks
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

import type {
  IterationVerificationRecord,
  VerificationStepRecord,
} from "../state/state";

export type VerificationReason =
  | "completion_claim"
  | "task_completion_claim"
  | "every_iteration";

export interface VerificationRunnerOptions {
  commands: string[];
  timeoutMs: number;
  failFast: boolean;
  maxOutputChars: number;
  reason: VerificationReason;
}

export async function runVerification(
  options: VerificationRunnerOptions,
): Promise<IterationVerificationRecord> {
  const steps: VerificationStepRecord[] = [];

  for (const command of options.commands) {
    const step = await runVerificationStep(command, options.timeoutMs, options.maxOutputChars);
    steps.push(step);

    if (options.failFast && (step.timedOut || step.exitCode !== 0)) {
      break;
    }
  }

  const allPassed = steps.length > 0 && steps.every((step) => !step.timedOut && step.exitCode === 0);

  return {
    triggered: true,
    reason: options.reason,
    allPassed,
    steps,
  };
}

async function runVerificationStep(
  command: string,
  timeoutMs: number,
  maxOutputChars: number,
): Promise<VerificationStepRecord> {
  const startedAt = Date.now();
  const proc = Bun.spawn(["/bin/sh", "-lc", command], {
    stdout: "pipe",
    stderr: "pipe",
  });

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    try {
      proc.kill("SIGTERM");
    } catch {
      // Ignore process-kill races.
    }
  }, timeoutMs);

  try {
    const [exitCode, stdoutText, stderrText] = await Promise.all([
      proc.exited,
      proc.stdout ? new Response(proc.stdout).text() : Promise.resolve(""),
      proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(""),
    ]);

    return {
      command,
      exitCode: timedOut ? null : exitCode,
      timedOut,
      durationMs: Math.max(0, Date.now() - startedAt),
      stdoutSnippet: truncateTail(stdoutText, maxOutputChars),
      stderrSnippet: truncateTail(stderrText, maxOutputChars),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function truncateTail(text: string, maxChars: number): string | undefined {
  if (!text) {
    return undefined;
  }
  if (maxChars <= 0) {
    return undefined;
  }
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(-maxChars);
}

export function summarizeVerificationFailure(record: IterationVerificationRecord): {
  summary: string;
  details: string;
} {
  const failedSteps = record.steps.filter((step) => step.timedOut || step.exitCode !== 0);
  const firstFailed = failedSteps[0];
  if (!firstFailed) {
    return {
      summary: "Verification passed",
      details: "",
    };
  }

  const status = firstFailed.timedOut
    ? "TIMEOUT"
    : `exit ${firstFailed.exitCode ?? "unknown"}`;
  const summary = `Verification failed: ${status} for "${firstFailed.command}"`;

  const details = failedSteps
    .map((step) => {
      const header = `- ${step.command} => ${step.timedOut ? "TIMEOUT" : `exit ${step.exitCode}`}`;
      const stderr = step.stderrSnippet ? `  stderr:\n${indentBlock(step.stderrSnippet)}` : "";
      const stdout = step.stdoutSnippet ? `  stdout:\n${indentBlock(step.stdoutSnippet)}` : "";
      return [header, stderr, stdout].filter(Boolean).join("\n");
    })
    .join("\n");

  return { summary, details };
}

function indentBlock(text: string): string {
  return text
    .trimEnd()
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

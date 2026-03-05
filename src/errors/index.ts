export type RalphErrorCode =
  | "SDK_INIT_FAILED"
  | "VALIDATION_FAILED"
  | "STATE_CORRUPTED"
  | "CONFIG_ERROR"
  | "TASK_ERROR"
  | "LOOP_ERROR";

export class RalphError extends Error {
  public readonly code: RalphErrorCode;
  public override readonly cause?: unknown;

  constructor(message: string, code: RalphErrorCode, cause?: unknown) {
    super(message);
    this.name = "RalphError";
    this.code = code;
    this.cause = cause;
  }
}

export class SdkInitError extends RalphError {
  constructor(message: string, cause?: unknown) {
    super(message, "SDK_INIT_FAILED", cause);
    this.name = "SdkInitError";
  }
}

export class ValidationError extends RalphError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_FAILED", cause);
    this.name = "ValidationError";
  }
}

export class StateCorruptedError extends RalphError {
  constructor(message: string, cause?: unknown) {
    super(message, "STATE_CORRUPTED", cause);
    this.name = "StateCorruptedError";
  }
}

export class ConfigError extends RalphError {
  constructor(message: string, cause?: unknown) {
    super(message, "CONFIG_ERROR", cause);
    this.name = "ConfigError";
  }
}

export class TaskError extends RalphError {
  constructor(message: string, cause?: unknown) {
    super(message, "TASK_ERROR", cause);
    this.name = "TaskError";
  }
}

export class LoopError extends RalphError {
  constructor(message: string, cause?: unknown) {
    super(message, "LOOP_ERROR", cause);
    this.name = "LoopError";
  }
}

export function normalizeError(error: unknown): RalphError {
  if (error instanceof RalphError) {
    return error;
  }

  if (error instanceof Error) {
    return new LoopError(error.message, error);
  }

  return new LoopError(String(error));
}

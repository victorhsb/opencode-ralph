import { appendFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LoggerOptions {
  level?: LogLevel;
  structured?: boolean;
  file?: string;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

function normalizeLogLevel(level: string | undefined): LogLevel {
  const normalized = String(level ?? "INFO").toUpperCase();
  if (normalized === "DEBUG" || normalized === "INFO" || normalized === "WARN" || normalized === "ERROR") {
    return normalized;
  }
  return "INFO";
}

function stringifyArg(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseArgs(args: unknown[]): { message: string; meta?: Record<string, unknown> } {
  if (args.length === 0) {
    return { message: "" };
  }

  if (
    args.length === 2 &&
    typeof args[0] === "string" &&
    args[1] !== null &&
    typeof args[1] === "object" &&
    !(args[1] instanceof Error)
  ) {
    return {
      message: args[0],
      meta: args[1] as Record<string, unknown>,
    };
  }

  return {
    message: args.map(stringifyArg).join(" "),
  };
}

export class Logger {
  private level: LogLevel;
  private structured: boolean;
  private file: string | undefined;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? "INFO";
    this.structured = options.structured ?? false;
    this.file = options.file;
  }

  setOptions(options: LoggerOptions): void {
    if (options.level !== undefined) {
      this.level = normalizeLogLevel(options.level);
    }
    if (options.structured !== undefined) {
      this.structured = options.structured;
    }
    if (options.file !== undefined) {
      this.file = options.file;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level];
  }

  private write(level: LogLevel, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const parsed = parseArgs(args);
    const payload = this.structured
      ? JSON.stringify({
        timestamp,
        level,
        message: parsed.message,
        ...(parsed.meta ?? {}),
      })
      : parsed.message;

    if (this.file) {
      try {
        const filePath = resolve(this.file);
        mkdirSync(dirname(filePath), { recursive: true });
        appendFileSync(filePath, `${payload}\n`, "utf-8");
      } catch (error) {
        globalThis.console.warn(`Failed to write log file: ${this.file}`, error);
      }
    }

    if (level === "ERROR") {
      globalThis.console.error(payload);
      return;
    }
    if (level === "WARN") {
      globalThis.console.warn(payload);
      return;
    }
    globalThis.console.log(payload);
  }

  debug(...args: unknown[]): void {
    this.write("DEBUG", ...args);
  }

  info(...args: unknown[]): void {
    this.write("INFO", ...args);
  }

  warn(...args: unknown[]): void {
    this.write("WARN", ...args);
  }

  error(...args: unknown[]): void {
    this.write("ERROR", ...args);
  }

  log(...args: unknown[]): void {
    this.info(...args);
  }
}

let loggerInstance = new Logger({ level: "INFO" });

export const logger = {
  debug: (...args: unknown[]): void => loggerInstance.debug(...args),
  info: (...args: unknown[]): void => loggerInstance.info(...args),
  warn: (...args: unknown[]): void => loggerInstance.warn(...args),
  error: (...args: unknown[]): void => loggerInstance.error(...args),
  log: (...args: unknown[]): void => loggerInstance.log(...args),
};

export function configureLogger(options: LoggerOptions): void {
  const nextOptions: LoggerOptions = {
    level: normalizeLogLevel(options.level),
  };

  if (options.structured !== undefined) {
    nextOptions.structured = options.structured;
  }

  if (options.file !== undefined) {
    nextOptions.file = options.file;
  }

  loggerInstance.setOptions(nextOptions);
}

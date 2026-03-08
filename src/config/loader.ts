import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import { pathToFileURL } from "url";
import type { ZodIssue } from "zod";
import { ConfigError } from "../errors";
import {
  DEFAULT_COMPLETION_PROMISE,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_SUPERVISOR_MEMORY_LIMIT,
  DEFAULT_SUPERVISOR_NO_ACTION_PROMISE,
  DEFAULT_SUPERVISOR_SUGGESTION_PROMISE,
  DEFAULT_TASK_PROMISE,
} from "./config";
import { ConfigSchema, type Config } from "./schema";

export type { Config } from "./schema";

const DEFAULT_CONFIG: Config = {
  logLevel: "INFO",
  structuredLogs: false,
  minIterations: 1,
  maxIterations: DEFAULT_MAX_ITERATIONS,
  completionPromise: DEFAULT_COMPLETION_PROMISE,
  tasks: false,
  taskPromise: DEFAULT_TASK_PROMISE,
  supervisor: false,
  supervisorNoActionPromise: DEFAULT_SUPERVISOR_NO_ACTION_PROMISE,
  supervisorSuggestionPromise: DEFAULT_SUPERVISOR_SUGGESTION_PROMISE,
  supervisorMemoryLimit: DEFAULT_SUPERVISOR_MEMORY_LIMIT,
  stream: true,
  verboseTools: false,
  commit: true,
  plugins: true,
  allowAll: true,
  debugEvents: false,
  silent: false,
  verifyMode: "on-claim",
  verifyTimeoutMs: 300000,
  verifyFailFast: true,
  verifyMaxOutputChars: 4000,
  performance: {
    trackTokens: true,
    estimateCost: true,
  },
  state: {
    compress: false,
    maxHistory: 100,
  },
  dryRun: false,
};

export interface LoadConfigOptions {
  cwd?: string;
  homeDir?: string;
}

export interface LoadedConfig {
  config: Config;
  sources: string[];
}

export async function loadRalphConfig(options: LoadConfigOptions = {}): Promise<LoadedConfig> {
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? homedir();
  const homeConfigPath = resolve(homeDir, ".ralphrc.json");
  const projectJsonConfigPath = resolve(cwd, ".ralphrc.json");
  const projectTsConfigPath = resolve(cwd, "ralph.config.ts");

  let mergedConfig: Config = { ...DEFAULT_CONFIG };
  const sources: string[] = [];

  if (existsSync(homeConfigPath)) {
    mergedConfig = mergeConfig(mergedConfig, readJsonConfig(homeConfigPath));
    sources.push(homeConfigPath);
  }

  if (existsSync(projectJsonConfigPath)) {
    mergedConfig = mergeConfig(mergedConfig, readJsonConfig(projectJsonConfigPath));
    sources.push(projectJsonConfigPath);
  }

  if (existsSync(projectTsConfigPath)) {
    mergedConfig = mergeConfig(mergedConfig, await readTsConfig(projectTsConfigPath));
    sources.push(projectTsConfigPath);
  }

  return {
    config: mergedConfig,
    sources,
  };
}

function mergeConfig(base: Config, incoming: Config): Config {
  return {
    ...base,
    ...incoming,
  };
}

function readJsonConfig(filePath: string): Config {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return validateConfig(parsed, filePath);
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(`Failed to read config file: ${filePath}`, error);
  }
}

async function readTsConfig(filePath: string): Promise<Config> {
  try {
    const moduleUrl = `${pathToFileURL(filePath).href}?t=${Date.now()}`;
    const loaded = await import(moduleUrl);
    const candidate = loaded.default ?? loaded.config ?? loaded;
    return validateConfig(candidate, filePath);
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(`Failed to load TypeScript config file: ${filePath}`, error);
  }
}

function validateConfig(value: unknown, filePath: string): Config {
  const parsed = ConfigSchema.safeParse(value);
  if (!parsed.success) {
    throw new ConfigError(
      `Invalid configuration in ${filePath}: ${formatIssues(parsed.error.issues)}`,
      parsed.error,
    );
  }

  return parsed.data;
}

function formatIssues(issues: ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path} - ${issue.message}`;
    })
    .join("; ");
}

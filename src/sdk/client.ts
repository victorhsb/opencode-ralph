/**
 * SDK Client Module
 *
 * Initializes SDK client and manages server lifecycle.
 * Maps Ralph options to OpenCode SDK configuration.
 */

import { createOpencode } from "@opencode-ai/sdk";
import type { Config } from "@opencode-ai/sdk";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface SdkClientOptions {
  /** Model identifier (e.g., "openai/gpt-4") */
  model?: string;
  /** Filter plugins to auth-only */
  filterPlugins?: boolean;
  /** Allow all permissions for non-interactive use */
  allowAllPermissions?: boolean;
  /** Server hostname */
  hostname?: string;
  /** Server port */
  port?: number;
}

export interface SdkClient {
  /** The OpenCode SDK client instance */
  client: Awaited<ReturnType<typeof createOpencode>>["client"];
  /** Server instance with URL and cleanup method */
  server: { url: string; close: () => void };
}

/**
 * Load plugins from a config file.
 * Supports JSONC (with comments).
 */
function loadPluginsFromConfig(configPath: string): string[] {
  if (!existsSync(configPath)) {
    return [];
  }
  try {
    const raw = readFileSync(configPath, "utf-8");
    // Basic JSONC support: strip // and /* */ comments.
    const withoutBlock = raw.replace(/\/\*[\s\S]*?\*\//g, "");
    const withoutLine = withoutBlock.replace(/^\s*\/\/.*$/gm, "");
    const parsed = JSON.parse(withoutLine);
    const plugins = parsed?.plugin;
    return Array.isArray(plugins) ? plugins.filter((p: unknown) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Load and filter plugins from all config sources.
 * Loads from:
 * - ~/.config/opencode/opencode.json
 * - .ralph/opencode.json
 * - .opencode/opencode.json
 */
function loadPluginsFromExistingConfigs(): string[] {
  const userConfigPath = join(
    process.env.XDG_CONFIG_HOME ?? join(process.env.HOME ?? "", ".config"),
    "opencode",
    "opencode.json"
  );
  const projectConfigPath = join(process.cwd(), ".ralph", "opencode.json");
  const legacyProjectConfigPath = join(process.cwd(), ".opencode", "opencode.json");

  const plugins = [
    ...loadPluginsFromConfig(userConfigPath),
    ...loadPluginsFromConfig(projectConfigPath),
    ...loadPluginsFromConfig(legacyProjectConfigPath),
  ];

  return Array.from(new Set(plugins));
}

/**
 * Create SDK client with configuration.
 *
 * Maps Ralph options to OpenCode SDK configuration:
 * - model: SDK config.model
 * - allowAllPermissions: SDK config.permission (all set to "allow")
 * - filterPlugins: SDK config.plugin (filter to auth-only)
 */
export async function createSdkClient(options: SdkClientOptions): Promise<SdkClient> {
  const config: Config = {
    model: options.model,
  };

  // Map permissions
  if (options.allowAllPermissions) {
    config.permission = {
      read: "allow",
      edit: "allow",
      glob: "allow",
      grep: "allow",
      list: "allow",
      bash: "allow",
      task: "allow",
      webfetch: "allow",
      websearch: "allow",
      codesearch: "allow",
      todowrite: "allow",
      todoread: "allow",
      question: "allow",
      lsp: "allow",
      external_directory: "allow",
    };
  }

  // Map plugin filtering (load and filter existing plugins)
  if (options.filterPlugins) {
    const plugins = loadPluginsFromExistingConfigs();
    config.plugin = plugins.filter((p) => /auth/i.test(p));
  }

  const opencode = await createOpencode({
    hostname: options.hostname ?? "127.0.0.1",
    port: options.port ?? 4096,
    timeout: 10000, // 10 second timeout for server startup
    config,
  });

  return {
    client: opencode.client,
    server: opencode.server,
  };
}

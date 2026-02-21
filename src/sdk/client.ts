/**
 * SDK Client Module
 *
 * Initializes SDK client and manages server lifecycle.
 * Maps Ralph options to OpenCode SDK configuration.
 */

import { createOpencode } from "@opencode-ai/sdk/v2";
import type { Config } from "@opencode-ai/sdk/v2";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createServer } from "net";

export interface SdkClientOptions {
  /** Model identifier (e.g., "openai/gpt-4") */
  model?: string;
  /** Agent to use for the session */
  agent?: string;
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
  server: { url: string; close: () => Promise<void> | void };
}

/**
 * Safely close the SDK server with timeout and logging.
 * Returns true if close succeeded, false if it timed out or failed.
 */
export async function closeSdkServer(
  server: SdkClient["server"],
  verbose = false
): Promise<boolean> {
  if (verbose) {
    console.log("🧹 Closing SDK server...");
  }

  try {
    await server.close();
    if (verbose) {
      console.log("✅ SDK server closed successfully");
    }
    return true;
  } catch (error) {
    if (verbose) {
      console.error("⚠️  SDK server close failed", error);
    }
    return false;
  }
}

function parseFakeEventsFromEnv(): unknown[] {
  const raw = process.env.RALPH_FAKE_EVENTS_JSON;
  if (!raw?.trim()) {
    return [{ type: "session.idle" }];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch { }

  return [{ type: "session.idle" }];
}

/**
 * Parse RALPH_FAKE_OUTPUT_PARTS_JSON and produce an array of text parts for a fake prompt.
 *
 * Attempts to parse the RALPH_FAKE_OUTPUT_PARTS_JSON environment variable as JSON and extract objects
 * with a `type` of `"text"` and a string `text` field. If the environment variable is missing,
 * empty, invalid JSON, or yields no valid parts, returns a single text part containing `defaultOutput`.
 *
 * @param defaultOutput - Fallback text used when no valid parts are found
 * @returns An array of `{ type: "text"; text: string }` parts derived from the environment or a single part with `defaultOutput`
 */
function parseFakePromptPartsFromEnv(defaultOutput: string): Array<{ type: "text"; text: string }> {
  const raw = process.env.RALPH_FAKE_OUTPUT_PARTS_JSON;
  if (!raw?.trim()) {
    return [{ type: "text", text: defaultOutput }];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const parts: Array<{ type: "text"; text: string }> = [];
      for (const part of parsed) {
        if (
          part &&
          typeof part === "object" &&
          (part as Record<string, unknown>).type === "text" &&
          typeof (part as Record<string, unknown>).text === "string"
        ) {
          const text = (part as Record<string, string>).text;
          if (text !== undefined) {
            parts.push({
              type: "text",
              text,
            });
          }
        }
      }
      if (parts.length > 0) {
        return parts;
      }
    }
  } catch { }

  return [{ type: "text", text: defaultOutput }];
}

function hasTerminalFakeEvent(events: unknown[]): boolean {
  return events.some((event) => {
    if (!event || typeof event !== "object") {
      return false;
    }
    const type = (event as Record<string, unknown>).type;
    return type === "session.idle" || type === "session.error";
  });
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

async function findAvailablePort(hostname: string, preferredPort: number): Promise<number> {
  const listenOnce = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.unref();

      server.once("error", reject);
      server.listen(port, hostname, () => {
        const address = server.address();
        const resolvedPort = typeof address === "object" && address ? address.port : port;
        server.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }
          resolve(resolvedPort);
        });
      });
    });
  };

  try {
    return await listenOnce(preferredPort);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
    if (code && code !== "EADDRINUSE") {
      throw error;
    }
    return await listenOnce(0);
  }
}

/**
 * Initialize and return an OpenCode SDK client and its server configured from Ralph options.
 *
 * Maps relevant options from `options` into the SDK config:
 * - `model` sets the SDK model.
 * - `allowAllPermissions` grants broad "allow" permissions for I/O and external actions.
 * - `filterPlugins` loads existing plugin lists and limits `config.plugin` to auth-related plugins.
 * When the environment variable `RALPH_FAKE_SDK` is `"1"`, returns a synthetic client and a noop server driven by `RALPH_FAKE_EVENTS_JSON` and `RALPH_FAKE_OUTPUT_PARTS_JSON`.
 *
 * @param options - Options that influence SDK initialization and server binding (hostname and port).
 * @returns An object with `client` (the initialized SDK client) and `server` (the server URL and a `close` cleanup function).
 */
export async function createSdkClient(options: SdkClientOptions): Promise<SdkClient> {
  if (process.env.RALPH_FAKE_SDK === "1") {
    const output = process.env.RALPH_FAKE_OUTPUT ?? "<promise>COMPLETE</promise>";
    const fakeEvents = parseFakeEventsFromEnv();
    const fakeParts = parseFakePromptPartsFromEnv(output);
    const client = {
      session: {
        create: async () => ({
          data: { id: "fake-session" },
          error: undefined,
        }),
        prompt: async () => ({
          data: {
            parts: fakeParts,
          },
          error: undefined,
        }),
      },
      event: {
        subscribe: async () => ({
          stream: (async function*() {
            for (const event of fakeEvents) {
              yield event;
            }
            if (!hasTerminalFakeEvent(fakeEvents)) {
              yield { type: "session.idle" };
            }
          })(),
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createOpencode>>["client"];

    return {
      client,
      server: {
        url: "http://127.0.0.1:0",
        close: () => { },
      },
    };
  }

  const hostname = options.hostname ?? "127.0.0.1";
  const requestedPort = options.port ?? 4096;
  const port = await findAvailablePort(hostname, requestedPort);

  const config: Config = {};
  if (options.model !== undefined) {
    config.model = options.model;
  }

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
    hostname,
    port,
    timeout: 10000, // 10 second timeout for server startup
    config,
  });

  return {
    client: opencode.client,
    server: opencode.server,
  };
}
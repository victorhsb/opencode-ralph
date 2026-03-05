import { RalphError } from "./index";

const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  SDK_INIT_FAILED: "Failed to initialize the OpenCode SDK. Check your OpenCode installation, API access, and network.",
  VALIDATION_FAILED: "Invalid input provided. Check your command arguments and try again.",
  STATE_CORRUPTED: "State file is invalid or corrupted. Ralph backed it up and can continue with a fresh state.",
  CONFIG_ERROR: "Configuration error detected. Check your Ralph or OpenCode config files.",
  TASK_ERROR: "Task processing error detected. Check your tasks file format.",
  LOOP_ERROR: "An execution error occurred. Retry the command or run with more context.",
};

export function getUserFriendlyMessage(error: RalphError): string {
  return USER_FRIENDLY_MESSAGES[error.code] ?? error.message;
}

/**
 * File I/O Module
 *
 * Utilities for reading files with error handling.
 */

import { existsSync, readFileSync } from "fs";
import { statSync } from "fs";

export function readPromptFile(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`Prompt file not found: ${path}`);
  }
  try {
    const stat = statSync(path);
    if (!stat.isFile()) {
      throw new Error(`Prompt path is not a file: ${path}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes(`Prompt path is not a file`)) {
      throw e;
    }
    throw new Error(`Unable to stat prompt file: ${path}`);
  }
  try {
    const content = readFileSync(path, "utf-8");
    if (!content.trim()) {
      throw new Error(`Prompt file is empty: ${path}`);
    }
    return content;
  } catch {
    throw new Error(`Unable to read prompt file: ${path}`);
  }
}

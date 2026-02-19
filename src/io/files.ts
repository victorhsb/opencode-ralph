/**
 * File I/O Module
 *
 * Utilities for reading files with error handling.
 */

import { existsSync, readFileSync } from "fs";
import { statSync } from "fs";

export function readPromptFile(path: string): string {
  if (!existsSync(path)) {
    console.error(`Error: Prompt file not found: ${path}`);
    process.exit(1);
  }
  try {
    const stat = statSync(path);
    if (!stat.isFile()) {
      console.error(`Error: Prompt path is not a file: ${path}`);
      process.exit(1);
    }
  } catch {
    console.error(`Error: Unable to stat prompt file: ${path}`);
    process.exit(1);
  }
  try {
    const content = readFileSync(path, "utf-8");
    if (!content.trim()) {
      console.error(`Error: Prompt file is empty: ${path}`);
      process.exit(1);
    }
    return content;
  } catch {
    console.error(`Error: Unable to read prompt file: ${path}`);
    process.exit(1);
  }
}

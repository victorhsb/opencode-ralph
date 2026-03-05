/**
 * File I/O Module
 *
 * Utilities for reading files with error handling.
 */

import { existsSync, readFileSync } from "fs";
import { statSync } from "fs";
import { ValidationError } from "../errors";

export function readPromptFile(path: string): string {
  if (!existsSync(path)) {
    throw new ValidationError(`Prompt file not found: ${path}`);
  }
  try {
    const stat = statSync(path);
    if (!stat.isFile()) {
      throw new ValidationError(`Prompt path is not a file: ${path}`);
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      throw e;
    }
    throw new ValidationError(`Unable to stat prompt file: ${path}`, e);
  }
  try {
    const content = readFileSync(path, "utf-8");
    if (!content.trim()) {
      throw new ValidationError(`Prompt file is empty: ${path}`);
    }
    return content;
  } catch (e) {
    if (e instanceof ValidationError) {
      throw e;
    }
    throw new ValidationError(`Unable to read prompt file: ${path}`, e);
  }
}

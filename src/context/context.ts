import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { getContextFilePath, getStateDir } from "../config/config";

export function getContextPath(): string {
  return getContextFilePath();
}

export function loadContext(): string | null {
  const path = getContextPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8").trim();
    return content.length > 0 ? content : null;
  } catch {
    return null;
  }
}

export function appendContext(text: string): void {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return;
  }

  const stateDir = getStateDir();
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  const path = getContextPath();

  try {
    const current = existsSync(path) ? readFileSync(path, "utf-8").trim() : "";
    const nextContent = current ? `${current}\n${trimmedText}` : trimmedText;
    writeFileSync(path, nextContent);
  } catch {}
}

export function clearContext(): void {
  const path = getContextPath();
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {}
  }
}

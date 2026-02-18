/**
 * File Snapshot Tracker Module
 *
 * Tracks file changes between iterations by capturing git-based
 * snapshots and comparing them to detect modified files.
 */

import { $ } from "bun";

export interface FileSnapshot {
  files: Map<string, string>;
}

export async function captureFileSnapshot(): Promise<FileSnapshot> {
  const files = new Map<string, string>();
  try {
    const status = await $`git status --porcelain`.text();
    const trackedFiles = await $`git ls-files`.text();

    const allFiles = new Set<string>();
    for (const line of status.split("\n")) {
      if (line.trim()) {
        allFiles.add(line.substring(3).trim());
      }
    }
    for (const file of trackedFiles.split("\n")) {
      if (file.trim()) {
        allFiles.add(file.trim());
      }
    }

    for (const file of allFiles) {
      try {
        const hash = await $`git hash-object ${file} 2>/dev/null || stat -f '%m' ${file} 2>/dev/null || echo ''`.text();
        files.set(file, hash.trim());
      } catch {}
    }
  } catch {}
  return { files };
}

export function getModifiedFilesSinceSnapshot(before: FileSnapshot, after: FileSnapshot): string[] {
  const changedFiles: string[] = [];

  for (const [file, hash] of after.files) {
    const prevHash = before.files.get(file);
    if (prevHash !== hash) {
      changedFiles.push(file);
    }
  }

  for (const [file] of before.files) {
    if (!after.files.has(file)) {
      changedFiles.push(file);
    }
  }

  return changedFiles;
}

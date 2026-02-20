/**
 * File Snapshot Tracker Tests
 *
 * Tests for file snapshot capture and comparison functionality.
 */

import { describe, test, expect } from "bun:test";
import {
  captureFileSnapshot,
  getModifiedFilesSinceSnapshot,
  FileSnapshot,
} from "../fs-tracker";

describe("FileSnapshot", () => {
  test("creates empty snapshot", () => {
    const snapshot: FileSnapshot = { files: new Map() };
    expect(snapshot.files.size).toBe(0);
  });

  test("creates snapshot with files", () => {
    const files = new Map<string, string>();
    files.set("file1.ts", "hash1");
    files.set("file2.ts", "hash2");

    const snapshot: FileSnapshot = { files };
    expect(snapshot.files.size).toBe(2);
    expect(snapshot.files.get("file1.ts")).toBe("hash1");
  });
});

describe("getModifiedFilesSinceSnapshot", () => {
  test("returns empty when snapshots are identical", () => {
    const files = new Map<string, string>();
    files.set("file1.ts", "hash1");
    files.set("file2.ts", "hash2");

    const before: FileSnapshot = { files };
    const after: FileSnapshot = { files: new Map(files) };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toHaveLength(0);
  });

  test("detects file modifications", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("file1.ts", "hash1");
    beforeFiles.set("file2.ts", "hash2");

    const afterFiles = new Map<string, string>();
    afterFiles.set("file1.ts", "hash1");
    afterFiles.set("file2.ts", "hash2-modified");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toEqual(["file2.ts"]);
  });

  test("detects new files", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("file1.ts", "hash1");

    const afterFiles = new Map<string, string>();
    afterFiles.set("file1.ts", "hash1");
    afterFiles.set("file2.ts", "hash2");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toEqual(["file2.ts"]);
  });

  test("detects deleted files", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("file1.ts", "hash1");
    beforeFiles.set("file2.ts", "hash2");

    const afterFiles = new Map<string, string>();
    afterFiles.set("file1.ts", "hash1");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toEqual(["file2.ts"]);
  });

  test("detects multiple types of changes", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("file1.ts", "hash1");
    beforeFiles.set("file2.ts", "hash2");
    beforeFiles.set("file3.ts", "hash3");

    const afterFiles = new Map<string, string>();
    afterFiles.set("file1.ts", "hash1-modified");
    afterFiles.set("file3.ts", "hash3");
    afterFiles.set("file4.ts", "hash4");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toContain("file1.ts");
    expect(modified).toContain("file2.ts");
    expect(modified).toContain("file4.ts");
    expect(modified).toHaveLength(3);
  });

  test("handles empty before snapshot", () => {
    const before: FileSnapshot = { files: new Map() };

    const afterFiles = new Map<string, string>();
    afterFiles.set("file1.ts", "hash1");
    afterFiles.set("file2.ts", "hash2");

    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toEqual(["file1.ts", "file2.ts"]);
  });

  test("handles empty after snapshot", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("file1.ts", "hash1");
    beforeFiles.set("file2.ts", "hash2");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: new Map() };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toEqual(["file1.ts", "file2.ts"]);
  });

  test("handles both snapshots empty", () => {
    const before: FileSnapshot = { files: new Map() };
    const after: FileSnapshot = { files: new Map() };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toHaveLength(0);
  });

  test("compares hash values correctly", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("file.ts", "abc123");
    beforeFiles.set("file2.ts", "xyz789");

    const afterFiles = new Map<string, string>();
    afterFiles.set("file.ts", "abc123");
    afterFiles.set("file2.ts", "xyz789");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toHaveLength(0);
  });

  test("detects hash changes in same file", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("file.ts", "old-hash");

    const afterFiles = new Map<string, string>();
    afterFiles.set("file.ts", "new-hash");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toEqual(["file.ts"]);
  });

  test("handles files with paths containing special characters", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("src/test file.ts", "hash1");
    beforeFiles.set("src/path/to/file.ts", "hash2");

    const afterFiles = new Map<string, string>();
    afterFiles.set("src/test file.ts", "hash1-modified");
    afterFiles.set("src/path/to/file.ts", "hash2");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toEqual(["src/test file.ts"]);
  });

  test("detects changes in files with same hash value", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("file1.ts", "same-hash");
    beforeFiles.set("file2.ts", "same-hash");

    const afterFiles = new Map<string, string>();
    afterFiles.set("file1.ts", "same-hash");
    afterFiles.set("file2.ts", "different-hash");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toEqual(["file2.ts"]);
  });

  test("handles large number of files", () => {
    const beforeFiles = new Map<string, string>();
    const afterFiles = new Map<string, string>();

    for (let i = 0; i < 100; i++) {
      beforeFiles.set(`file${i}.ts`, `hash${i}`);
    }

    for (let i = 0; i < 100; i++) {
      const hash = i % 2 === 0 ? `hash${i}` : `modified-hash${i}`;
      afterFiles.set(`file${i}.ts`, hash);
    }

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified.length).toBe(50);
  });

  test("preserves ordering of modified files", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("a.ts", "hash-a");
    beforeFiles.set("b.ts", "hash-b");
    beforeFiles.set("c.ts", "hash-c");

    const afterFiles = new Map<string, string>();
    afterFiles.set("a.ts", "hash-a-modified");
    afterFiles.set("b.ts", "hash-b-modified");
    afterFiles.set("c.ts", "hash-c-modified");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  test("handles mixed changes with additions, modifications, and deletions", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("unchanged.ts", "hash1");
    beforeFiles.set("modified.ts", "hash2");
    beforeFiles.set("deleted.ts", "hash3");

    const afterFiles = new Map<string, string>();
    afterFiles.set("unchanged.ts", "hash1");
    afterFiles.set("modified.ts", "hash2-modified");
    afterFiles.set("added.ts", "hash4");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(modified).toContain("modified.ts");
    expect(modified).toContain("deleted.ts");
    expect(modified).toContain("added.ts");
    expect(modified).not.toContain("unchanged.ts");
    expect(modified.length).toBe(3);
  });

  test("handles files with duplicate paths", () => {
    const beforeFiles = new Map<string, string>();
    beforeFiles.set("file.ts", "hash1");

    const afterFiles = new Map<string, string>();
    afterFiles.set("file.ts", "hash1");
    afterFiles.set("file.ts", "hash2");

    const before: FileSnapshot = { files: beforeFiles };
    const after: FileSnapshot = { files: afterFiles };

    const modified = getModifiedFilesSinceSnapshot(before, after);
    expect(afterFiles.size).toBe(1);
    expect(modified).toEqual(["file.ts"]);
  });
});

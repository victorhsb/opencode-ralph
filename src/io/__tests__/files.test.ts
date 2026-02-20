/**
 * File I/O Module Tests
 *
 * Tests for file reading utilities.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { unlinkSync, writeFileSync, mkdirSync, rmdirSync, existsSync, chmodSync } from "fs";
import { tmpdir } from "os";
import { readPromptFile } from "../files";

describe("readPromptFile", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = join(tmpdir(), `files-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    try {
      unlinkSync(join(tempDir, "prompt.txt"));
    } catch {}
    try {
      unlinkSync(join(tempDir, "empty.txt"));
    } catch {}
    try {
      unlinkSync(join(tempDir, "subdir"));
    } catch {}
    try {
      rmdirSync(tempDir);
    } catch {}
  });

  test("reads valid prompt file", () => {
    const filePath = join(tempDir, "prompt.txt");
    writeFileSync(filePath, "Test prompt content");

    const result = readPromptFile(filePath);
    expect(result).toBe("Test prompt content");
  });

  test("reads file with multi-line content", () => {
    const filePath = join(tempDir, "multiline.txt");
    writeFileSync(filePath, "Line 1\nLine 2\nLine 3");

    const result = readPromptFile(filePath);
    expect(result).toBe("Line 1\nLine 2\nLine 3");
  });

  test("reads file with leading/trailing whitespace", () => {
    const filePath = join(tempDir, "whitespace.txt");
    writeFileSync(filePath, "   Content with spaces   ");

    const result = readPromptFile(filePath);
    expect(result).toBe("   Content with spaces   ");
  });

  test("exits with error when file does not exist", () => {
    const filePath = join(tempDir, "nonexistent.txt");

    expect(() => readPromptFile(filePath)).toThrow();
  });

  test("exits with error when path is a directory", () => {
    const dirPath = join(tempDir, "subdir");
    mkdirSync(dirPath);

    expect(() => readPromptFile(dirPath)).toThrow();
  });

  test("exits with error when file is empty", () => {
    const filePath = join(tempDir, "empty.txt");
    writeFileSync(filePath, "");

    expect(() => readPromptFile(filePath)).toThrow();
  });

  test("exits with error when file contains only whitespace", () => {
    const filePath = join(tempDir, "spaces-only.txt");
    writeFileSync(filePath, "   \n  \t  ");

    expect(() => readPromptFile(filePath)).toThrow();
  });

  test("exits with error when file cannot be read", () => {
    const filePath = join(tempDir, "unreadable.txt");
    writeFileSync(filePath, "content");

    try {
      chmodSync(filePath, 0o000);
      expect(() => readPromptFile(filePath)).toThrow();
    } finally {
      chmodSync(filePath, 0o644);
    }
  });

  test("handles file with special characters", () => {
    const filePath = join(tempDir, "special.txt");
    const content = "Special chars: <>&\"'`\nUnicode: 你好世界 🚀";
    writeFileSync(filePath, content);

    const result = readPromptFile(filePath);
    expect(result).toBe(content);
  });

  test("handles very long file content", () => {
    const filePath = join(tempDir, "long.txt");
    const longContent = "x".repeat(100000);
    writeFileSync(filePath, longContent);

    const result = readPromptFile(filePath);
    expect(result.length).toBe(100000);
    expect(result).toBe(longContent);
  });

  test("reads file with mixed line endings", () => {
    const filePath = join(tempDir, "mixed-eol.txt");
    writeFileSync(filePath, "Line 1\r\nLine 2\nLine 3\r");

    const result = readPromptFile(filePath);
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
    expect(result).toContain("Line 3");
  });

  test("reads UTF-8 encoded file", () => {
    const filePath = join(tempDir, "utf8.txt");
    const utf8Content = "Hello 世界 🌍 Привет مرحبا";
    writeFileSync(filePath, utf8Content, "utf-8");

    const result = readPromptFile(filePath);
    expect(result).toBe(utf8Content);
  });
});

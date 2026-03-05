/**
 * PromptBuilder Tests
 *
 * Tests for the PromptBuilder class that constructs structured markdown prompts
 * from text, list, and tasklist sections.
 */

import { describe, test, expect } from "bun:test";
import { PromptBuilder } from "../prompt-builder";

describe("PromptBuilder", () => {
  describe("empty builder", () => {
    test("returns empty string when no sections added", () => {
      const builder = new PromptBuilder();
      expect(builder.build()).toBe("");
    });
  });

  describe("text sections", () => {
    test("renders plain text correctly", () => {
      const builder = new PromptBuilder();
      builder.addText("Hello, world!");
      expect(builder.build()).toBe("Hello, world!");
    });

    test("renders text section with title", () => {
      const builder = new PromptBuilder();
      builder.addText("This is the content.", "Introduction");
      expect(builder.build()).toBe("## Introduction\n\nThis is the content.");
    });

    test("renders text section without title as just content", () => {
      const builder = new PromptBuilder();
      builder.addText("Plain content here");
      expect(builder.build()).toBe("Plain content here");
    });

    test("handles multiline text content", () => {
      const builder = new PromptBuilder();
      builder.addText("Line one\nLine two\nLine three");
      expect(builder.build()).toBe("Line one\nLine two\nLine three");
    });

    test("handles text with title and multiline content", () => {
      const builder = new PromptBuilder();
      builder.addText("First paragraph.\n\nSecond paragraph.", "Section Title");
      expect(builder.build()).toBe("## Section Title\n\nFirst paragraph.\n\nSecond paragraph.");
    });
  });

  describe("list sections", () => {
    test("renders items as bullet list", () => {
      const builder = new PromptBuilder();
      builder.addList(["Item 1", "Item 2", "Item 3"]);
      expect(builder.build()).toBe("- Item 1\n- Item 2\n- Item 3");
    });

    test("renders list section with title", () => {
      const builder = new PromptBuilder();
      builder.addList(["Apple", "Banana"], "Fruits");
      expect(builder.build()).toBe("## Fruits\n\n- Apple\n- Banana");
    });

    test("renders list section without title", () => {
      const builder = new PromptBuilder();
      builder.addList(["Alpha", "Beta"]);
      expect(builder.build()).toBe("- Alpha\n- Beta");
    });

    test("handles single item list", () => {
      const builder = new PromptBuilder();
      builder.addList(["Only item"]);
      expect(builder.build()).toBe("- Only item");
    });
  });

  describe("tasklist sections", () => {
    test("renders checked items with [x]", () => {
      const builder = new PromptBuilder();
      builder.addTaskList([{ text: "Completed task", checked: true }]);
      expect(builder.build()).toBe("- [x] Completed task");
    });

    test("renders unchecked items with [ ]", () => {
      const builder = new PromptBuilder();
      builder.addTaskList([{ text: "Pending task", checked: false }]);
      expect(builder.build()).toBe("- [ ] Pending task");
    });

    test("renders mixed checked and unchecked items", () => {
      const builder = new PromptBuilder();
      builder.addTaskList([
        { text: "Done", checked: true },
        { text: "In progress", checked: false },
        { text: "Also done", checked: true },
        { text: "Not started", checked: false },
      ]);
      expect(builder.build()).toBe("- [x] Done\n- [ ] In progress\n- [x] Also done\n- [ ] Not started");
    });

    test("renders tasklist section with title", () => {
      const builder = new PromptBuilder();
      builder.addTaskList(
        [
          { text: "Task A", checked: true },
          { text: "Task B", checked: false },
        ],
        "Todo List"
      );
      expect(builder.build()).toBe("## Todo List\n\n- [x] Task A\n- [ ] Task B");
    });

    test("renders tasklist section without title", () => {
      const builder = new PromptBuilder();
      builder.addTaskList([
        { text: "Task 1", checked: false },
        { text: "Task 2", checked: true },
      ]);
      expect(builder.build()).toBe("- [ ] Task 1\n- [x] Task 2");
    });
  });

  describe("empty section filtering", () => {
    test("skips empty text sections", () => {
      const builder = new PromptBuilder();
      builder.addText("");
      expect(builder.build()).toBe("");
    });

    test("skips whitespace-only text sections", () => {
      const builder = new PromptBuilder();
      builder.addText("   \n\t  ");
      expect(builder.build()).toBe("");
    });

    test("skips empty list items arrays", () => {
      const builder = new PromptBuilder();
      builder.addList([]);
      expect(builder.build()).toBe("");
    });

    test("skips empty tasklist items arrays", () => {
      const builder = new PromptBuilder();
      builder.addTaskList([]);
      expect(builder.build()).toBe("");
    });

    test("filters empty sections in mixed content", () => {
      const builder = new PromptBuilder();
      builder.addText("");
      builder.addList(["Real item"]);
      builder.addTaskList([]);
      expect(builder.build()).toBe("- Real item");
    });
  });

  describe("multiple sections", () => {
    test("joins sections with double newline", () => {
      const builder = new PromptBuilder();
      builder.addText("First section");
      builder.addText("Second section");
      expect(builder.build()).toBe("First section\n\nSecond section");
    });

    test("joins three sections correctly", () => {
      const builder = new PromptBuilder();
      builder.addText("Text content");
      builder.addList(["Item A", "Item B"]);
      builder.addTaskList([{ text: "Task", checked: false }]);
      expect(builder.build()).toBe("Text content\n\n- Item A\n- Item B\n\n- [ ] Task");
    });

    test("joins sections with titles correctly", () => {
      const builder = new PromptBuilder();
      builder.addText("Intro text", "Introduction");
      builder.addList(["Point 1", "Point 2"], "Key Points");
      expect(builder.build()).toBe("## Introduction\n\nIntro text\n\n## Key Points\n\n- Point 1\n- Point 2");
    });
  });

  describe("fluent API", () => {
    test("addText returns this for chaining", () => {
      const builder = new PromptBuilder();
      const result = builder.addText("test");
      expect(result).toBe(builder);
    });

    test("addList returns this for chaining", () => {
      const builder = new PromptBuilder();
      const result = builder.addList(["item"]);
      expect(result).toBe(builder);
    });

    test("addTaskList returns this for chaining", () => {
      const builder = new PromptBuilder();
      const result = builder.addTaskList([{ text: "task", checked: false }]);
      expect(result).toBe(builder);
    });

    test("addSection returns this for chaining", () => {
      const builder = new PromptBuilder();
      const result = builder.addSection({ type: "text", content: "test" });
      expect(result).toBe(builder);
    });

    test("supports method chaining", () => {
      const result = new PromptBuilder()
        .addText("Header", "Title")
        .addList(["A", "B"])
        .addTaskList([{ text: "Task", checked: true }])
        .build();

      expect(result).toBe("## Title\n\nHeader\n\n- A\n- B\n\n- [x] Task");
    });
  });

  describe("addSection method", () => {
    test("adds text section object directly", () => {
      const builder = new PromptBuilder();
      builder.addSection({ type: "text", content: "Direct text" });
      expect(builder.build()).toBe("Direct text");
    });

    test("adds text section with title object directly", () => {
      const builder = new PromptBuilder();
      builder.addSection({ type: "text", content: "Content", title: "Title" });
      expect(builder.build()).toBe("## Title\n\nContent");
    });

    test("adds list section object directly", () => {
      const builder = new PromptBuilder();
      builder.addSection({ type: "list", items: ["One", "Two"] });
      expect(builder.build()).toBe("- One\n- Two");
    });

    test("adds list section with title object directly", () => {
      const builder = new PromptBuilder();
      builder.addSection({ type: "list", items: ["X", "Y"], title: "List Title" });
      expect(builder.build()).toBe("## List Title\n\n- X\n- Y");
    });

    test("adds tasklist section object directly", () => {
      const builder = new PromptBuilder();
      builder.addSection({ type: "tasklist", items: [{ text: "Todo", checked: false }] });
      expect(builder.build()).toBe("- [ ] Todo");
    });

    test("adds tasklist section with title object directly", () => {
      const builder = new PromptBuilder();
      builder.addSection({
        type: "tasklist",
        items: [{ text: "Done", checked: true }],
        title: "Tasks",
      });
      expect(builder.build()).toBe("## Tasks\n\n- [x] Done");
    });

    test("filters empty section objects", () => {
      const builder = new PromptBuilder();
      builder.addSection({ type: "text", content: "" });
      builder.addSection({ type: "list", items: [] });
      builder.addSection({ type: "tasklist", items: [] });
      expect(builder.build()).toBe("");
    });
  });

  describe("mixed sections", () => {
    test("combination of text, list, and tasklist", () => {
      const builder = new PromptBuilder();
      builder.addText("Welcome to the project!", "Overview");
      builder.addList(["Feature A", "Feature B", "Feature C"], "Features");
      builder.addTaskList(
        [
          { text: "Setup project", checked: true },
          { text: "Write tests", checked: false },
          { text: "Deploy", checked: false },
        ],
        "Roadmap"
      );

      const expected =
        "## Overview\n\nWelcome to the project!\n\n" +
        "## Features\n\n- Feature A\n- Feature B\n- Feature C\n\n" +
        "## Roadmap\n\n- [x] Setup project\n- [ ] Write tests\n- [ ] Deploy";

      expect(builder.build()).toBe(expected);
    });

    test("mixes titled and untitled sections", () => {
      const builder = new PromptBuilder();
      builder.addText("Untitled text");
      builder.addList(["Item"], "Titled List");
      builder.addText("More text");

      expect(builder.build()).toBe("Untitled text\n\n## Titled List\n\n- Item\n\nMore text");
    });

    test("handles complex realistic prompt", () => {
      const builder = new PromptBuilder();

      builder.addText(
        "You are an AI assistant helping with code review.\nFocus on security and performance.",
        "Instructions"
      );

      builder.addList([
        "Check for SQL injection vulnerabilities",
        "Review authentication logic",
        "Analyze database queries",
      ], "Security Checklist");

      builder.addTaskList([
        { text: "Review PR #123", checked: true },
        { text: "Review PR #124", checked: false },
        { text: "Review PR #125", checked: false },
      ], "Pending Reviews");

      const result = builder.build();

      expect(result).toContain("## Instructions");
      expect(result).toContain("## Security Checklist");
      expect(result).toContain("## Pending Reviews");
      expect(result).toContain("- [x] Review PR #123");
      expect(result).toContain("- [ ] Review PR #124");
      expect(result).toContain("- Check for SQL injection vulnerabilities");
    });
  });

  describe("edge cases", () => {
    test("handles special characters in text", () => {
      const builder = new PromptBuilder();
      builder.addText("Special: <>&\"'`$\\n\\t");
      expect(builder.build()).toBe("Special: <>&\"'`$\\n\\t");
    });

    test("handles markdown-like content in text", () => {
      const builder = new PromptBuilder();
      builder.addText("# Not a real heading\n**Not bold**");
      expect(builder.build()).toBe("# Not a real heading\n**Not bold**");
    });

    test("handles items with special characters", () => {
      const builder = new PromptBuilder();
      builder.addList(["Item with *asterisks*", "Item with _underscores_", "Item with `backticks`"]);
      expect(builder.build()).toBe("- Item with *asterisks*\n- Item with _underscores_\n- Item with `backticks`");
    });

    test("handles task items with special characters", () => {
      const builder = new PromptBuilder();
      builder.addTaskList([{ text: "Fix bug in `function()`", checked: true }]);
      expect(builder.build()).toBe("- [x] Fix bug in `function()`");
    });

    test("handles unicode content", () => {
      const builder = new PromptBuilder();
      builder.addText("Hello 世界 🌍");
      expect(builder.build()).toBe("Hello 世界 🌍");
    });

    test("handles very long content", () => {
      const builder = new PromptBuilder();
      const longText = "A".repeat(10000);
      builder.addText(longText);
      expect(builder.build()).toBe(longText);
    });

    test("handles many sections", () => {
      const builder = new PromptBuilder();
      for (let i = 0; i < 100; i++) {
        builder.addText(`Section ${i}`);
      }
      const result = builder.build();
      expect(result).toContain("Section 0");
      expect(result).toContain("Section 99");
    });
  });
});

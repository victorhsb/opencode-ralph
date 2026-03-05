/**
 * PromptBuilder - A fluent builder for constructing well-formatted markdown prompts.
 */

export interface BaseSection {
  title?: string;
}

export interface TextSection extends BaseSection {
  type: "text";
  content: string;
}

export interface ListSection extends BaseSection {
  type: "list";
  items: string[];
}

export interface TaskListSection extends BaseSection {
  type: "tasklist";
  items: { text: string; checked: boolean }[];
}

export type Section = TextSection | ListSection | TaskListSection;

/**
 * Renders a section to its markdown representation.
 * Returns null if the section should be skipped (empty content/items).
 */
function renderSection(section: Section): string | null {
  const content = renderSectionContent(section);

  // Skip empty sections
  if (content === null) {
    return null;
  }

  if (section.title) {
    return `## ${section.title}\n\n${content}`;
  }

  return content;
}

/**
 * Renders the content of a section (without title).
 * Returns null if the section has no meaningful content.
 */
function renderSectionContent(section: Section): string | null {
  switch (section.type) {
    case "text": {
      const trimmed = section.content.trim();
      if (trimmed.length === 0) {
        return null;
      }
      return section.content;
    }

    case "list": {
      if (section.items.length === 0) {
        return null;
      }
      return section.items.map((item) => `- ${item}`).join("\n");
    }

    case "tasklist": {
      if (section.items.length === 0) {
        return null;
      }
      return section.items
        .map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`)
        .join("\n");
    }

    default: {
      // Exhaustive check
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

export class PromptBuilder {
  private sections: Section[] = [];

  /**
   * Adds a text section to the prompt.
   */
  addText(content: string, title?: string): this {
    const section: TextSection = {
      type: "text",
      content,
    };
    if (title !== undefined) {
      section.title = title;
    }
    this.sections.push(section);
    return this;
  }

  /**
   * Adds a list section to the prompt.
   */
  addList(items: string[], title?: string): this {
    const section: ListSection = {
      type: "list",
      items,
    };
    if (title !== undefined) {
      section.title = title;
    }
    this.sections.push(section);
    return this;
  }

  /**
   * Adds a task list section to the prompt.
   */
  addTaskList(items: { text: string; checked: boolean }[], title?: string): this {
    const section: TaskListSection = {
      type: "tasklist",
      items,
    };
    if (title !== undefined) {
      section.title = title;
    }
    this.sections.push(section);
    return this;
  }

  /**
   * Adds a pre-constructed section to the prompt.
   */
  addSection(section: Section): this {
    this.sections.push(section);
    return this;
  }

  /**
   * Builds and returns the final markdown prompt string.
   * Empty sections are filtered out and remaining sections are joined with double newlines.
   */
  build(): string {
    const rendered = this.sections
      .map(renderSection)
      .filter((s): s is string => s !== null);

    return rendered.join("\n\n");
  }
}

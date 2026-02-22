/**
 * Init Subcommand
 *
 * Initializes Ralph in a project by creating .ralph/ directory and starter files.
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  appendFileSync,
  readFileSync,
  rmSync,
  chmodSync,
} from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import type { Command } from "commander";
import { unzipSync } from "fflate";

// Import the embedded skill file - Bun will embed this in the compiled binary
// For bundled code, we need to resolve the path relative to this module
import rawSkillPath from "../../../ralph-cli-manager.skill";
const skillPath = import.meta.resolve
  ? import.meta.resolve("./ralph-cli-manager.skill")
  : rawSkillPath;

/**
 * Init command options
 */
export interface InitOptions {
  skill?: boolean;
  force?: boolean;
}

/**
 * Content for starter files
 */
const TASKS_FILE_CONTENT = `# Ralph Tasks

Add your tasks below. Ralph will work through them one at a time.

- [ ] First task goes here
- [ ] Second task goes here
`;

const CONTEXT_FILE_CONTENT = `# Ralph Context

This file is used to inject hints and context into the next iteration.
Any content here will be included in the prompt for the next loop iteration.
After use, the content is cleared automatically.

<!-- Add your context hints below -->
`;

/**
 * Register the init subcommand
 * @param program - Commander program instance
 */
export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize Ralph in the current project")
    .option("--no-skill", "Skip skill installation")
    .option("--force", "Overwrite existing .ralph/ directory")
    .action(initCommandAction);
}

/**
 * Init command action handler
 * @param options - Command options
 */
export function initCommandAction(options: InitOptions): void {
  const ralphDir = ".ralph";
  const ralphDirPath = join(process.cwd(), ralphDir);

  // Check if .ralph/ exists
  if (existsSync(ralphDirPath)) {
    if (!options.force) {
      console.error(`❌ Error: ${ralphDir}/ already exists. Use --force to overwrite.`);
      process.exit(1);
    }
    console.log(`⚠️  Overwriting existing ${ralphDir}/ directory`);
    // Remove existing directory and its contents
    try {
      rmSync(ralphDirPath, { recursive: true, force: true });
    } catch (error) {
      console.error(`❌ Error removing existing ${ralphDir}/ directory:`, error);
      process.exit(1);
    }
  }

  // Create .ralph/ directory
  console.log(`📁 Creating ${ralphDir}/ directory...`);
  try {
    mkdirSync(ralphDirPath, { recursive: true });
  } catch (error) {
    console.error(`❌ Error creating ${ralphDir}/ directory:`, error);
    process.exit(1);
  }

  // Create starter files
  createStarterFiles(ralphDirPath);

  // Update .gitignore
  updateGitignore(ralphDir);

  // Install skill unless --no-skill
  if (options.skill !== false) {
    installSkill();
  } else {
    console.log("⏭️  Skipping skill installation (--no-skill)");
  }

  console.log("\n✅ Ralph initialized successfully!");
  console.log("\n📝 Next steps:");
  console.log("   1. Edit .ralph/ralph-tasks.md to add your tasks");
  console.log("   2. Run 'ralph task list' to view your tasks");
  console.log("   3. Run 'ralph \"your prompt\" --tasks' to start working on tasks");
  process.exit(0);
}

/**
 * Create starter files in .ralph/ directory
 * @param ralphDirPath - Path to .ralph/ directory
 */
function createStarterFiles(ralphDirPath: string): void {
  console.log("📝 Creating starter files...");

  // Create ralph-tasks.md
  const tasksPath = join(ralphDirPath, "ralph-tasks.md");
  try {
    writeFileSync(tasksPath, TASKS_FILE_CONTENT, "utf-8");
    console.log("   ✓ Created ralph-tasks.md");
  } catch (error) {
    console.error("   ✗ Error creating ralph-tasks.md:", error);
    process.exit(1);
  }

  // Create ralph-context.md
  const contextPath = join(ralphDirPath, "ralph-context.md");
  try {
    writeFileSync(contextPath, CONTEXT_FILE_CONTENT, "utf-8");
    console.log("   ✓ Created ralph-context.md");
  } catch (error) {
    console.error("   ✗ Error creating ralph-context.md:", error);
    process.exit(1);
  }
}

/**
 * Update .gitignore to include .ralph/ entry
 * @param ralphDir - The .ralph directory name
 */
function updateGitignore(ralphDir: string): void {
  const gitignorePath = join(process.cwd(), ".gitignore");

  // Check if .gitignore exists
  if (!existsSync(gitignorePath)) {
    console.log("📄 Creating .gitignore...");
    try {
      writeFileSync(gitignorePath, `${ralphDir}/\n`, "utf-8");
      console.log("   ✓ Added .ralph/ to .gitignore");
      return;
    } catch (error) {
      console.error("   ✗ Error creating .gitignore:", error);
      // Non-fatal, continue
      return;
    }
  }

  // Check if .ralph/ is already in .gitignore
  try {
    const gitignoreContent = readFileSync(gitignorePath, "utf-8");
    const lines = gitignoreContent.split("\n");

    // Check for exact match or pattern match
    const hasEntry = lines.some((line) => {
      const trimmed = line.trim();
      return trimmed === ralphDir || trimmed === `${ralphDir}/`;
    });

    if (hasEntry) {
      console.log("📄 .gitignore already contains .ralph/ entry");
      return;
    }

    // Add .ralph/ to .gitignore
    // Ensure there's a newline before adding if file doesn't end with one
    const needsNewline = gitignoreContent.length > 0 && !gitignoreContent.endsWith("\n");
    const entry = needsNewline ? `\n${ralphDir}/\n` : `${ralphDir}/\n`;

    appendFileSync(gitignorePath, entry, "utf-8");
    console.log("📄 Added .ralph/ to .gitignore");
  } catch (error) {
    console.error("   ✗ Error updating .gitignore:", error);
    // Non-fatal, continue
  }
}

/**
 * Install the ralph-cli-manager skill to opencode skills directory.
 * The skill is embedded in the binary and extracted at runtime.
 */
function installSkill(): void {
  console.log("🔧 Installing ralph-cli-manager skill...");

  // Determine destination path (~/.config/opencode/skills/ralph-cli-manager)
  const home = homedir();
  if (!home) {
    console.log("   ⚠️  Could not determine home directory, skipping skill installation");
    return;
  }

  const skillDestPath = join(home, ".config", "opencode", "skills", "ralph-cli-manager");

  try {
    // Read the embedded skill file
    const skillContent = readFileSync(skillPath);

    // Unzip using fflate
    const unzipped = unzipSync(new Uint8Array(skillContent));

    // Write each file to destination
    let filesWritten = 0;
    for (const [relativePath, content] of Object.entries(unzipped)) {
      // Skip directories (they end with /)
      if (relativePath.endsWith("/")) {
        continue;
      }

      // Remove the "ralph-cli-manager/" prefix from the path
      const relativePathWithoutPrefix = relativePath.replace(/^ralph-cli-manager\//, "");
      const fullPath = join(skillDestPath, relativePathWithoutPrefix);
      const dir = dirname(fullPath);

      // Ensure directory exists
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(fullPath, content);
      filesWritten++;

      // Make .sh files executable
      if (relativePath.endsWith(".sh")) {
        chmodSync(fullPath, 0o755);
      }
    }

    console.log(`   ✓ Installed skill (${filesWritten} files) to ~/.config/opencode/skills/ralph-cli-manager/`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("   ✗ Error installing skill:", errorMessage);
    console.log("   ℹ️  You may need to manually install the ralph-cli-manager skill");
    // Non-fatal, continue
  }
}

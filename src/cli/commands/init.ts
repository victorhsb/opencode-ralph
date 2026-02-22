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
import { fileURLToPath } from "url";
import type { Command } from "commander";
import { unzipSync } from "fflate";

// Import the embedded skill files - Bun will embed these in the compiled binary
// The import returns the path to the file (or the virtual path in compiled mode)
// We also use import.meta.resolve as a fallback for bundled JS mode
import importedRalphCliManagerPath from "../../../ralph-cli-manager.skill";
import importedRalphLoopPlanCreatorPath from "../../../ralph-loop-plan-creator.skill";

const resolvedRalphCliManagerPath = import.meta.resolve(
  "./ralph-cli-manager.skill",
);
const resolvedRalphLoopPlanCreatorPath = import.meta.resolve(
  "./ralph-loop-plan-creator.skill",
);

/**
 * Resolve skill path based on runtime mode (compiled binary, JS bundle, or dev)
 */
function resolveSkillPath(
  importedPath: string,
  resolvedPath: string,
): string {
  // For compiled binary: importedPath points to virtual fs (/$bunfs/...)
  // For JS bundle: resolvedPath gives correct path relative to bundle location
  // For dev mode: importedPath is already the absolute path
  if (importedPath.startsWith("/$bunfs/")) {
    return importedPath; // Compiled binary - use virtual fs path
  }
  if (importedPath.startsWith("./")) {
    return fileURLToPath(resolvedPath); // JS bundle - resolve relative to bundle
  }
  return importedPath; // Dev mode - use absolute path directly
}

// Resolve paths for both skills
const ralphCliManagerPath = resolveSkillPath(
  importedRalphCliManagerPath,
  resolvedRalphCliManagerPath,
);
const ralphLoopPlanCreatorPath = resolveSkillPath(
  importedRalphLoopPlanCreatorPath,
  resolvedRalphLoopPlanCreatorPath,
);

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
      console.error(
        `❌ Error: ${ralphDir}/ already exists. Use --force to overwrite.`,
      );
      process.exit(1);
    }
    console.log(`⚠️  Overwriting existing ${ralphDir}/ directory`);
    // Remove existing directory and its contents
    try {
      rmSync(ralphDirPath, { recursive: true, force: true });
    } catch (error) {
      console.error(
        `❌ Error removing existing ${ralphDir}/ directory:`,
        error,
      );
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

  // Install skills unless --no-skill
  if (options.skill !== false) {
    installSkills();
  } else {
    console.log("⏭️  Skipping skill installation (--no-skill)");
  }

  console.log("\n✅ Ralph initialized successfully!");
  console.log("\n📝 Next steps:");
  console.log("   1. Edit .ralph/ralph-tasks.md to add your tasks");
  console.log("   2. Run 'ralph task list' to view your tasks");
  console.log(
    "   3. Run 'ralph \"your prompt\" --tasks' to start working on tasks",
  );
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
    const needsNewline =
      gitignoreContent.length > 0 && !gitignoreContent.endsWith("\n");
    const entry = needsNewline ? `\n${ralphDir}/\n` : `${ralphDir}/\n`;

    appendFileSync(gitignorePath, entry, "utf-8");
    console.log("📄 Added .ralph/ to .gitignore");
  } catch (error) {
    console.error("   ✗ Error updating .gitignore:", error);
    // Non-fatal, continue
  }
}

/**
 * Skill configuration for embedded skills
 */
interface SkillConfig {
  name: string;
  displayName: string;
  path: string;
}

/**
 * Install a single skill to opencode skills directory.
 * The skill is embedded in the binary and extracted at runtime.
 * Errors are non-fatal - logs warning and continues.
 */
function installSingleSkill(config: SkillConfig): void {
  console.log(`🔧 Installing ${config.displayName} skill...`);

  // Determine destination path (~/.config/opencode/skills/<skill-name>)
  const home = homedir();
  if (!home) {
    console.log(
      "   ⚠️  Could not determine home directory, skipping skill installation",
    );
    return;
  }

  const skillDestPath = join(
    home,
    ".config",
    "opencode",
    "skills",
    config.name,
  );

  try {
    // Read the embedded skill file
    const skillContent = readFileSync(config.path);

    // Unzip using fflate
    const unzipped = unzipSync(new Uint8Array(skillContent));

    // Write each file to destination
    let filesWritten = 0;
    for (const [relativePath, content] of Object.entries(unzipped)) {
      // Skip directories (they end with /)
      if (relativePath.endsWith("/")) {
        continue;
      }

      // Remove the skill name prefix from the path (e.g., "ralph-cli-manager/")
      const relativePathWithoutPrefix = relativePath.replace(
        new RegExp(`^${config.name}/`),
        "",
      );
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

    console.log(
      `   ✓ Installed skill (${filesWritten} files) to ~/.config/opencode/skills/${config.name}/`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ✗ Error installing ${config.displayName} skill:`, errorMessage);
    console.log(
      `   ℹ️  You may need to manually install the ${config.displayName} skill`,
    );
    // Non-fatal, continue
  }
}

/**
 * Install all embedded skills to opencode skills directory.
 */
function installSkills(): void {
  const skills: SkillConfig[] = [
    {
      name: "ralph-cli-manager",
      displayName: "ralph-cli-manager",
      path: ralphCliManagerPath,
    },
    {
      name: "ralph-loop-plan-creator",
      displayName: "ralph-loop-plan-creator",
      path: ralphLoopPlanCreatorPath,
    },
  ];

  for (const skill of skills) {
    installSingleSkill(skill);
  }
}

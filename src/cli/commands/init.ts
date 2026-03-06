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
import { logger as console } from "../../logger";

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
  skillsScope?: "local" | "global";
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
    .option(
      "--skills-scope <scope>",
      "Install skills locally (project) or globally (user home)",
      "local",
    )
    .addHelpText(
      "after",
      `
Examples:
  $ ralph init                          # Initialize with local skills (default)
  $ ralph init --skills-scope local     # Same as above
  $ ralph init --skills-scope global    # Install skills to ~/.config/opencode/skills/`,
    )
    .action((options: InitOptions) => {
      // Validate skills-scope using choices logic
      if (
        options.skillsScope !== undefined &&
        !["local", "global"].includes(options.skillsScope)
      ) {
        console.error(
          `Error: Invalid --skills-scope value "${options.skillsScope}". Must be "local" or "global".`,
        );
        process.exit(1);
      }
      initCommandAction(options);
    });
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
  const skillsScope = options.skillsScope ?? "local";
  updateGitignore(ralphDir, skillsScope);

  // Install skills unless --no-skill
  if (options.skill !== false) {
    const scope = options.skillsScope ?? "local";
    installSkills(scope);
  } else {
    console.log("⏭️  Skipping skill installation (--no-skill)");
  }

  console.log("\n✅ Ralph initialized successfully!");
  console.log("\n📝 Next steps:");
  console.log("   1. Edit .ralph/tasks.md to add your tasks");
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

  // Create tasks.md
  const tasksPath = join(ralphDirPath, "tasks.md");
  try {
    writeFileSync(tasksPath, TASKS_FILE_CONTENT, "utf-8");
    console.log("   ✓ Created tasks.md");
  } catch (error) {
    console.error("   ✗ Error creating tasks.md:", error);
    process.exit(1);
  }

  // Create context.md
  const contextPath = join(ralphDirPath, "context.md");
  try {
    writeFileSync(contextPath, CONTEXT_FILE_CONTENT, "utf-8");
    console.log("   ✓ Created context.md");
  } catch (error) {
    console.error("   ✗ Error creating context.md:", error);
    process.exit(1);
  }
}

/**
 * Update .gitignore to include .ralph/ and optionally .opencode/ entries
 * @param ralphDir - The .ralph directory name
 * @param skillsScope - Installation scope (local installs need .opencode/ in gitignore)
 */
function updateGitignore(ralphDir: string, skillsScope: SkillScope): void {
  const gitignorePath = join(process.cwd(), ".gitignore");
  const entriesToAdd: string[] = [ralphDir];

  // For local skills installation, also add .opencode/ to gitignore
  if (skillsScope === "local") {
    entriesToAdd.push(".opencode");
  }

  // Check if .gitignore exists
  if (!existsSync(gitignorePath)) {
    console.log("📄 Creating .gitignore...");
    try {
      const content = entriesToAdd.map((entry) => `${entry}/\n`).join("");
      writeFileSync(gitignorePath, content, "utf-8");
      console.log("   ✓ Added to .gitignore:", entriesToAdd.join(", "));
      return;
    } catch (error) {
      console.error("   ✗ Error creating .gitignore:", error);
      // Non-fatal, continue
      return;
    }
  }

  // Check which entries are already in .gitignore and add missing ones
  try {
    const gitignoreContent = readFileSync(gitignorePath, "utf-8");
    const lines = gitignoreContent.split("\n");

    const entriesToAddFiltered = entriesToAdd.filter((entry) => {
      return !lines.some((line) => {
        const trimmed = line.trim();
        return (
          trimmed === entry ||
          trimmed === `${entry}/` ||
          trimmed === `${entry}/*`
        );
      });
    });

    if (entriesToAddFiltered.length === 0) {
      console.log("📄 .gitignore already contains all necessary entries");
      return;
    }

    // Add missing entries to .gitignore
    // Ensure there's a newline before adding if file doesn't end with one
    const needsNewline =
      gitignoreContent.length > 0 && !gitignoreContent.endsWith("\n");
    const entriesText = entriesToAddFiltered
      .map((entry) => `${entry}/`)
      .join("\n");
    const entry = needsNewline
      ? `\n${entriesText}\n`
      : `${entriesText}\n`;

    appendFileSync(gitignorePath, entry, "utf-8");
    console.log("📄 Added to .gitignore:", entriesToAddFiltered.join(", "));
  } catch (error) {
    console.error("   ✗ Error updating .gitignore:", error);
    // Non-fatal, continue
  }
}

/**
 * Skill scope type
 */
type SkillScope = "local" | "global";

/**
 * Skill configuration for embedded skills
 */
interface SkillConfig {
  name: string;
  displayName: string;
  path: string;
}

/**
 * Get the destination path for a skill based on scope.
 * @param config - Skill configuration
 * @param scope - Installation scope (local or global)
 * @returns The destination path for the skill
 */
function getSkillDestinationPath(
  config: SkillConfig,
  scope: SkillScope,
): string | null {
  if (scope === "global") {
    const home = homedir();
    if (!home) {
      return null;
    }
    return join(home, ".config", "opencode", "skills", config.name);
  }
  // Local scope: install to .opencode/skills/<skill-name> in current project
  return join(process.cwd(), ".opencode", "skills", config.name);
}

/**
 * Install a single skill to opencode skills directory.
 * The skill is embedded in the binary and extracted at runtime.
 * Errors are non-fatal - logs warning and continues.
 * @param config - Skill configuration
 * @param scope - Installation scope (local or global)
 */
function installSingleSkill(config: SkillConfig, scope: SkillScope): void {
  console.log(`🔧 Installing ${config.displayName} skill...`);

  // Determine destination path based on scope
  const skillDestPath = getSkillDestinationPath(config, scope);
  if (!skillDestPath) {
    console.log(
      "   ⚠️  Could not determine destination path, skipping skill installation",
    );
    return;
  }

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

    const displayPath =
      scope === "global"
        ? `~/.config/opencode/skills/${config.name}/`
        : `.opencode/skills/${config.name}/`;
    console.log(
      `   ✓ Installed skill (${filesWritten} files) to ${displayPath}`,
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
 * @param scope - Installation scope (local or global), defaults to "local"
 */
function installSkills(scope: SkillScope = "local"): void {
  const scopeLabel = scope === "local" ? "locally" : "globally";
  console.log(`📦 Installing skills ${scopeLabel}...`);

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
    installSingleSkill(skill, scope);
  }
}

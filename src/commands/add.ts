import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import ora from "ora";
import prompts from "prompts";
import { getLocalTemplatePath, loadRegistry } from "../utils/config";

const KEBAB_CASE_REGEX: RegExp = /^[a-z0-9-]+$/;

const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
  ".jsonc",
  ".md",
  ".txt",
  ".toml",
  ".yaml",
  ".yml",
]);

async function replaceInAllFiles(dir: string, oldStr: string, newStr: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") {
        continue;
      }
      await replaceInAllFiles(fullPath, oldStr, newStr);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const isEnvFile = entry.name.startsWith(".env");
      if (!(TEXT_EXTENSIONS.has(ext) || isEnvFile)) {
        continue;
      }
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        if (content.includes(oldStr)) {
          await fs.writeFile(fullPath, content.split(oldStr).join(newStr), "utf-8");
        }
      } catch {
        // Skip unreadable files silently
      }
    }
  }
}

async function promptType(input?: string): Promise<string | undefined> {
  if (input) {
    return input;
  }
  const response = await prompts({
    type: "select",
    name: "value",
    message: "Select resource type:",
    choices: [{ title: "app", value: "app" }],
  });
  return response.value as string | undefined;
}

async function promptTemplateName(available: string[], input?: string): Promise<string | undefined> {
  if (input) {
    return input;
  }
  const response = await prompts({
    type: "select",
    name: "value",
    message: "Select a template:",
    choices: available.map((t) => ({ title: t, value: t })),
  });
  return response.value as string | undefined;
}

async function promptTargetName(input?: string): Promise<string | undefined> {
  if (input) {
    return input;
  }
  const response = await prompts({
    type: "text",
    name: "value",
    message: "Enter target name:",
    validate: (v: string) => {
      if (!v.trim()) {
        return "Target name is required";
      }
      if (!KEBAB_CASE_REGEX.test(v)) {
        return "Target name must be kebab-case (a-z, 0-9, -)";
      }
      return true;
    },
  });
  return response.value as string | undefined;
}

async function promptNewPkgName(defaultName: string): Promise<string> {
  const response = await prompts({
    type: "text",
    name: "value",
    message: `Enter import path alias (for imports & tsconfig.json, default: "${defaultName}"):`,
    initial: defaultName,
  });
  return (response.value as string | undefined)?.trim() || defaultName;
}

async function resolveOldPkgName(sourcePath: string | null, templateName: string): Promise<string> {
  if (sourcePath) {
    const templatePkgPath = path.join(sourcePath, "package.json");
    if (await fs.pathExists(templatePkgPath)) {
      const templatePkg = await fs.readJson(templatePkgPath);
      if (templatePkg.name) {
        return templatePkg.name as string;
      }
    }
  }
  return `@repo/${templateName}`;
}

export async function add(inputType?: string, inputTemplateName?: string, inputTargetName?: string): Promise<void> {
  try {
    const registry = await loadRegistry();
    if (!registry) {
      console.error(chalk.red("Could not load registry."));
      return;
    }

    // 1. Resolve Type
    const type = await promptType(inputType);
    if (!type) {
      return;
    }

    if (type !== "app") {
      console.error(chalk.red(`Unknown type: ${type}. Supported types: app`));
      return;
    }

    // 2. Resolve Template Name
    const availableTemplates = Object.keys(registry.apps);
    if (availableTemplates.length === 0) {
      console.error(chalk.red("No templates available in registry."));
      return;
    }
    const templateName = await promptTemplateName(availableTemplates, inputTemplateName);
    if (!templateName) {
      return;
    }

    const templateItem = registry.apps[templateName];
    if (!templateItem) {
      console.error(chalk.red(`Template "${templateName}" not found in registry.`));
      return;
    }

    // 3. Resolve Target Name
    const targetName = await promptTargetName(inputTargetName);
    if (!targetName) {
      console.error(chalk.red("Target name is required."));
      return;
    }

    // 4. Resolve package name for import path replacement
    const sourcePath = getLocalTemplatePath(templateItem.path);
    const oldPkgName = await resolveOldPkgName(sourcePath, templateName);
    const newPkgName = await promptNewPkgName(`@repo/${targetName}`);

    // 5. Copy and update files
    const spinner = ora(`Adding ${type} ${templateName} as ${targetName}...`).start();

    const targetDir = path.resolve(process.cwd(), "apps", targetName);
    if (await fs.pathExists(targetDir)) {
      spinner.fail(`Target directory apps/${targetName} already exists.`);
      return;
    }

    if (sourcePath) {
      await fs.copy(sourcePath, targetDir);
    } else {
      // TODO: Remote download logic (recursive fetch)
      spinner.fail(`Could not find local template path: ${templateItem.path}. Remote download not fully implemented.`);
      return;
    }

    // Replace package name in all text files (package.json, tsconfig.json, *.ts imports, etc.)
    await replaceInAllFiles(targetDir, oldPkgName, newPkgName);

    spinner.succeed(chalk.green(`${type} added successfully to apps/${targetName}!`));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Failed to add resource: ${message}`));
  }
}

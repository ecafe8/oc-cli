import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import ora from "ora";
import prompts from "prompts";
import { getLocalTemplatePath, loadRegistry } from "../utils/config";

const KEBAB_CASE_REGEX: RegExp = /^[a-z0-9-]+$/;

export async function add(inputType?: string, inputTemplateName?: string, inputTargetName?: string) {
  try {
    const registry = await loadRegistry();
    if (!registry) {
      console.error(chalk.red("Could not load registry."));
      return;
    }

    // 1. Resolve Type
    let type = inputType;
    if (!type) {
      const response = await prompts({
        type: "select",
        name: "value",
        message: "Select resource type:",
        choices: [{ title: "app", value: "app" }],
      });
      type = response.value;
    }

    if (!type) {
      return;
    } // User cancelled

    if (type !== "app") {
      console.error(chalk.red(`Unknown type: ${type}. Supported types: app`));
      return;
    }

    // 2. Resolve Template Name
    let templateName = inputTemplateName;
    const availableTemplates = Object.keys(registry.apps);

    if (!templateName) {
      if (availableTemplates.length === 0) {
        console.error(chalk.red("No templates available in registry."));
        return;
      }

      const response = await prompts({
        type: "select",
        name: "value",
        message: "Select a template:",
        choices: availableTemplates.map((t) => ({ title: t, value: t })),
      });
      templateName = response.value;
    }

    if (!templateName) {
      return;
    } // User cancelled

    const templateItem = registry.apps[templateName];
    if (!templateItem) {
      console.error(chalk.red(`Template "${templateName}" not found in registry.`));
      return;
    }

    // 3. Resolve Target Name
    let targetName = inputTargetName;
    if (!targetName) {
      const response = await prompts({
        type: "text",
        name: "value",
        message: "Enter target name:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Target name is required";
          }
          if (!KEBAB_CASE_REGEX.test(input)) {
            return "Target name must be kebab-case (a-z, 0-9, -)";
          }
          return true;
        },
      });
      targetName = response.value;
    }

    if (!targetName) {
      console.error(chalk.red("Target name is required."));
      return;
    }

    const spinner = ora(`Adding ${type} ${templateName} as ${targetName}...`).start();

    const targetDir = path.resolve(process.cwd(), "apps", targetName);
    if (await fs.pathExists(targetDir)) {
      spinner.fail(`Target directory apps/${targetName} already exists.`);
      return;
    }

    const sourcePath = getLocalTemplatePath(templateItem.path);

    if (sourcePath) {
      await fs.copy(sourcePath, targetDir);
    } else {
      // TODO: Remote download logic (recursive fetch)
      spinner.fail(`Could not find local template path: ${templateItem.path}. Remote download not fully implemented.`);
      return;
    }

    // Update package.json name in target
    const pkgPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.name = targetName;
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }

    spinner.succeed(chalk.green(`${type} added successfully to apps/${targetName}!`));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Failed to add resource: ${message}`));
  }
}

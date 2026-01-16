import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import ora from "ora";
import { getLocalTemplatePath, loadRegistry, type RegistryItem } from "../utils/config";

export async function add(type: string, templateName: string, targetName: string) {
  const spinner = ora(`Adding ${type} ${templateName} as ${targetName}...`).start();

  try {
    const registry = await loadRegistry();
    if (!registry) {
      spinner.fail("Could not load registry.");
      return;
    }

    let templateItem: RegistryItem | undefined;
    if (type === "app") {
      templateItem = registry.apps[templateName];
    } else {
      // Future support for other types if any
      spinner.fail(`Unknown type: ${type}. Supported types: app`);
      return;
    }

    if (!templateItem) {
      spinner.fail(`Template ${templateName} not found in registry.`);
      return;
    }

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
  } catch (error: any) {
    spinner.fail("Failed to add resource.");
    console.error(error.message);
  }
}

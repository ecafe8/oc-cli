import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import ora from "ora";
import { getLocalTemplatePath, loadRegistry } from "../utils/config";

export async function sync(type?: string, name?: string) {
  const spinner = ora("Syncing...").start();

  try {
    const registry = await loadRegistry();
    if (!registry) {
      spinner.fail("Could not load registry.");
      return;
    }

    if (!type) {
      // Sync all packages
      const packages = registry.packages;
      for (const [pkgName, pkgItem] of Object.entries(packages)) {
        await syncPackage(pkgItem.path, pkgName);
      }
      spinner.succeed(chalk.green("Synced all packages successfully!"));
      return;
    }

    if (type === "package") {
      if (!name) {
        spinner.fail("Package name is required for 'sync package'.");
        return;
      }
      const pkgItem = registry.packages[name];
      if (!pkgItem) {
        spinner.fail(`Package ${name} not found in registry.`);
        return;
      }
      await syncPackage(pkgItem.path, name);
      spinner.succeed(chalk.green(`Synced package ${name} successfully!`));
      return;
    }

    spinner.info("Usage: oc sync OR oc sync package <name>");
  } catch (error: unknown) {
    spinner.fail("Failed to sync.");
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
}

async function syncPackage(templatePath: string, pkgName: string) {
  const targetDir = path.resolve(process.cwd(), "packages", pkgName);
  const sourcePath = getLocalTemplatePath(templatePath);

  if (sourcePath) {
    // Use copySync or fs.copy to overwrite
    await fs.emptyDir(targetDir); // Clean before sync? Or just overwrite. emptying is safer for sync.
    await fs.copy(sourcePath, targetDir);
  } else {
    // TODO: Remote download
    console.warn(chalk.yellow(`Could not find local template for ${pkgName}. Remote download not implemented.`));
  }
}

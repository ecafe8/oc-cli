import crypto from "node:crypto";
import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import ora from "ora";
import prompts from "prompts";
import { getLocalTemplatePath, loadRegistry, type Registry, skillsDir } from "../utils/config";

type OverwriteStrategy = "ask" | "overwrite-all" | "skip-all" | "abort";

let overwriteStrategy: OverwriteStrategy = "ask";

export async function sync(type?: string, name?: string): Promise<void> {
  const spinner = ora("Syncing...").start();

  try {
    // Reset strategy for each sync operation
    overwriteStrategy = "ask";

    const registry = (await loadRegistry()) as Registry | undefined;
    if (!registry) {
      spinner.fail("Could not load registry.");
      return;
    }

    if (type === "skill") {
      await syncSkills(registry);
      spinner.succeed(chalk.green("Synced skills successfully!"));
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

    if (!type) {
      await syncSkills(registry);
      const packages = registry.packages;
      for (const [pkgName, pkgItem] of Object.entries(packages)) {
        await syncPackage(pkgItem.path, pkgName);
      }
      spinner.succeed(chalk.green("Synced skills, packages and workspace dependencies successfully!"));
      return;
    }

    spinner.info("Usage: oc sync OR oc sync skill OR oc sync package <name>");
  } catch (error: unknown) {
    spinner.fail("Failed to sync.");
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
}

async function syncSkills(registry: Registry): Promise<void> {
  const skills = skillsDir;
  const templatePath = registry.template.path;

  for (const skillDir of skills) {
    const source = getLocalTemplatePath(path.join(templatePath, skillDir));
    const target = path.resolve(process.cwd(), skillDir);

    if (source && (await fs.pathExists(source))) {
      await copyWithConfirmation(source, target, skillDir);
    }
  }
}

async function syncWorkspaceDeps(sourcePath: string): Promise<void> {
  const rootPkgPath = path.resolve(process.cwd(), "package.json");
  const sourcePkgPath = path.resolve(sourcePath, "package.json");

  if (!((await fs.pathExists(sourcePkgPath)) && (await fs.pathExists(rootPkgPath)))) {
    return;
  }

  const [rootPkg, sourcePkg] = await Promise.all([fs.readJson(rootPkgPath), fs.readJson(sourcePkgPath)]);

  rootPkg.dependencies = {
    ...(rootPkg.dependencies ?? {}),
    ...(sourcePkg.dependencies ?? {}),
  };
  rootPkg.devDependencies = {
    ...(rootPkg.devDependencies ?? {}),
    ...(sourcePkg.devDependencies ?? {}),
  };

  await fs.writeJson(rootPkgPath, rootPkg, { spaces: 2 });
}

async function calculateFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

async function areFilesIdentical(sourcePath: string, targetPath: string): Promise<boolean> {
  try {
    const [sourceHash, targetHash] = await Promise.all([calculateFileHash(sourcePath), calculateFileHash(targetPath)]);
    return sourceHash === targetHash;
  } catch {
    return false;
  }
}

async function promptForOverwrite(displayPath: string): Promise<boolean> {
  if (overwriteStrategy === "abort") {
    return false;
  }

  if (overwriteStrategy === "skip-all") {
    console.log(chalk.yellow(`Skipped ${displayPath}`));
    return false;
  }

  if (overwriteStrategy === "overwrite-all") {
    return true;
  }

  const response = await prompts({
    type: "select",
    name: "action",
    message: `File '${displayPath}' already exists.`,
    choices: [
      { title: "Overwrite this file", value: "overwrite" },
      { title: "Skip this file", value: "skip" },
      { title: "Overwrite all remaining files", value: "overwrite-all" },
      { title: "Skip all remaining files", value: "skip-all" },
      { title: "Abort operation", value: "abort" },
    ],
    initial: 1,
  });

  if (!response.action || response.action === "abort") {
    overwriteStrategy = "abort";
    console.log(chalk.red("Operation aborted"));
    return false;
  }

  if (response.action === "skip") {
    console.log(chalk.yellow(`Skipped ${displayPath}`));
    return false;
  }

  if (response.action === "overwrite-all") {
    overwriteStrategy = "overwrite-all";
    return true;
  }

  if (response.action === "skip-all") {
    overwriteStrategy = "skip-all";
    console.log(chalk.yellow(`Skipped ${displayPath}`));
    return false;
  }

  return true;
}

async function copyWithConfirmation(source: string, target: string, displayPath: string): Promise<void> {
  if (overwriteStrategy === "abort") {
    return;
  }

  const stats = await fs.stat(source);

  if (stats.isDirectory()) {
    await fs.ensureDir(target);
    const items = await fs.readdir(source);

    for (const item of items) {
      const srcPath = path.join(source, item);
      const destPath = path.join(target, item);
      const relPath = path.join(displayPath, item);
      await copyWithConfirmation(srcPath, destPath, relPath);
    }
  } else {
    const targetExists = await fs.pathExists(target);

    if (targetExists) {
      // Check if files are identical by comparing hash
      const identical = await areFilesIdentical(source, target);

      if (identical) {
        // Files are identical, skip silently
        return;
      }

      // Files are different, ask user
      const shouldOverwrite = await promptForOverwrite(displayPath);
      if (!shouldOverwrite) {
        return;
      }
    }

    await fs.copy(source, target, { overwrite: true });
  }
}

async function syncPackage(templatePath: string, pkgName: string): Promise<void> {
  const targetDir = path.resolve(process.cwd(), "packages", pkgName);
  const sourcePath = getLocalTemplatePath(templatePath);

  if (sourcePath) {
    await fs.ensureDir(targetDir);
    await copyWithConfirmation(sourcePath, targetDir, `packages/${pkgName}`);
    await syncWorkspaceDeps(sourcePath);
  } else {
    console.warn(chalk.yellow(`Could not find local template for ${pkgName}. Remote download not implemented.`));
  }
}

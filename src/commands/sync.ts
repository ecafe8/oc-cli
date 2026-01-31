import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import ora from "ora";
import prompts from "prompts";
import { getLocalTemplatePath, loadRegistry, type Registry, skillsDir } from "../utils/config";

export async function sync(type?: string, name?: string): Promise<void> {
  const spinner = ora("Syncing...").start();

  try {
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

async function copyWithConfirmation(source: string, target: string, displayPath: string): Promise<void> {
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
      const response = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `File '${displayPath}' already exists. Do you want to overwrite it?`,
        initial: false,
      });

      if (!response.overwrite) {
        console.log(chalk.yellow(`Skipped ${displayPath}`));
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

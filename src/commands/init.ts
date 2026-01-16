import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import ora, { type Ora } from "ora";
import prompts from "prompts";
import { getLocalTemplatePath, loadRegistry, type Registry } from "../utils/config";

export async function init(projectName?: string) {
  const finalProjectName = await getProjectName(projectName);
  if (!finalProjectName) {
    return;
  }

  const spinner = ora(`Initializing project ${finalProjectName}...`).start();

  try {
    const targetDir = path.resolve(process.cwd(), finalProjectName);
    const isReady = await initializeProjectDir(targetDir, finalProjectName, spinner);
    if (!isReady) {
      return;
    }

    const registry = await loadRegistry();
    if (!registry) {
      spinner.fail("Could not load registry.");
      return;
    }

    await copyBaseTemplates(targetDir, registry, spinner);
    await copyPackages(targetDir, registry, spinner);

    const appsDir = path.join(targetDir, "apps");
    await fs.ensureDir(appsDir);

    spinner.succeed(chalk.green(`Project ${finalProjectName} initialized successfully!`));

    await promptAndInitializeApp(appsDir, registry);

    console.log(chalk.blue(`\ncd ${finalProjectName}\nbun install\n`));
  } catch (error: unknown) {
    spinner.fail("Failed to initialize project.");
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
}

async function getProjectName(projectName?: string): Promise<string | undefined> {
  if (projectName) {
    return projectName;
  }

  const response = await prompts({
    type: "text",
    name: "projectName",
    message: "Enter the project name:",
    validate: (value) => (value.length > 0 ? true : "Project name is required"),
  });
  return response.projectName;
}

async function initializeProjectDir(targetDir: string, projectName: string, spinner: Ora): Promise<boolean> {
  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      spinner.fail(`Directory ${projectName} already exists and is not empty.`);
      return false;
    }
  } else {
    await fs.ensureDir(targetDir);
  }
  return true;
}

async function copyBaseTemplates(targetDir: string, registry: Registry, spinner: Ora) {
  const { files: templateFiles, path: templatePath } = registry.template;

  for (const file of templateFiles) {
    const sourcePath = getLocalTemplatePath(path.join(templatePath, file));
    if (sourcePath) {
      await fs.copy(sourcePath, path.join(targetDir, file));
    } else {
      spinner.warn(`Could not find local template file: ${file}, skipping remote download for now.`);
    }
  }
}

async function copyPackages(targetDir: string, registry: Registry, spinner: Ora) {
  const packagesDir = path.join(targetDir, "packages");
  await fs.ensureDir(packagesDir);

  for (const [pkgName, pkgItem] of Object.entries(registry.packages)) {
    const sourcePath = getLocalTemplatePath(pkgItem.path);
    if (sourcePath) {
      await fs.copy(sourcePath, path.join(packagesDir, pkgName));
    } else {
      spinner.warn(`Could not find local package: ${pkgName}, skipping.`);
    }
  }
}

async function promptAndInitializeApp(appsDir: string, registry: Registry) {
  const response = await prompts({
    type: "confirm",
    name: "initApp",
    message: "Would you like to initialize an app?",
    initial: true,
  });

  if (!response.initApp) {
    return;
  }

  const appInfo = await prompts({
    type: "text",
    name: "appName",
    message: "Enter the application name:",
    initial: "web",
  });

  if (appInfo.appName) {
    await createApp(appsDir, appInfo.appName, registry);
  }
}

async function createApp(appsDir: string, appName: string, registry: Registry) {
  const appSpinner = ora(`Initializing app ${appName}...`).start();
  const webTemplate = registry.apps["web-template"];

  if (!webTemplate) {
    appSpinner.fail("web-template not found in registry.");
    return;
  }

  const appTargetDir = path.join(appsDir, appName);
  const sourcePath = getLocalTemplatePath(webTemplate.path);

  if (sourcePath) {
    await fs.copy(sourcePath, appTargetDir);

    // Update package.json name
    const pkgPath = path.join(appTargetDir, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.name = appName;
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }
    appSpinner.succeed(chalk.green(`App ${appName} initialized successfully!`));
  } else {
    appSpinner.fail("Could not find web-template source path.");
  }
}

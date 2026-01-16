import chalk from "chalk";
import path from "path";
import fs from "fs-extra";
import ora from "ora";
import prompts from "prompts";
import { loadRegistry, getLocalTemplatePath, config } from "../utils/config";

export async function init(projectName?: string) {
  let finalProjectName = projectName;

  if (!finalProjectName) {
    const response = await prompts({
      type: "text",
      name: "projectName",
      message: "Enter the project name:",
      validate: (value) => (value.length > 0 ? true : "Project name is required"),
    });
    finalProjectName = response.projectName;
  }

  if (!finalProjectName) {
    // User cancelled or provided empty string (though validate should prevent empty)
    return;
  }

  const spinner = ora(`Initializing project ${finalProjectName}...`).start();

  try {
    const targetDir = path.resolve(process.cwd(), finalProjectName);

    if (await fs.pathExists(targetDir)) {
      const files = await fs.readdir(targetDir);
      if (files.length > 0) {
        spinner.fail(`Directory ${finalProjectName} already exists and is not empty.`);
        return;
      }
    } else {
      await fs.ensureDir(targetDir);
    }

    const registry = await loadRegistry();
    if (!registry) {
      spinner.fail("Could not load registry.");
      return;
    }

    const templateFiles = registry.template.files;
    const templatePath = registry.template.path;

    for (const file of templateFiles) {
      const sourcePath = getLocalTemplatePath(path.join(templatePath, file));
      if (sourcePath) {
        await fs.copy(sourcePath, path.join(targetDir, file));
      } else {
        spinner.warn(`Could not find local template file: ${file}, skipping remote download for now.`);
      }
    }

    // Sync all packages
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

    // Create empty apps directory
    const appsDir = path.join(targetDir, "apps");
    await fs.ensureDir(appsDir);

    spinner.succeed(chalk.green(`Project ${finalProjectName} initialized successfully!`));

    // Ask if user wants to initialize an app
    const response = await prompts({
      type: "confirm",
      name: "initApp",
      message: "Would you like to initialize an app?",
      initial: true,
    });

    if (response.initApp) {
      const appInfo = await prompts({
        type: "text",
        name: "appName",
        message: "Enter the application name:",
        initial: "web",
      });

      if (appInfo.appName) {
        const appSpinner = ora(`Initializing app ${appInfo.appName}...`).start();
        const webTemplate = registry.apps["web-template"];

        if (webTemplate) {
          const appTargetDir = path.join(appsDir, appInfo.appName);
          const sourcePath = getLocalTemplatePath(webTemplate.path);

          if (sourcePath) {
            await fs.copy(sourcePath, appTargetDir);

            // Update package.json name
            const pkgPath = path.join(appTargetDir, "package.json");
            if (await fs.pathExists(pkgPath)) {
              const pkg = await fs.readJson(pkgPath);
              pkg.name = appInfo.appName;
              await fs.writeJson(pkgPath, pkg, { spaces: 2 });
            }
            appSpinner.succeed(chalk.green(`App ${appInfo.appName} initialized successfully!`));
          } else {
            appSpinner.fail(`Could not find web-template source path.`);
          }
        } else {
          appSpinner.fail(`web-template not found in registry.`);
        }
      }
    }

    console.log(chalk.blue(`\ncd ${finalProjectName}\nbun install\n`));
  } catch (error: any) {
    spinner.fail("Failed to initialize project.");
    console.error(error.message);
  }
}

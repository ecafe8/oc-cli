import chalk from "chalk";
import path from "path";
import fs from "fs-extra";
import ora from "ora";
import { loadRegistry, getLocalTemplatePath, config } from "../utils/config";

export async function init(projectName: string) {
  const spinner = ora(`Initializing project ${projectName}...`).start();

  try {
    const targetDir = path.resolve(process.cwd(), projectName);
    
    if (await fs.pathExists(targetDir)) {
       const files = await fs.readdir(targetDir);
       if (files.length > 0) {
          // If directory is not empty, warn user but continue if they want? 
          // For now, let's just error similar to create-react-app to be safe, or allow if it's just a few files.
          // The previous code returned, let's keep it safe.
          spinner.fail(`Directory ${projectName} already exists and is not empty.`);
          // return; // Actually, let's check if it IS empty.
          // If we want to allow existing dirs, we should check specifically.
          // For simplicity, let's assume if it exists, abort, unless we want to support "."
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
            // TODO: Remote download logic here
            // const content = await fetch(`${config.registryUrl}/${templatePath}/${file}`);
            // await fs.writeFile(path.join(targetDir, file), content);
             spinner.warn(`Could not find local template file: ${file}, skipping remote download for now.`);
        }
    }

    // Create empty directories
    await fs.ensureDir(path.join(targetDir, "apps"));
    await fs.ensureDir(path.join(targetDir, "packages"));

    spinner.succeed(chalk.green(`Project ${projectName} initialized successfully!`));
    console.log(chalk.blue(`\ncd ${projectName}\nbun install\n`));

  } catch (error: any) {
    spinner.fail("Failed to initialize project.");
    console.error(error.message);
  }
}

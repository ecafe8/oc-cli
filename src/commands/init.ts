import chalk from "chalk";
import path from "path";
import fs from "fs-extra";
import ora from "ora";

export async function init(projectName: string) {
  const spinner = ora(`Initializing project ${projectName}...`).start();

  try {
    const targetDir = path.resolve(process.cwd(), projectName);
    
    if (await fs.pathExists(targetDir)) {
      spinner.fail(`Directory ${projectName} already exists.`);
      return;
    }

    // TODO: Implement copying from template root structure
    // const templateDir = path.resolve(__dirname, '../../template');
    // await fs.copy(templateDir, targetDir);

    spinner.succeed(chalk.green(`Project ${projectName} initialized successfully!`));
    console.log(chalk.blue(`\ncd ${projectName}\nbun install\n`));

  } catch (error) {
    spinner.fail("Failed to initialize project.");
    console.error(error);
  }
}

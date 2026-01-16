import chalk from "chalk";
import ora from "ora";

export async function add(type: string, templateName: string, targetName: string) {
    const spinner = ora(`Adding ${type} ${templateName} as ${targetName}...`).start();
    
    try {
        // TODO: Implement logic to copy specific template from template/apps or similar
        
        spinner.succeed(chalk.green(`${type} added successfully!`));
    } catch (error) {
        spinner.fail("Failed to add resource.");
        console.error(error);
    }
}

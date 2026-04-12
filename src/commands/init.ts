import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import ora, { type Ora } from "ora";
import prompts from "prompts";
import { getLocalTemplatePath, loadRegistry, type Registry } from "../utils/config";

const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
  ".jsonc",
  ".md",
  ".txt",
  ".toml",
  ".yaml",
  ".yml",
]);

interface AppInitConfig {
  targetName: string;
  templateName: string;
  replacements?: [string, string][];
}

const DEFAULT_APPS: AppInitConfig[] = [
  {
    targetName: "server-auth",
    templateName: "server-auth",
  },
  {
    targetName: "server-api",
    templateName: "server-template",
    replacements: [
      ["@repo/server-template", "@repo/server-api"],
      ["server-template", "server-api"],
    ],
  },
  {
    targetName: "web-app",
    templateName: "web-template",
    replacements: [
      ["@repo/server-template", "@repo/server-api"],
      ["@repo/web-template", "@repo/web-app"],
      ["server-template", "server-api"],
      ["web-template", "web-app"],
    ],
  },
];

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
    await initializeDefaultApps(targetDir, registry, spinner);

    spinner.succeed(chalk.green(`Project ${finalProjectName} initialized successfully!`));

    console.log(
      chalk.blue(`\nCreated apps:\n- server-auth\n- server-api\n- web-app\n\ncd ${finalProjectName}\nbun install\n`)
    );
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

async function initializeDefaultApps(targetDir: string, registry: Registry, spinner: Ora) {
  const appsDir = path.join(targetDir, "apps");
  await fs.ensureDir(appsDir);

  for (const appConfig of DEFAULT_APPS) {
    await createAppFromTemplate(appsDir, appConfig, registry, spinner);
  }
}

async function createAppFromTemplate(appsDir: string, appConfig: AppInitConfig, registry: Registry, spinner: Ora) {
  const appTemplate = registry.apps[appConfig.templateName];
  if (!appTemplate) {
    throw new Error(`Template "${appConfig.templateName}" not found in registry.`);
  }

  const sourcePath = getLocalTemplatePath(appTemplate.path);
  if (!sourcePath) {
    throw new Error(`Could not find local template path: ${appTemplate.path}.`);
  }

  const appTargetDir = path.join(appsDir, appConfig.targetName);
  await fs.copy(sourcePath, appTargetDir);

  for (const [oldValue, newValue] of appConfig.replacements ?? []) {
    await replaceInAllFiles(appTargetDir, oldValue, newValue);
  }

  spinner.text = `Initialized ${appConfig.targetName} from ${appConfig.templateName}`;
}

async function replaceInAllFiles(dir: string, oldValue: string, newValue: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") {
        continue;
      }
      await replaceInAllFiles(fullPath, oldValue, newValue);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    const isEnvFile = entry.name.startsWith(".env");
    if (!(TEXT_EXTENSIONS.has(ext) || isEnvFile)) {
      continue;
    }

    const content = await fs.readFile(fullPath, "utf-8");
    if (!content.includes(oldValue)) {
      continue;
    }

    await fs.writeFile(fullPath, content.split(oldValue).join(newValue), "utf-8");
  }
}

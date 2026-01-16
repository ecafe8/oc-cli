import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";

const TEMPLATE_DIR = path.resolve(process.cwd(), "template");
const REGISTRY_PATH = path.resolve(process.cwd(), "registry.json");

interface RegistryItem {
  name: string;
  path: string;
  description: string;
  type: "app" | "package";
  dependencies?: string[];
  devDependencies?: string[];
}

interface TemplateRoot {
  path: string;
  files: string[];
}

interface Registry {
  template: TemplateRoot;
  apps: Record<string, RegistryItem>;
  packages: Record<string, RegistryItem>;
}

async function getPackageInfo(dirPath: string) {
  try {
    const pkgPath = path.join(dirPath, "package.json");
    if (await fs.pathExists(pkgPath)) {
      return await fs.readJson(pkgPath);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(chalk.yellow(`Warning: Could not read package.json in ${dirPath}: ${message}`));
  }
  return {};
}

async function scanDirectory(baseDir: string, type: "app" | "package"): Promise<Record<string, RegistryItem>> {
  const items: Record<string, RegistryItem> = {};

  if (!(await fs.pathExists(baseDir))) {
    return items;
  }

  const entries = await fs.readdir(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(baseDir, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath); // Use path relative to root
    const pkgInfo = await getPackageInfo(fullPath);

    items[entry.name] = {
      name: entry.name,
      path: relativePath,
      description: pkgInfo.description || "",
      type,
      dependencies: pkgInfo.dependencies ? Object.keys(pkgInfo.dependencies) : [],
      devDependencies: pkgInfo.devDependencies ? Object.keys(pkgInfo.devDependencies) : [],
    };
  }

  return items;
}

// Scan root template files (excluding apps and packages directories)
async function scanTemplateRoot(baseDir: string): Promise<TemplateRoot> {
  const files: string[] = [];
  if (!(await fs.pathExists(baseDir))) {
    return { path: "template", files: [] };
  }

  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    // Ignore apps and packages directories calling them recursively not needed for root template
    if (entry.isDirectory() && (entry.name === "apps" || entry.name === "packages")) {
      continue;
    }

    // We only want files or other config directories in root
    files.push(entry.name);
  }

  return {
    path: "template",
    files: files.sort(),
  };
}

async function main() {
  console.log(chalk.blue("Building registry.json..."));

  // 1. Scan Template Root
  const templateRoot = await scanTemplateRoot(TEMPLATE_DIR);
  console.log(`Found ${templateRoot.files.length} root template files.`);

  // 2. Scan Apps (formerly templates in registry)
  const apps = await scanDirectory(path.join(TEMPLATE_DIR, "apps"), "app");
  console.log(`Found ${Object.keys(apps).length} apps.`);

  // 3. Scan Packages (Shared libs)
  const packages = await scanDirectory(path.join(TEMPLATE_DIR, "packages"), "package");
  console.log(`Found ${Object.keys(packages).length} packages.`);

  const registry: Registry = {
    template: templateRoot,
    apps,
    packages,
  };

  await fs.writeJson(REGISTRY_PATH, registry, { spaces: 2 });
  console.log(chalk.green(`\nRegistry generated successfully at ${REGISTRY_PATH}`));
}

main().catch((err) => {
  console.error(chalk.red("Error building registry:"), err);
  process.exit(1);
});

import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";

export const config = {
  registryUrl: "https://raw.githubusercontent.com/ecafe8/oc-cli/main",
  localTemplatePath: path.resolve(__dirname, "../../template"),
  localRegistryPath: path.resolve(__dirname, "../../registry.json"),
};

export const skillsDir = [".claude", ".opencode", ".github"];

export interface RegistryItem {
  id: string; // Add id to interface although registry.json uses key as id mostly
  name: string;
  path: string;
  description: string;
  type: "app" | "package";
  dependencies?: string[];
  devDependencies?: string[];
}

export interface TemplateRoot {
  path: string;
  files: string[];
}

export interface Registry {
  template: TemplateRoot;
  apps: Record<string, RegistryItem>;
  packages: Record<string, RegistryItem>;
}

export async function loadRegistry(): Promise<Registry | null> {
  // 1. Try local registry first (for development or if bundled)
  if (await fs.pathExists(config.localRegistryPath)) {
    try {
      return await fs.readJson(config.localRegistryPath);
    } catch (_e) {
      console.warn(chalk.yellow("Found local registry.json but failed to parse it."));
    }
  }

  // 2. Fallback to remote registry
  try {
    const res = await fetch(`${config.registryUrl}/registry.json`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as Registry;
  } catch (_error) {
    console.warn(chalk.yellow("Failed to load registry from remote."));
    return null;
  }
}

/**
 * Helper to get the absolute path of a resource if it exists locally.
 * Returns null if not found locally.
 */
export function getLocalTemplatePath(relativePath: string): string | null {
  const localPath = path.join(path.dirname(config.localRegistryPath), relativePath);
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  return null;
}

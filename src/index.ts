import { program } from "commander";
import { init } from "./commands/init";
import { add } from "./commands/add";
import { sync } from "./commands/sync";
import { version } from "../package.json";

program
  .name("oc")
  .description("OC CLI - A scaffold and resource management tool")
  .version(version);

program
  .command("init")
  .description("Initialize a new monorepo project")
  .argument("<project-name>", "Name of the project")
  .action(init);

program
  .command("add")
  .description("Add a resource/app to the project")
  .argument("<type>", "Type of resource (e.g., app)")
  .argument("<template-name>", "Name of the template (e.g., web-template)")
  .argument("<target-name>", "Name of the target folder")
  .action(add);

program
  .command("sync")
  .description("Sync shared packages or resources")
  .argument("[type]", "Type to sync (e.g., package, packages)")
  .argument("[name]", "Name of the package (optional)")
  .action(sync);

program.parse();

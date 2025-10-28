import { createProject } from "@cli/services/project.service.js";
import { Command } from "commander";

export const createProjectCommand = new Command("create")
  .description("Create a new project")
  .argument("<name>", "Project name")
  .action(async (name) => {
    await createProject(name);
  });

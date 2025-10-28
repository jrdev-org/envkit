import { Command } from "commander";
import { createProjectCommand } from "./create.js";
import { listProjectCommand } from "./list.js";
import { deleteProjectCommand } from "./remove.js";
import { renameProjectCommand } from "./rename.js";

export const projectCommand = new Command("project")
	.description("Manage projects")
	.addHelpText("after", "\nExamples:\n  envkit project create\n")
	.addCommand(createProjectCommand)
	.addCommand(deleteProjectCommand)
	.addCommand(listProjectCommand)
	.addCommand(renameProjectCommand);

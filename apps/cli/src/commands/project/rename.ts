import { renameProject } from "@cli/services/project.service.js";
import { Command } from "commander";

export const renameProjectCommand = new Command("rename")
	.description("Rename a project")
	.action(async (oldName: string, newName: string) => {
		await renameProject(oldName, newName);
	});

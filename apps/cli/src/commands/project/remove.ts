import { deleteProject } from "@cli/services/project.service.js";
import { Command } from "commander";

export const deleteProjectCommand = new Command("delete")
	.description("Delete a project")
	.action(async (name: string) => {
		await deleteProject(name);
	});

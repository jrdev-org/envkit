import { listProjects } from "@cli/services/project.service.js";
import { Command } from "commander";

export const listProjectCommand = new Command("list")
	.description("List all projects")
	.action(async () => {
		await listProjects();
	});

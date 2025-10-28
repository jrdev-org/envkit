import { runStatus } from "@cli/services/core.service.js";
import { Command } from "commander";

export const statusCommand = new Command("status")
	.description("Display the status of the current project")
	.action(async () => {
		await runStatus();
	});

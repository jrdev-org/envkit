import { runPull } from "@cli/services/core.service.js";
import { Command } from "commander";

export const pullCommand = new Command("pull")
	.description("Pull variables from the specified stage")
	.argument("[stage]", "The stage to pull from e.g 'development'| 'production'")
	.action(async () => {
		await runPull();
	});

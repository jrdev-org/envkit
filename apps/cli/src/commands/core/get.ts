import { runGet } from "@cli/services/core.service.js";
import { Command } from "commander";

export const getCommand = new Command("get")
	.description("Get a variable from the specified stage")
	.argument("<key>", "The key of the variable to get")
	.argument(
		"[stage]",
		"The stage to get the variable from e.g 'development'| 'production'",
	)
	.action(async () => {
		await runGet();
	});

import { runSet } from "@cli/services/core.service.js";
import { Command } from "commander";

export const setCommand = new Command("set")
	.description("Set a variable in the specified stage")
	.argument("<key>", "The key of the variable to set")
	.argument("<value>", "The value of the variable to set")
	.argument(
		"[stage]",
		"The stage to set the variable in e.g 'development'| 'production'",
	)
	.action(async () => {
		await runSet();
	});

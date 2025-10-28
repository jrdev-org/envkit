import { runPush } from "@cli/services/core.service.js";
import { Command } from "commander";

export const pushCommand = new Command("push")
	.description("Push variables to the specified stage")
	.argument("[stage]", "The stage to push to e.g 'development'| 'production'")
	.action(async () => {
		await runPush();
	});

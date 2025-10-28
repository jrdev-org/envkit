import { runDiff } from "@cli/services/core.service.js";
import { Command } from "commander";

export const diffCommand = new Command("diff")
	.description("Display the differences between the local and remote states")
	.action(async () => {
		await runDiff();
	});

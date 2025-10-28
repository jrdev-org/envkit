import { runSync } from "@cli/services/core.service.js";
import { Command } from "commander";

export const syncCommand = new Command("sync")
	.description("Sync variables from the specified stage")
	.action(async () => {
		await runSync();
	});

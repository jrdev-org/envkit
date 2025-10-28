import { runLink } from "@cli/services/core.service.js";
import { Command } from "commander";

export const linkCommand = new Command("link")
	.description("Consume a share token")
	.argument("<token>", "The share token to consume")
	.action(async () => {
		await runLink();
	});

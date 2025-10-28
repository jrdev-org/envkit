import { whoami } from "@cli/services/auth.service.js";
import { Command } from "commander";

export const whoamiCommand = new Command("whoami")
	.description("Get information about the current user")
	.action(async () => {
		await whoami();
	});

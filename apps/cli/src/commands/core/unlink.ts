import { runUnlink } from "@cli/services/core.service.js";
import { Command } from "commander";

export const unlinkCommand = new Command("unlink")
	.description("Unlink your local device from the cloud!")
	.action(async () => {
		await runUnlink();
	});

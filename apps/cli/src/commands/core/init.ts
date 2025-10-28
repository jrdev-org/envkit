import { runInit } from "@cli/services/core.service.js";
import { Command } from "commander";

export const initCommand = new Command("init")
	.description("Initialize envkit in the current directory")
	.action(async () => {
		await runInit();
	});

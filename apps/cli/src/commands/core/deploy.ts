import { runDeploy } from "@cli/services/core.service.js";
import { Command } from "commander";

export const deployCommand = new Command("deploy")
	.description("Deploy the current project")
	.action(async () => {
		await runDeploy();
	});

import { runShare } from "@cli/services/core.service.js";
import { Command } from "commander";

export const shareCommand = new Command("share")
	.description("Share the current project")
	.option(
		"-e, --email <email>",
		"Email of the user to share with, we will invite them if they don't exist and send the token via email",
	)
	.option("-s, --single-use", "Token expires after use (recommened)", false)
	.option(
		"-a, --allow-linking",
		"Allow the user to stay subscribed and see changes to the project",
		false,
	)
	.option(
		"-t, --time <time>",
		"Time to live for the token, defaults to 1 hour",
		"1h",
	)
	.action(
		async (opts: {
			email?: string;
			singleUse: boolean;
			allowLinking: boolean;
			time: string;
		}) => {
			console.log(opts);
			await runShare();
		},
	);

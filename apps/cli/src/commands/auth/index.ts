import { Command } from "commander";
import { loginCommand } from "./login.js";
import { logoutCommand } from "./logout.js";
import { whoamiCommand } from "./whoami.js";

export const authCommand = new Command("auth")
	.description("Authenticate with envkit")
	.addHelpText(
		"after",
		`\nExamples:\n  envkit auth login\n  envkit auth logout\n`,
	)
	.addCommand(loginCommand)
	.addCommand(logoutCommand)
	.addCommand(whoamiCommand);

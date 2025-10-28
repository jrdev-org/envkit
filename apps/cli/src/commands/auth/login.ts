import { signIn } from "@cli/services/auth.service.js";
import { Command } from "commander";

export const loginCommand = new Command("login")
	.description("Authenticate with envkit")
	.action(async () => {
		await signIn();
	});

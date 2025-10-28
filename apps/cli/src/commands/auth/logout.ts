import { signOut } from "@cli/services/auth.service.js";
import { Command } from "commander";

export const logoutCommand = new Command("logout")
	.description("Log out of the current session")
	.action(async () => {
		await signOut();
	});

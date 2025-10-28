import { log } from "@cli/core/logger.js";
import { runInvite } from "@cli/services/core.service.js";
import { Command } from "commander";

export const inviteCommand = new Command("invite")
	.description("Invite a user to a team!")
	.option("-t, --team [team]", "Team you want user to join")
	.option("-e, --email <email>", "User's email to be invited")
	.option(
		"-r, role <role>",
		"User's role in the team 'admin'| 'member'",
		"member",
	)
	.action(async (opts: { email: string; team?: string; role?: string }) => {
		log.debug(`${opts.email}, ${opts.team}, ${opts.role}`);
		await runInvite();
	});

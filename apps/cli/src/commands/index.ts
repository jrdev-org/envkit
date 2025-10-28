import type { Command } from "commander";
import { authCommand } from "./auth/index.js";
import { deployCommand } from "./core/deploy.js";
import { diffCommand } from "./core/diff.js";
import { getCommand } from "./core/get.js";
import { initCommand } from "./core/init.js";
import { inviteCommand } from "./core/invite.js";
import { linkCommand } from "./core/link.js";
import { pullCommand } from "./core/pull.js";
import { pushCommand } from "./core/push.js";
import { deleteCommand } from "./core/remove.js";
import { setCommand } from "./core/set.js";
import { shareCommand } from "./core/share.js";
import { statusCommand } from "./core/status.js";
import { syncCommand } from "./core/sync.js";
import { unlinkCommand } from "./core/unlink.js";
import { projectCommand } from "./project/index.js";

export function registerCommands(program: Command) {
	program
		.description(
			"Envkit CLI!\nThe easiest way to manage your environment variables, or so I hope!",
		)
		.addCommand(projectCommand)
		.addCommand(authCommand)
		.addCommand(deployCommand)
		.addCommand(diffCommand)
		.addCommand(getCommand)
		.addCommand(initCommand)
		.addCommand(inviteCommand)
		.addCommand(linkCommand)
		.addCommand(pullCommand)
		.addCommand(pushCommand)
		.addCommand(deleteCommand)
		.addCommand(setCommand)
		.addCommand(shareCommand)
		.addCommand(statusCommand)
		.addCommand(syncCommand)
		.addCommand(unlinkCommand);
}

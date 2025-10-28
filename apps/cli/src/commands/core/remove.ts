import { runDelete } from "@cli/services/core.service.js";
import { Command } from "commander";

export const deleteCommand = new Command("delete")
	.description("Delete a variable from the specified stage")
	.argument("<key>", "The key of the variable to delete")
	.argument(
		"[stage]",
		"The stage to delete the variable from e.g 'development'| 'production'",
	)
	.action(async () => {
		await runDelete();
	});

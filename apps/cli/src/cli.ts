import { Command } from "commander";
import { registerCommands } from "./commands/index.js";
import { CONFIG } from "./constants/config.js";

export function run() {
	const program = new Command();
	program.name(CONFIG.APP_NAME).version(CONFIG.VERSION);
	registerCommands(program);
	program.parse(process.argv);
}

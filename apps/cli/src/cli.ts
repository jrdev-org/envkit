#!/usr/bin/env node
import { Command } from "commander";
import { authCmd, logoutCmd, whoamiCmd } from "./commads/auth.js";
import { initCmd } from "./commads/init.js";
import {
  deleteAllCmd,
  deleteCmd,
  getCmd,
  pullCmd,
  pushCmd,
  setCmd,
  syncCmd,
} from "./commads/actions.js";
import { log } from "./lib/logger.js";
import chalk from "chalk";

// SIGINT handler
process.on("SIGINT", () => {
  console.log("SIGINT received, exiting...");
  process.exit(0);
});

// SIGTERM handler
process.on("SIGTERM", () => {
  console.log("SIGTERM received, exiting...");
  process.exit(0);
});

const program = new Command("envkit")
  .description("Envkit CLI")
  .version("0.0.1")
  .action(async () => {
    // TODO: Display the version and help message
    log.info("Welcome to the Envkit CLI!");
    log.info(`Run ${chalk.bold("envkit --help")} to see available commands.`);
    process.exit(0);
  });

program.addCommand(authCmd);
program.addCommand(logoutCmd);
program.addCommand(whoamiCmd);
program.addCommand(initCmd);
program.addCommand(pushCmd);
program.addCommand(pullCmd);
program.addCommand(syncCmd);
program.addCommand(getCmd);
program.addCommand(setCmd);
program.addCommand(deleteCmd);
program.addCommand(deleteAllCmd);
program.parse(process.argv);

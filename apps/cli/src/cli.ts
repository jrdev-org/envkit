#!/usr/bin/env node
import {
  deleteCmd,
  getCmd,
  pullCmd,
  pushCmd,
  setCmd,
  syncCmd,
} from "@cli/commands/actions.js";
import chalk from "chalk";
import { Command } from "commander";
import { authCmd, logoutCmd, whoamiCmd } from "./commands/auth.js";
import { initCmd } from "./commands/init.js";
import { linkCmd, shareCmd, unlinkCmd } from "./commands/projects.js";
import { log } from "./lib/logger.js";

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

import { CLI_VERSION } from "./constants.js";

const program = new Command("envkit")
  .description("Envkit CLI")
  .version(CLI_VERSION)
  .action(() => {
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
program.addCommand(unlinkCmd);
program.addCommand(shareCmd);
program.addCommand(linkCmd);
program.parse(process.argv);

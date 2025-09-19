#!/usr/bin/env node
import { Command } from "commander";
import authCmd from "./commads/auth.js";

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
  .action(() => {
    console.log("Hello World");
    process.exit(0);
  });

program.addCommand(authCmd);
program.parse(process.argv);

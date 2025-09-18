#!/usr/bin/env node
import { dbApi } from "@envkit/db";
import { Command } from "commander";

const program = new Command("envkit")
  .description("Envkit CLI")
  .version("0.0.1")
  .action(() => {
    console.log("Hello World");
    process.exit(0);
  });

program.parse(process.argv);

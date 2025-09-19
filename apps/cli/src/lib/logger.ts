import chalk from "chalk";
import ora from "ora";

export const log = {
  info: (message: string) => console.log(chalk.blue(message)),
  warn: (message: string) => console.log(chalk.yellow(message)),
  error: (message: string) => console.log(chalk.red(message)),
  success: (message: string) => console.log(chalk.green(message)),
  debug: (message: string) => console.log(chalk.magenta(message)),
  trace: (message: string) => console.log(chalk.cyan(message)),
  fatal: (message: string) => console.log(chalk.bgRed(message)),
  bold: (message: string) => console.log(chalk.bold(message)),
  throw: (message: string) => {
    throw new Error(chalk.red(message));
  },
  task: (msg: string) => {
    return ora({
      text: msg,
      spinner: "aesthetic",
      color: "yellow",
    });
  },
};

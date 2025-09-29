import { Command } from "commander";
import { log } from "@/lib/logger.js";
import { confirm, select } from "@inquirer/prompts";
import { getLinkedProject } from "./actions.js";
import { dbApi, safeCall } from "@envkit/db";
import { requireAuthToken } from "@/lib/auth.js";
import fs from "fs/promises";
import path from "path";
import { PROJECTS_DIR } from "@/constants.js";
import { Id } from "@envkit/db/env";

async function runUnlink(force?: boolean) {
  const token = await requireAuthToken();
  const projectName = process.cwd().split("/").pop();
  if (!projectName) {
    log.warn("Please run this command from the root of your project");
    process.exit(1);
  }

  const linkedProject = await getLinkedProject(projectName);

  const confirmUnlink = await confirm({
    message: `Are you sure you want to unlink the project "${linkedProject.name} ${linkedProject.stage}"?`,
    default: false,
  });

  if (!confirmUnlink) {
    log.info("Unlink cancelled.");
    process.exit(0);
  }
  let confirmDelete = force;

  if (!force) {
    confirmDelete = await confirm({
      message: `Do you want to delete the project and all its variables from the database? This action is irreversible.`,
      default: false,
    });
  }

  if (confirmDelete) {
    const deleteSpinner = log.task("Deleting project from database...").start();
    const res = await safeCall(() =>
      dbApi.projects.remove(
        token.userId as unknown as Id<"users">,
        linkedProject.teamId,
        linkedProject._id,
        confirmDelete
      )
    )();

    if ("error" in res) {
      deleteSpinner.fail("Failed to delete project from database.");
      log.error(res.error);
      process.exit(1);
    }

    deleteSpinner.succeed("Project deleted from database.");

    const projectFilePath = path.join(
      PROJECTS_DIR,
      `${linkedProject.name}-${linkedProject.stage}`
    );
    await fs.unlink(projectFilePath);

    log.success(`Successfully unlinked project "${linkedProject.name}".`);
  } else {
    log.warn(
      `To delete the project later, please do it from the web dashboard. Or re-run this command with the --force flag.`
    );
    process.exit(0);
  }
}

export const unlinkCmd = new Command("unlink")
  .description("Unlink the current project")
  .option("-f, --force", "Force delete project variables")
  .action(async (options) => {
    await runUnlink(options.force);
  });

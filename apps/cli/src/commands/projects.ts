import { Command } from "commander";
import { log } from "@/lib/logger.js";
import { confirm } from "@inquirer/prompts";
import { ensureEnvLocal, getLinkedProject } from "./actions.js";
import { dbApi, safeCall } from "@envkit/db";
import { requireAuthToken } from "@/lib/auth.js";
import fs from "fs/promises";
import path from "path";
import { PROJECTS_DIR } from "@/constants.js";
import { getDeviceInfo, getOrCreateDeviceId } from "@/lib/device.js";
import chalk from "chalk";
import { getEnvFileHash, writeProjectsDir } from "./init.js";
import { TeamService } from "@envkit/db/encryption";
import clipboard from "clipboardy";
import { getProjectName } from "@/lib/project.js";

async function runUnlink(force?: boolean) {
  const token = await requireAuthToken();
  const projectName = await getProjectName();
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
        token.userId,
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
    await fs.unlink(projectFilePath).catch(() => {});

    log.success(`Successfully unlinked project "${linkedProject.name}".`);
  } else {
    // User confirmed unlink but not delete - remove local file only
    const projectFilePath = path.join(
      PROJECTS_DIR,
      `${linkedProject.name}-${linkedProject.stage}`
    );
    try {
      await fs.unlink(projectFilePath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        log.warn(`Failed to remove local project file: ${err.message}`);
      }
    }
    log.success(
      `Successfully unlinked project "${linkedProject.name}" locally.`
    );
    log.warn(
      `Project data remains in the database. To delete it, use the web dashboard or re-run with --force.`
    );
    process.exit(0);
  }
}

export const unlinkCmd = new Command("unlink")
  .alias("delete-all")
  .description("Unlink the current project")
  .option("-f, --force", "Force delete project variables")
  .action(async (options) => {
    await runUnlink(options.force);
  });

/**
 * Parse a TTL string (e.g. "1h", "15m", "200s", "2d") into milliseconds.
 * Defaults to seconds if no unit is specified.
 */
export function formatTTL(ttl: string): number {
  const match = /^(\d+)([smhd]?)$/i.exec(ttl.trim());
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "":
      return value * 1000; // default to seconds
    default:
      throw new Error(`Unsupported TTL unit: ${unit}`);
  }
}

export const shareCmd = new Command("share")
  .description("Generate a share link token for this project")
  .option("-s, --single-use", "Share token is single-use")
  .option("-a, --allow-link", "Allow persistent linking for future pulls/syncs")
  .option("-t, --ttl <string>", "Token time-to-live", "1h")
  .action(
    async (opts: { ttl: string; singleUse: boolean; allowLink: boolean }) => {
      const token = await requireAuthToken();
      const projectName = await getProjectName();
      const linkedProject = await getLinkedProject(projectName);
      const ttlMS = formatTTL(opts.ttl);
      const expiresAt = Date.now() + ttlMS;

      const res = await safeCall(
        async () =>
          await dbApi.projects.createShareToken({
            projectId: linkedProject._id,
            callerId: token.userId,
            allowLink: opts.allowLink,
            expiresAt,
            singleUse: opts.singleUse,
          })
      )();
      if ("error" in res) {
        log.error(res.error);
        process.exit(1);
      }
      await clipboard.write(res.token);
      log.success(`Share token created successfully! Copied to clipboard.`);
      const now = Date.now();
      let expiresDisplay: string;
      const diff = res.expiresAt - now;

      if (diff < 24 * 60 * 60 * 1000) {
        // less than a day
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const parts = [];
        if (hours > 0) {
          parts.push(`${hours}h`);
        }
        if (minutes > 0) {
          parts.push(`${minutes}m`);
        }
        if (seconds > 0) {
          parts.push(`${seconds}s`);
        }
        expiresDisplay = `expires in ${chalk.bold(parts.join(" "))}`;
      } else {
        expiresDisplay = `is valid until ${chalk.bold(
          new Date(res.expiresAt).toLocaleString()
        )}`;
      }
      log.info(`Share token: ${chalk.bold(res.token)}, ${expiresDisplay}`);
      log.warn(
        "Make sure to save this token somewhere safe! It will only be shown once. If you lose it, you will need to generate a new one."
      );
      process.exit(0);
    }
  );

export const linkCmd = new Command("link")
  .description("Link or fetch variables from a shared token")
  .argument("<token>", "Share token")
  .action(async (token: string) => {
    const authToken = await requireAuthToken();
    const device = await getDeviceInfo();
    const consumerDevice = JSON.stringify(device);

    const linkSpinner = log.task("Linking...").start();
    const res = await safeCall(
      async () =>
        await dbApi.projects.consumeShareToken({
          token,
          consumerDevice,
          consumerId: authToken.userId,
        })
    )();

    if ("error" in res) {
      linkSpinner.fail("Error linking project!");
      log.error(
        res.error.includes("fetch failed")
          ? "Network error"
          : res.error.includes("Invalid or expired token")
            ? "Invalid or expired token, ask the project owner to re-share the token"
            : res.error.includes("Project not found")
              ? "Project not found"
              : res.error.includes("User not found")
                ? "User not found"
                : res.error
      );
      process.exit(1);
    }

    const { project, allowLink, variables } = res;
    const envFilePath = await ensureEnvLocal();
    const teamService = new TeamService(project.teamId, authToken.userId);
    const decryptedVariables: { name: string; value: string }[] = [];
    for (const v of variables) {
      const decrypted = await teamService.decryptVariable(v.value);
      decryptedVariables.push({ name: v.name, value: decrypted });
    }
    // await writeEnvFile(envFilePath, decryptedVariables);
    const hash = await getEnvFileHash(
      envFilePath,
      { ...project, linkedAt: Date.now(), hash: "" },
      authToken.userId
    );
    if (allowLink) {
      // this is a project with a linked token
      await writeProjectsDir(project, hash);
      linkSpinner.succeed("Project linked successfully!");
      log.success(`Variables saved to ${envFilePath}`);
      log.trace(
        `Project linked to the cloud deployment! Run ${chalk.bold("envkit sync")} to sync variables periodically`
      );
    } else {
      linkSpinner.succeed("Project linked successfully!");
      log.success(`Variables saved to ${envFilePath}`);
    }
    process.exit(0);
  });

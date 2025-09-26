// │
// ├── push <environment>
// ├── pull <environment>
// ├── sync [environment]
// ├── set <environment> <key> <value>
// ├── get <environment> <key>
// └── delete <environment> <key>

// commands.ts

import { PROJECTS_DIR } from "@/constants.js";
import { requireAuthToken } from "@/lib/auth.js";
import { log } from "@/lib/logger.js";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import {
  getEnvFileHash,
  loadEnvFile,
  runInit,
  updateProjectsDir,
  writeEnvFile,
  type LinkedProject,
} from "./init.js";
import { confirm, input, select } from "@inquirer/prompts";
import { dbApi, safeCall } from "@envkit/db";
import { TeamService } from "@envkit/db/encryption";
import { type Id } from "@envkit/db/env";

async function getProjects(dir: string) {
  const dirContents = await fs.stat(PROJECTS_DIR).catch(() => null);
  if (!dirContents || !dirContents.isDirectory()) return false;

  const projects = await fs.readdir(PROJECTS_DIR);
  if (!projects.length) return false;
  return projects.filter((p) =>
    p.includes(dir)
  ) as `projectName-projectStage`[];
}

async function readLinkedProject(projectName: string, stage: string) {
  const projects = await fs.readdir(PROJECTS_DIR);
  const project = projects.find(
    (p) => p.includes(projectName) && p.includes(stage)
  );
  if (!project) return false;

  const projectData = await fs.readFile(path.join(PROJECTS_DIR, project), {
    encoding: "utf-8",
    flag: "a+",
  });
  return JSON.parse(projectData) as LinkedProject;
}

// REVIEW: helper to ensure .env.local exists, consolidating other files if needed
export async function ensureEnvLocal() {
  const cwd = process.cwd();
  const envFile = path.join(cwd, ".env.local");
  const exists = await fs.stat(envFile).catch(() => null);

  if (!exists) {
    const allFiles = await fs.readdir(cwd);
    const otherEnvFiles = allFiles.filter(
      (f) => f.startsWith(".env") && f !== ".env.local"
    );

    if (otherEnvFiles.length) {
      const consolidated: Record<string, string> = {};
      for (const file of otherEnvFiles) {
        const vars = await loadEnvFile(file);
        for (const [k, v] of Object.entries(vars)) {
          if (!(k in consolidated)) consolidated[k] = v;
        }
      }
      await writeEnvFile(envFile, consolidated);
      log.warn(
        `A migration to ${chalk.bold(".env.local")} has been performed. Consolidated values from: ${otherEnvFiles.join(", ")}`
      );
    } else {
      await writeEnvFile(envFile, {});
      log.info(`Created empty ${chalk.bold(".env.local")}`);
    }
  }

  return envFile;
}

export async function runPush(env: string | undefined) {
  const token = await requireAuthToken();
  const projectName = process.cwd().split("/").pop();
  if (!projectName) {
    log.warn("Please run this command from the root of your project");
    process.exit(1);
  }

  let linkedProjects = await getProjects(projectName);
  if (!linkedProjects) {
    log.warn(
      `No linked projects found for ${projectName}! Running init now ...`
    );
    await runInit("create");
    linkedProjects = await getProjects(projectName);
    if (!linkedProjects) {
      log.error("Init did not produce any linked project. Aborting.");
      process.exit(1);
    }
  }

  const stages =
    linkedProjects.length > 1
      ? linkedProjects.map((p) => p.split("-")[1])
      : linkedProjects[0].split("-")[1];

  const projectStage =
    env ??
    (typeof stages === "string"
      ? stages
      : await select({
          message: "What stage do you want to push to?",
          choices: stages.map((s) => ({ name: s, value: s })),
          loop: true,
        }));

  const linkedProject = await readLinkedProject(projectName, projectStage);
  if (!linkedProject) {
    log.warn(
      `No linked projects found for ${projectName} and ${projectStage}! Please run ${chalk.bold(
        "envkit init"
      )} first.`
    );
    process.exit(1);
  }

  // REVIEW: enforce .env.local
  const envFile = await ensureEnvLocal();

  const currentHash = await getEnvFileHash(envFile);
  if (linkedProject.hash && currentHash === linkedProject.hash) {
    log.warn("No changes in environment file. Nothing to push.");
    process.exit(0);
  }

  const variables = await loadEnvFile(envFile);
  const pushSpinner = log
    .task(`Pushing variables to ${linkedProject.name} (${linkedProject.stage})`)
    .start();

  const dbVars = await safeCall(
    async () => await dbApi.projects.getVars(linkedProject._id, currentHash)
  )();
  if ("error" in dbVars) throw new Error(dbVars.error);
  if (!dbVars.changed) {
    pushSpinner.succeed("Already up to date");
    process.exit(0);
  }

  const encryptedVariables: { name: string; value: string }[] = [];
  const teamService = new TeamService(
    linkedProject.teamId,
    token.userId as unknown as Id<"users">
  );

  await Promise.all(
    Object.entries(variables).map(async ([k, v]) => {
      const encrypted = await teamService.encryptVariable(v);
      encryptedVariables.push({ name: k, value: encrypted });
    })
  );

  const res = await safeCall(
    async () =>
      await dbApi.projects.addVars(
        linkedProject._id,
        token.userId as unknown as Id<"users">,
        encryptedVariables
      )
  )();
  if (!res || "error" in res) {
    pushSpinner.fail("Error pushing variables!");
    throw new Error(res?.error || "Unknown error");
  }

  const newHash = await getEnvFileHash(envFile);
  await updateProjectsDir(res.updatedProject, newHash);

  pushSpinner.succeed(
    `Variables pushed successfully! ${res.additions.length} new, ${res.removals.length} removed, ${res.conflicts.length} modified.`
  );
  process.exit(0);
}

export const pushCmd = new Command("push")
  .description("Push variables to the cloud")
  .argument("[env]", "Environment to push to e.g dev/prod")
  .action(runPush);

export async function runPull(env: string | undefined) {
  const token = await requireAuthToken();
  const projectName = process.cwd().split("/").pop();
  if (!projectName) {
    log.warn("Please run this command from the root of your project");
    process.exit(1);
  }

  let linkedProjects = await getProjects(projectName);
  if (!linkedProjects) {
    log.warn(
      `No linked projects found for ${projectName}! Running init now ...`
    );
    await runInit("create");
    linkedProjects = await getProjects(projectName);
    if (!linkedProjects) {
      log.error("Init did not produce any linked project. Aborting.");
      process.exit(1);
    }
  }

  const stages =
    linkedProjects.length > 1
      ? linkedProjects.map((p) => p.split("-")[1])
      : linkedProjects[0].split("-")[1];

  const projectStage =
    env ??
    (typeof stages === "string"
      ? stages
      : await select({
          message: "What stage do you want to pull from?",
          choices: stages.map((s) => ({ name: s, value: s })),
          loop: true,
        }));

  const linkedProject = await readLinkedProject(projectName, projectStage);
  if (!linkedProject) {
    log.warn(
      `No linked projects found for ${projectName} and ${projectStage}! Please run ${chalk.bold(
        "envkit init"
      )} first.`
    );
    process.exit(1);
  }

  const envFile = await ensureEnvLocal();
  const pullSpinner = log
    .task(
      `Pulling variables from ${linkedProject.name} (${linkedProject.stage})`
    )
    .start();

  const variables = await safeCall(async () =>
    dbApi.projects.getVars(linkedProject._id, linkedProject.hash)
  )();
  if ("error" in variables && variables.error === "NO_CHANGES") {
    pullSpinner.succeed("Already up to date.");
    process.exit(0);
  }
  if ("error" in variables) {
    pullSpinner.fail("Error pulling variables!");
    throw new Error(variables.error);
  }
  if (!variables.changed) {
    pullSpinner.succeed("Already up to date.");
    process.exit(0);
  }

  const teamService = new TeamService(
    linkedProject.teamId,
    token.userId as unknown as Id<"users">
  );
  const decryptedVariables: { name: string; value: string }[] = [];
  for (const v of variables.vars) {
    const decrypted = await teamService.decryptVariable(v.value);
    decryptedVariables.push({ name: v.name, value: decrypted });
  }

  await writeEnvFile(
    envFile,
    Object.fromEntries(decryptedVariables.map((v) => [v.name, v.value]))
  );
  await updateProjectsDir(linkedProject, variables.hash);

  pullSpinner.succeed("Variables pulled successfully!");
  log.success(`Variables saved to ${envFile}`);
  process.exit(0);
}

export const pullCmd = new Command("pull")
  .description("Pull variables from the cloud")
  .argument("[env]", "Environment to pull from e.g dev/prod")
  .action(runPull);

export const syncCmd = new Command("sync")
  .description("Synchronize local and cloud variables")
  .argument("[env]", "Environment to sync e.g dev/prod")
  .action(async function (env: string | undefined) {
    const projectName = process.cwd().split("/").pop();
    if (!projectName) {
      log.warn("Please run this command from the root of your project");
      process.exit(1);
    }

    let linkedProjects = await getProjects(projectName);
    if (!linkedProjects) {
      log.warn(
        `No linked projects found for ${projectName}! Running init now ...`
      );
      await runInit("create");
      linkedProjects = await getProjects(projectName);
      if (!linkedProjects) {
        log.error("Init did not produce any linked project. Aborting.");
        process.exit(1);
      }
    }

    const stages =
      linkedProjects.length > 1
        ? linkedProjects.map((p) => p.split("-")[1])
        : linkedProjects[0].split("-")[1];

    const projectStage =
      env ??
      (typeof stages === "string"
        ? stages
        : await select({
            message: "What stage do you want to sync?",
            choices: stages.map((s) => ({ name: s, value: s })),
            loop: true,
          }));

    const linkedProject = await readLinkedProject(projectName, projectStage);
    if (!linkedProject) {
      log.warn(
        `No linked projects found for ${projectName} and ${projectStage}! Please run ${chalk.bold(
          "envkit init"
        )} first.`
      );
      process.exit(1);
    }

    const envFile = await ensureEnvLocal();
    const localHash = await getEnvFileHash(envFile);

    const syncSpinner = log.task(`Checking sync state...`).start();
    const serverProject = await safeCall(() =>
      dbApi.projects.get(linkedProject._id)
    )();
    const serverVars = await safeCall(() =>
      dbApi.projects.getVars(linkedProject._id, linkedProject.hash)
    )();

    if ("error" in serverProject || "error" in serverVars) {
      syncSpinner.fail("Error fetching sync state!");
      throw new Error(
        (serverProject as any)?.error ||
          (serverVars as any)?.error ||
          "Unknown error"
      );
    }

    const serverHash = serverVars.hash;
    syncSpinner.succeed("Sync state fetched");

    let action: "pull" | "push" | null = null;
    if (localHash !== linkedProject.hash && serverHash === linkedProject.hash) {
      action = "push";
    } else if (
      localHash === linkedProject.hash &&
      serverHash !== linkedProject.hash
    ) {
      action = "pull";
    } else if (
      localHash !== linkedProject.hash &&
      serverHash !== linkedProject.hash
    ) {
      log.warn("Both local and cloud have diverged!");
      const conflictResolution = await select({
        message: "Resolve conflict",
        choices: [
          { name: "Pull (overwrite local)", value: "pull" },
          { name: "Push (overwrite cloud)", value: "push" },
          { name: "Abort", value: "abort" },
        ],
      });
      if (conflictResolution === "abort") {
        log.info("Sync aborted.");
        process.exit(0);
      }
      action = conflictResolution as "pull" | "push";
    } else {
      log.success("Already in sync.");
      process.exit(0);
    }

    const confirmAction = await confirm({
      message: `Do you want to ${action} changes?`,
      default: true,
    });
    if (!confirmAction) {
      log.info("Sync aborted.");
      process.exit(0);
    }

    if (action === "pull") await runPull(env);
    if (action === "push") await runPush(env);

    log.success("Sync complete!");
    process.exit(0);
  });

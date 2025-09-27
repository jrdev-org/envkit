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
import { confirm, select } from "@inquirer/prompts";
import { dbApi, safeCall } from "@envkit/db";
import { TeamService } from "@envkit/db/encryption";
import { type Id } from "@envkit/db/env";

export async function encryptVariable(
  teamId: Id<"teams">,
  callerid: Id<"users">,
  value: string
) {
  const teamService = new TeamService(teamId, callerid);
  return teamService.encryptVariable(value);
}

export async function encryptVariables(
  teamId: Id<"teams">,
  callerid: Id<"users">,
  values: { name: string; value: string }[]
) {
  const teamService = new TeamService(teamId, callerid);
  const encrypted = await Promise.all(
    values.map(async (v) => {
      return {
        name: v.name,
        value: await teamService.encryptVariable(v.value),
      };
    })
  );
  return encrypted;
}

export async function decryptVariable(
  teamId: Id<"teams">,
  callerid: Id<"users">,
  value: string
) {
  const teamService = new TeamService(teamId, callerid);
  return teamService.decryptVariable(value);
}

export async function decryptVariables(
  teamId: Id<"teams">,
  callerid: Id<"users">,
  values: string[]
) {
  const teamService = new TeamService(teamId, callerid);
  const decrypted = await Promise.all(
    values.map(async (v) => teamService.decryptVariable(v))
  );
  return decrypted;
}

export async function getLinkedProject(projectName: string, env?: string) {
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

  return linkedProject;
}

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
      await writeEnvFile(
        envFile,
        Object.entries(consolidated).map(([k, v]) => ({
          name: k,
          value: v,
        }))
      );
      log.warn(
        `A migration to ${chalk.bold(".env.local")} has been performed. Consolidated values from: ${otherEnvFiles.join(", ")}`
      );
    } else {
      await writeEnvFile(envFile, []);
      log.info(`Created empty ${chalk.bold(".env.local")}`);
    }
  }

  return envFile;
}

export async function runPush(stage?: string) {
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
    stage ??
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
  return;
}

export const pushCmd = new Command("push")
  .description("Push variables to the cloud")
  .argument("[stage]", "Stage to push to e.g dev/prod")
  .action(async (stage?: string) => {
    await runPush(stage);
    process.exit(0);
  });

export async function runPull(stage?: string) {
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
    stage ??
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

  const currentHash = await getEnvFileHash(envFile);
  const variables = await safeCall(async () =>
    dbApi.projects.getVars(linkedProject._id, currentHash)
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
    pullSpinner.succeed("No changes on the cloud.");
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

  await writeEnvFile(envFile, decryptedVariables);
  await updateProjectsDir(linkedProject, variables.hash);

  pullSpinner.succeed("Variables pulled successfully!");
  log.success(`Variables saved to ${envFile}`);
  return;
}

export const pullCmd = new Command("pull")
  .description("Pull variables from the cloud")
  .argument("[stage]", "Stage to pull from e.g dev/prod")
  .action(async (stage?: string) => {
    await runPull(stage);
    process.exit(0);
  });

export const syncCmd = new Command("sync")
  .description("Synchronize local and cloud variables")
  .argument("[stage]", "Stage to sync e.g dev/prod")
  .action(async function (stage?: string) {
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
      stage ??
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

    if (action === "pull") await runPull(stage);
    if (action === "push") await runPush(stage);

    log.success("Sync complete!");
    process.exit(0);
  });

export async function runGet(key: string, stage?: string) {
  const token = await requireAuthToken();
  const projectName = process.cwd().split("/").pop();
  if (!projectName) {
    log.warn("Please run this command from the root of your project");
    process.exit(1);
  }
  const linkedProject = await getLinkedProject(projectName, stage);
  const envFile = await ensureEnvLocal();
  let variables = await loadEnvFile(envFile);
  const existing = Object.keys(variables)
    .filter((k) => k in variables)
    .find((v) => v === key);
  if (!existing) {
    const choice = await confirm({
      message: `No local variable found with key ${chalk.bold(key)}. Do you want to pull from the cloud?`,
      default: true,
    });
    if (!choice) {
      log.info("Aborting...");
      process.exit(0);
    }
    await runPull(linkedProject.stage);
    variables = await loadEnvFile(envFile);
    const pulled = Object.keys(variables)
      .filter((k) => k in variables)
      .find((v) => v === key);
    if (!pulled) {
      log.error(
        `No server variable named ${chalk.bold(key)}, it may have been deleted.`
      );
      process.exit(1);
    }
    log.debug(
      `Variable ${chalk.bold(pulled)} found on the server with value ${chalk.bold(variables[pulled])}`
    );
    // log.debug(
    //   `Variable ${chalk.bold(key)} not found locally. Run ${chalk.bold("envkit pull")} to pull from the cloud.`
    // );
    process.exit(0);
  }
  const value = variables[existing];
  log.debug(`Found value for ${chalk.bold(key)}: ${value}`);
  process.exit(0);
}

export const getCmd = new Command("get")
  .description("Get a variable value")
  .argument("<key>", "Variable key")
  .argument("[stage]", "Stage to get from e.g dev/prod")
  .action(runGet);

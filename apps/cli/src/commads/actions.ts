// │
// ├── push <environment>
// ├── pull <environment>
// ├── sync [environment]
// ├── set <environment> <key> <value>
// ├── get <environment> <key>
// └── delete <environment> <key>

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

  if (!dirContents) {
    return false;
  }

  if (!dirContents.isDirectory()) {
    return false;
  }
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

export async function runPush(env: string | undefined) {
  const token = await requireAuthToken();
  const projectName = process.cwd().split("/").pop();
  let projectStage: string;

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

    // re-check after init created/linked the project
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

  if (env) {
    projectStage = env;
  } else if (typeof stages === "string") {
    projectStage = stages;
  } else {
    projectStage = await select({
      message: "What stage do you want to push to?",
      choices: stages.map((s) => ({
        name: s,
        value: s,
      })),
      loop: true,
    });
  }

  const linkedProject = await readLinkedProject(projectName, projectStage);
  if (!linkedProject) {
    log.warn(
      `No linked projects found for ${projectName} and ${projectStage}! Please run ${chalk.bold("envkit init")} first.`
    );
    process.exit(1);
  }

  const allFiles = await fs.readdir(process.cwd());
  const envFiles = allFiles.filter((f) => f.startsWith(".env"));
  if (!envFiles.length) {
    log.warn("No environment files found in the current directory");
    process.exit(1);
  }

  let envFile: string;
  if (envFiles.length === 1) {
    envFile = envFiles[0];
  } else {
    envFile = await select({
      message: "What environment file do you want to push?",
      choices: envFiles.map((f) => ({
        name: f,
        value: f,
      })),
    });
  }

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
  if ("error" in dbVars) {
    throw new Error(dbVars.error);
  }
  if (!dbVars.changed) {
    pushSpinner.succeed("Already up to date");
    log.warn("No variables changed");
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

  // TODO: check if variables already exist
  let confirmation: boolean;
  const conflicting = dbVars.vars.filter((v) => v.name in encryptedVariables);
  if (!conflicting.length) {
    confirmation = true;
  } else {
    confirmation = await confirm({
      message: `The push will overwrite the following variables: ${conflicting.map((v) => v.name).join(", ")}. Are you sure?`,
      default: false,
    });
  }

  if (!confirmation) {
    log.warn("Aborting...");
    process.exit(0);
  }

  const res = await safeCall(
    async () =>
      await dbApi.projects.addVars(
        linkedProject._id,
        token.userId as unknown as Id<"users">,
        encryptedVariables
      )
  )();

  if (!res) {
    pushSpinner.fail("Error pushing variables!");
    log.error("Failed to push variables! Please try again.");
  }

  if ("error" in res) {
    pushSpinner.fail("Error pushing variables!");
    throw new Error(res.error);
  }

  const newHash = await getEnvFileHash(envFile);
  await updateProjectsDir(res.updatedProject, newHash);

  pushSpinner.succeed(
    `Variables pushed successfully! ${res.additions.length} new variables added, ${res.removals.length} removed and ${res.conflicts.length} variables modified.`
  );
  log.success(`Run ${chalk.bold("envkit pull")} to pull variables`);

  process.exit(0);
}

export const pushCmd = new Command("push")
  .description("Push variables to the cloud")
  .argument("[env]", "Environment to push to e.g dev/prod")
  .action(async function (env: string | undefined) {
    await runPush(env);
  });

export async function runPull(env: string | undefined) {
  const token = await requireAuthToken();
  const projectName = process.cwd().split("/").pop();
  let projectStage: string;

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

    // re-check after init created/linked the project
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

  if (env) {
    projectStage = env;
  } else if (typeof stages === "string") {
    projectStage = stages;
  } else {
    projectStage = await select({
      message: "What stage do you want to pull from?",
      choices: stages.map((s) => ({
        name: s,
        value: s,
      })),
      loop: true,
    });
  }

  const linkedProject = await readLinkedProject(projectName, projectStage);
  if (!linkedProject) {
    log.warn(
      `No linked projects found for ${projectName} and ${projectStage}! Please run ${chalk.bold("envkit init")} first.`
    );
    process.exit(1);
  }

  const pullSpinner = log
    .task(
      `Pulling variables from ${linkedProject.name} (${linkedProject.stage})`
    )
    .start();

  const variables = await safeCall(async () => {
    const variables = await dbApi.projects.getVars(
      linkedProject._id,
      linkedProject.hash
    );
    return variables;
  })();

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
    log.warn("No changes in environment file. Nothing to pull.");
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
  pullSpinner.succeed("Variables pulled successfully!");

  let envFile: string;
  const allFiles = await fs.readdir(process.cwd());
  const envFiles = allFiles.filter((f) => f.startsWith(".env"));
  if (!envFiles.length) {
    log.warn("No environment files found in the current directory");
    envFile = await input({
      message: "Where do you want your variables?",
      default: `.env.local`,
    });
  } else {
    envFile = await select({
      message: "Where do you want your variables?",
      choices: envFiles.map((f) => ({
        name: f,
        value: f,
      })),
      loop: true,
      default: ".env.local",
    });
  }

  // TODO: check if variables already exist
  let confirmation: boolean;
  const existingVars = await loadEnvFile(envFile);
  const conflicting = decryptedVariables.filter(
    (v) => v.name in existingVars && v.value !== existingVars[v.name]
  );
  if (!conflicting.length) {
    confirmation = true;
  } else {
    confirmation = await confirm({
      message: `The pull will overwrite the following variables: ${conflicting.map((v) => v.name).join(", ")}. Are you sure?`,
      default: false,
    });
  }

  if (!confirmation) {
    log.info("Aborting...");
    process.exit(0);
  }

  await writeEnvFile(
    envFile,
    Object.fromEntries(decryptedVariables.map((v) => [v.name, v.value]))
  );

  await updateProjectsDir(linkedProject, variables.hash);

  log.success(`Variables successfully decrypted and saved to ${envFile}`);
  process.exit(0);
}

export const pullCmd = new Command("pull")
  .description("Pull variables from the cloud")
  .argument("[env]", "Environment to pull from e.g dev/prod")
  .action(async function (env: string | undefined) {
    await runPull(env);
  });

export const syncCmd = new Command("sync")
  .description("Synchronize local and cloud variables")
  .argument("[env]", "Environment to sync e.g dev/prod")
  .action(async function (env: string | undefined) {
    const token = await requireAuthToken();
    const projectName = process.cwd().split("/").pop();
    let projectStage: string;

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

      // re-check after init created/linked the project
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

    if (env) {
      projectStage = env;
    } else if (typeof stages === "string") {
      projectStage = stages;
    } else {
      projectStage = await select({
        message: "What stage do you want to sync?",
        choices: stages.map((s) => ({
          name: s,
          value: s,
        })),
        loop: true,
      });
    }

    const linkedProject = await readLinkedProject(projectName, projectStage);
    if (!linkedProject) {
      log.warn(
        `No linked projects found for ${projectName} and ${projectStage}! Please run ${chalk.bold("envkit init")} first.`
      );
      process.exit(1);
    }

    // Determine envFile
    const allFiles = await fs.readdir(process.cwd());
    const envFiles = allFiles.filter((f) => f.startsWith(".env"));
    if (!envFiles.length) {
      log.warn("No environment files found in the current directory");
      process.exit(1);
    }

    let envFile: string;
    if (envFiles.length === 1) {
      envFile = envFiles[0];
    } else {
      envFile = await select({
        message: "What environment file do you want to sync?",
        choices: envFiles.map((f) => ({
          name: f,
          value: f,
        })),
      });
    }

    const localHash = await getEnvFileHash(envFile);

    const syncSpinner = log
      .task(
        `Synchronizing variables for ${linkedProject.name} (${linkedProject.stage})`
      )
      .start();

    // Fetch server project details
    const serverProject = await safeCall(async () =>
      dbApi.projects.get(linkedProject._id)
    )();

    if ("error" in serverProject) {
      syncSpinner.fail("Error fetching project details!");
      throw new Error(serverProject.error);
    }

    // Fetch server variables hash
    const serverVars = await safeCall(async () =>
      dbApi.projects.getVars(linkedProject._id, linkedProject.hash)
    )();

    if ("error" in serverVars) {
      syncSpinner.fail("Error fetching server variables hash!");
      throw new Error(serverVars.error);
    }

    const serverHash = serverVars.hash;

    let action: "pull" | "push" | null = null;
    let blameMessage = "";

    // Scenario 1: Local changed, server same as last sync
    if (localHash !== linkedProject.hash && serverHash === linkedProject.hash) {
      action = "push";
      blameMessage = `Your local environment has changes. Do you want to push them to the cloud?`;
    }
    // Scenario 2: Server changed, local same as last sync
    else if (
      localHash === linkedProject.hash &&
      serverHash !== linkedProject.hash
    ) {
      action = "pull";
      const lastAction = serverProject.lastAction || "an unknown action";
      const lastActionTimestamp = serverProject.updatedAt
        ? new Date(serverProject.updatedAt).toLocaleString()
        : "recently";
      blameMessage = `The cloud environment was ${lastAction} ${lastActionTimestamp}. Do you want to pull these changes?`;
    }
    // Scenario 3: Both changed (conflict)
    else if (
      localHash !== linkedProject.hash &&
      serverHash !== linkedProject.hash
    ) {
      syncSpinner.warn("Both local and cloud environments have diverged!");
      const lastAction = serverProject.lastAction || "an unknown action";
      const lastActionTimestamp = serverProject.updatedAt
        ? new Date(serverProject.updatedAt).toLocaleString()
        : "recently";
      blameMessage = `Cloud changes were ${lastAction} ${lastActionTimestamp}. Do you want to pull (this will overwrite local changes) or push (this will overwrite cloud changes)?`;

      const conflictResolution = await select({
        message: blameMessage,
        choices: [
          { name: "Pull (overwrite local)", value: "pull" },
          { name: "Push (overwrite cloud)", value: "push" },
          { name: "Abort", value: "abort" },
        ],
      });
      if (conflictResolution === "abort") {
        syncSpinner.info("Sync aborted.");
        process.exit(0);
      }
      action = conflictResolution as "pull" | "push";
    } else {
      syncSpinner.succeed("Local and cloud environments are already in sync.");
      process.exit(0);
    }

    if (action) {
      const confirmAction = await confirm({
        message: blameMessage,
        default: true,
      });

      if (!confirmAction) {
        syncSpinner.info("Sync aborted.");
        process.exit(0);
      }

      syncSpinner.info(`Executing ${action} operation...`);
      if (action === "pull") {
        await runPull(env);
      } else if (action === "push") {
        await runPush(env);
      }
      syncSpinner.succeed("Sync complete!");
    } else {
      syncSpinner.succeed("No action needed.");
    }

    process.exit(0);
  });

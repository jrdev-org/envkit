import { PROJECTS_DIR } from "@/constants.js";
import { AuthToken, requireAuthToken } from "@/lib/auth.js";
import { log } from "@/lib/logger.js";
import chalk from "chalk";
import { Command, program } from "commander";
import fs from "fs/promises";
import path from "path";
import {
  getEnvFileHash,
  loadEnvFile,
  runInit,
  writeEnvFile,
  writeProjectsDir,
  type LinkedProject,
} from "./init.js";
import { confirm, select } from "@inquirer/prompts";
import { dbApi, safeCall } from "@envkit/db";
import { TeamService } from "@envkit/db/encryption";
import { type Id } from "@envkit/db/env";
import { recordAudit } from "@/lib/audit.js";
import { getProjectName } from "./projects.js";

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
  values: { name: string; value: string }[]
) {
  const teamService = new TeamService(teamId, callerid);
  const decrypted = [];
  for (const v of values) {
    const decryptedValue = await teamService.decryptVariable(v.value);
    decrypted.push({ name: v.name, value: decryptedValue });
  }
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
    p.startsWith(`${dir}-`)
  ) as `projectName-projectStage`[];
}

async function readLinkedProject(projectName: string, stage: string) {
  const projects = await fs.readdir(PROJECTS_DIR);
  const project = projects.find((p) => p === `${projectName}-${stage}`);
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
      log.warn(
        `Other environment files were found: ${otherEnvFiles.join(
          ", "
        )}. We recommend migrating to ${chalk.bold(".env.local")}.`
      );

      const proceed = await confirm({
        message: `Do you want to consolidate values from ${otherEnvFiles.length} files into ${chalk.bold(
          ".env.local"
        )}?`,
        default: true,
      });

      if (proceed) {
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
          `Migration complete. Values consolidated into ${chalk.bold(
            ".env.local"
          )}.`
        );
      } else {
        await writeEnvFile(envFile, []);
        log.info(
          `Created empty ${chalk.bold(
            ".env.local"
          )}. Existing env files were left untouched.`
        );
      }
    } else {
      await writeEnvFile(envFile, []);
      log.info(`Created empty ${chalk.bold(".env.local")}`);
    }
  }

  return envFile;
}

export async function runPush(stage?: string) {
  const token = await requireAuthToken();
  const projectName = await getProjectName();

  const linkedProject = await getLinkedProject(projectName, stage);
  // REVIEW: enforce .env.local
  const envFile = await ensureEnvLocal();

  const currentHash = await getEnvFileHash(
    envFile,
    linkedProject,
    token.userId
  );

  const variables = await loadEnvFile(envFile);
  const pushSpinner = log
    .task(`Pushing variables to ${linkedProject.name} (${linkedProject.stage})`)
    .start();

  const dbVars = await safeCall(
    async () =>
      await dbApi.projects.getVars({
        localHash: currentHash,
        callerId: token.userId,
        projectId: linkedProject._id,
      })
  )();
  if ("error" in dbVars) throw new Error(dbVars.error);
  if (!dbVars.changed) {
    pushSpinner.succeed("Already up to date");
    process.exit(0);
  }

  const encryptedVariables: { name: string; value: string }[] = [];
  const teamService = new TeamService(linkedProject.teamId, token.userId);

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
        token.userId,
        encryptedVariables
      )
  )();
  if (!res || "error" in res) {
    pushSpinner.fail("Error pushing variables!");
    throw new Error(res?.error || "Unknown error");
  }

  const newHash = await getEnvFileHash(envFile, linkedProject, token.userId);
  await writeProjectsDir(res.updatedProject, newHash);

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
  const projectName = await getProjectName();
  const linkedProject = await getLinkedProject(projectName, stage);

  const envFile = await ensureEnvLocal();
  const pullSpinner = log
    .task(
      `Pulling variables from ${linkedProject.name} (${linkedProject.stage})`
    )
    .start();

  const currentHash = await getEnvFileHash(
    envFile,
    linkedProject,
    token.userId
  );
  const variables = await safeCall(async () =>
    dbApi.projects.getVars({
      localHash: currentHash,
      callerId: token.userId,
      projectId: linkedProject._id,
    })
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

  const teamService = new TeamService(linkedProject.teamId, token.userId);
  const decryptedVariables: { name: string; value: string }[] = [];
  for (const v of variables.vars) {
    const decrypted = await teamService.decryptVariable(v.value);
    decryptedVariables.push({ name: v.name, value: decrypted });
  }

  await writeEnvFile(envFile, decryptedVariables);
  const newHash = await getEnvFileHash(envFile, linkedProject, token.userId);
  await writeProjectsDir(linkedProject, newHash);

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
    const token = await requireAuthToken();
    const projectName = await getProjectName();
    const linkedProject = await getLinkedProject(projectName, stage);
    const envFile = await ensureEnvLocal();
    const localHash = await getEnvFileHash(
      envFile,
      linkedProject,
      token.userId
    );

    const syncSpinner = log.task(`Checking sync state...`).start();
    const serverProject = await safeCall(() =>
      dbApi.projects.get(linkedProject._id)
    )();
    if ("error" in serverProject) {
      syncSpinner.fail("Error fetching sync state!");
      throw new Error(serverProject.error);
    }
    const serverVars = await safeCall(() =>
      dbApi.projects.getVars({
        localHash,
        callerId: token.userId,
        projectId: linkedProject._id,
      })
    )();
    if ("error" in serverVars) {
      syncSpinner.fail("Error fetching sync state!");
      throw new Error(serverVars.error);
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
  const projectName = await getProjectName();
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

// TODO: Debug set command

export async function runSet(
  key: string,
  value: string,
  token: AuthToken,
  stage?: string,
  allowOverride?: boolean
) {
  const projectName = await getProjectName();
  let confirmSet = allowOverride;
  const linkedProject = await getLinkedProject(projectName, stage);
  const envFile = await ensureEnvLocal();
  let variables = await loadEnvFile(envFile);
  const existing = Object.keys(variables)
    .filter((k) => k in variables)
    .find((v) => v === key);

  if (existing) {
    const existingValue = variables[existing];
    log.debug(
      `Found value for ${chalk.bold(key)}: ${existingValue.slice(0, 10)}...`
    );
    if (existingValue === value) {
      log.info("No changes in environment file. Nothing to set.");
      process.exit(0);
    }
    if (!confirmSet) {
      confirmSet = await confirm({
        message: `Setting the new value for ${chalk.bold(key)}. This will override the existing value. Do you want to proceed?`,
        default: true,
      });
    }
    if (!confirmSet) {
      log.info("Aborting...");
      process.exit(1);
    }
    const deleteSpinner = log.task(`Setting variable...`).start();
    variables[existing] = value;
    await writeEnvFile(
      envFile,
      Object.entries(variables).map(([k, v]) => ({ name: k, value: v }))
    );
    await recordAudit({
      timestamp: Date.now(),
      project: projectName,
      file: envFile,
      vars: { [key]: { action: "overridden", value: value } },
    });
    // update on the cloud
    const res = await safeCall(
      async () =>
        await dbApi.projects.setVar(linkedProject._id, token.userId, key, value)
    )();
    if ("error" in res) {
      deleteSpinner.fail("Error setting variable!");
      throw new Error(res.error);
    }
    const hash = await getEnvFileHash(envFile, linkedProject, token.userId);
    await writeProjectsDir(linkedProject, hash);
    if (res.updated) deleteSpinner.succeed("Variable updated successfully!");
    else deleteSpinner.succeed("Variable set successfully!");
  } else {
    const setSpinner = log.task(`Setting variable...`).start();
    // update on the cloud first
    const res = await safeCall(
      async () =>
        await dbApi.projects.setVar(linkedProject._id, token.userId, key, value)
    )();
    if ("error" in res) {
      setSpinner.fail("Error setting variable!");
      throw new Error(res.error);
    }
    // Update the local variable
    variables[key] = value;
    await writeEnvFile(
      envFile,
      Object.entries(variables).map(([k, v]) => ({ name: k, value: v }))
    );
    await recordAudit({
      timestamp: Date.now(),
      project: projectName,
      file: envFile,
      vars: { [key]: { action: "added", value: value } },
    });

    const hash = await getEnvFileHash(envFile, linkedProject, token.userId);
    await writeProjectsDir(linkedProject, hash);
    setSpinner.succeed("Variable set successfully!");
  }
}

export const setCmd = new Command("set")
  .description("Create or update a single variable")
  .argument("<key>", "the variable name")
  .argument("<value>", "the value of the variable")
  .action(async (key: string, value: string) => {
    const token = await requireAuthToken();
    await runSet(key, value, token);
    process.exit(0);
  });

export async function runDelete(
  key: string,
  allowOverride?: boolean,
  stage?: string
) {
  const token = await requireAuthToken();
  const projectName = await getProjectName();
  let confirmation = allowOverride;
  const linkedProject = await getLinkedProject(projectName, stage);
  const envFile = await ensureEnvLocal();
  let variables = await loadEnvFile(envFile);
  const varsArray = Object.entries(variables).map(([k, v]) => {
    return { name: k, value: v };
  });
  const existing = Object.keys(variables)
    .filter((k) => k in variables)
    .find((v) => v === key);

  if (existing) {
    if (!allowOverride) {
      confirmation = await confirm({
        message:
          "This will delete the variable both from the cloud and locally. Do you want to proceed?",
        default: true,
      });
    }
    if (!confirmation) {
      log.info("Aborting...");
      process.exit(0);
    }
    const deleteSpinner = log.task(`Deleting variable...`).start();

    try {
      // update on the cloud first
      const res = await safeCall(
        async () =>
          await dbApi.projects.deleteVar(linkedProject._id, token.userId, key)
      )();
      if ("error" in res) {
        deleteSpinner.fail("Error deleting variable!");
        throw new Error(res.error);
      }

      // update local file after cloud confirms
      await writeEnvFile(
        envFile,
        varsArray.filter((v) => v.name !== key)
      );
      await recordAudit({
        timestamp: Date.now(),
        project: projectName,
        file: envFile,
        vars: {
          [key]: { action: "overridden", value: "deleted" },
        },
      });

      const hash = await getEnvFileHash(envFile, linkedProject, token.userId);
      await writeProjectsDir(res, hash);

      deleteSpinner.succeed("Variable deleted successfully!");
      process.exit(0);
    } catch (e) {
      deleteSpinner.fail("Error deleting variable!");
      log.error((e as Error).message);
      process.exit(1);
    }
  }
  log.error(`No variable named ${key} found in ${envFile}`);
  process.exit(1);
}

export const deleteCmd = new Command("delete")
  .description("Delete a single variable")
  .argument("<key>", "the variable name")
  .argument("[stage]", "Stage to get from e.g dev/prod")
  .option("-a, --allow-override", "Skip confirmation prompt")
  .action(async (key, stage, options) => {
    await runDelete(key, options.allowOverride, stage);
  });

// --- status ---
// shows current local vs server state without making changes
export const statusCmd = new Command("status")
  .description("Show the sync status of local vs cloud variables")
  .argument("[env]", "Environment to check status for e.g dev/prod")
  .action(async (env: string | undefined) => {
    const token = await requireAuthToken();
    const projectName = await getProjectName();
    const linkedProject = await getLinkedProject(projectName, env);
    const envFile = await ensureEnvLocal();
    const localHash = await getEnvFileHash(
      envFile,
      linkedProject,
      token.userId
    );
    const res = await safeCall(async () =>
      dbApi.projects.getVars({
        localHash,
        callerId: token.userId,
        projectId: linkedProject._id,
      })
    )();

    if ("error" in res) {
      log.error(res.error);
      process.exit(1);
    }

    log.info(`Project: ${linkedProject.name} (${linkedProject.stage})`);
    log.info(`Local hash: ${localHash}`);
    log.info(`Server hash: ${res.hash}`);
    if (localHash === res.hash) {
      log.success("Local and cloud are in sync.");
    } else {
      log.warn(
        "Local and cloud are out of sync. Run `envkit diff` for details."
      );
    }
  });

// --- diff ---
// shows which variables differ between local and cloud
export const diffCmd = new Command("diff")
  .description("Show the differences between local and cloud variables")
  .argument("[env]", "Environment to diff e.g dev/prod")
  .action(async (env: string | undefined) => {
    const token = await requireAuthToken();
    const projectName = await getProjectName();
    const linkedProject = await getLinkedProject(projectName, env);
    const localVars = await loadEnvFile(".env.local");
    const localHash = await getEnvFileHash(
      ".env.local",
      linkedProject,
      token.userId
    );
    const server = await safeCall(async () =>
      dbApi.projects.getVars({
        localHash,
        callerId: token.userId,
        projectId: linkedProject._id,
      })
    )();

    if ("error" in server) {
      log.error(server.error);
      process.exit(1);
    }

    const serverVars = Object.fromEntries(
      server.vars.map((v) => [v.name, v.value])
    );

    // Compare sets
    const added = Object.keys(localVars).filter((k) => !(k in serverVars));
    const removed = Object.keys(serverVars).filter((k) => !(k in localVars));
    const changed = Object.keys(localVars).filter(
      (k) => k in serverVars && localVars[k] !== serverVars[k]
    );

    if (!added.length && !removed.length && !changed.length) {
      log.success("No differences between local and cloud.");
      process.exit(0);
    }

    log.info("Differences between local and cloud:");
    if (added.length) {
      log.warn(`Locally added: ${added.join(", ")}`);
    }
    if (removed.length) {
      log.warn(`Removed locally: ${removed.join(", ")}`);
    }
    if (changed.length) {
      log.warn(`Changed values: ${changed.join(", ")}`);
    }
  });

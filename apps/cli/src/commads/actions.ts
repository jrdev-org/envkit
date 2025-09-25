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
  resolveConflicts,
  runInit,
  updateProjectsDir,
  writeEnvFile,
  type LinkedProject,
} from "./init.js";
import { confirm, input, select } from "@inquirer/prompts";
import { dbApi, safeCall } from "@envkit/db";
import { TeamService } from "@envkit/db/encryption";
import { type Id } from "@envkit/db/env";
import { string } from "valibot";

async function getProjects(dir: string) {
  const dirContents = await fs.stat(PROJECTS_DIR).catch(() => null);

  if (!dirContents) {
    return false;
  }

  if (!dirContents.isDirectory()) {
    return false;
  }
  const projects = await fs.readdir(PROJECTS_DIR);
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

export const pushCmd = new Command("push")
  .description("Push variables to the cloud")
  .argument("[env]", "Environment to push to e.g dev/prod")
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
      log.info("No changes in environment file. Nothing to push.");
      process.exit(0);
    }

    const variables = await loadEnvFile(envFile);

    const pushSpinner = log
      .task(
        `Pushing variables to ${linkedProject.name} (${linkedProject.stage})`
      )
      .start();

    const dbProject = await safeCall(async () =>
      dbApi.projects.get(linkedProject._id)
    )();
    if ("error" in dbProject) {
      return log.throw(dbProject.error);
    }

    const teamService = new TeamService(
      dbProject.teamId,
      token.userId as unknown as Id<"users">
    );
    const encryptedVariables: { name: string; value: string }[] = [];

    const _ = Object.fromEntries(
      await Promise.all(
        Object.entries(variables).map(async ([k, v]) => {
          const encrypted = await teamService.encryptVariable(v);
          encryptedVariables.push({ name: k, value: encrypted });
          return [k, encrypted] as const;
        })
      )
    );

    const dbVars = await safeCall(
      async () => await dbApi.variables.get(dbProject._id, undefined)
    )();
    if ("error" in dbVars) {
      return log.throw(dbVars.error);
    }

    // TODO: check if variables already exist
    let confirmation: boolean;
    const conflicting = dbVars.filter((v) => v.name in encryptedVariables);
    if (!conflicting.length) {
      confirmation = true;
    } else {
      confirmation = await confirm({
        message: `The push will overwrite the following variables: ${conflicting.map((v) => v.name).join(", ")}. Are you sure?`,
        default: false,
      });
    }

    if (!confirmation) {
      log.info("Aborting...");
      process.exit(0);
    }

    const res = await safeCall(
      async () =>
        await dbApi.projects.addVars(
          dbProject._id,
          token.userId as unknown as Id<"users">,
          encryptedVariables
        )
    )();

    if (!res) {
      pushSpinner.fail("Error pushing variables!");
      return log.throw("Failed to push variables! Please try again.");
    }

    if ("error" in res) {
      pushSpinner.fail("Error pushing variables!");
      return log.throw(res.error);
    }

    const newHash = await getEnvFileHash(envFile);
    await updateProjectsDir(res.updatedProject, newHash);

    pushSpinner.succeed(
      `Variables pushed successfully! ${res.additions.length} new variables added, ${res.removals.length} removed and ${res.conflicts} variables modified.`
    );
    log.success(`Run ${chalk.bold("envkit pull")} to pull variables`);

    process.exit(0);
  });

export const pullCmd = new Command("pull")
  .description("Pull variables from the cloud")
  .argument("[env]", "Environment to pull from e.g dev/prod")
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

    const dbProject = await safeCall(async () =>
      dbApi.projects.get(linkedProject._id)
    )();
    if ("error" in dbProject) {
      return log.throw(dbProject.error);
    }

    const variables = await safeCall(async () => {
      const variables = await dbApi.variables.get(
        dbProject._id,
        undefined,
        linkedProject.hash
      );
      return variables;
    })();

    if ("error" in variables && variables.error === "NO_CHANGES") {
      pullSpinner.succeed("Already up to date.");
      process.exit(0);
    }
    if ("error" in variables) {
      return log.throw(variables.error);
    }

    const teamService = new TeamService(
      dbProject.teamId,
      token.userId as unknown as Id<"users">
    );

    const decryptedVariables: { name: string; value: string }[] = [];
    for (const v of variables) {
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

    const newHash = await getEnvFileHash(envFile);
    await updateProjectsDir(dbProject, newHash);

    log.success(`Run ${chalk.bold("envkit push")} to push variables`);
    process.exit(0);
  });

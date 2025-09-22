import { requireAuthToken } from "@/lib/auth.js";
import { Command } from "commander";
import { input, select, confirm } from "@inquirer/prompts";
import { dbApi, safeCall } from "@envkit/db";
import { Id } from "@envkit/db/env";
import { log } from "@/lib/logger.js";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { PROJECTS_DIR } from "@/constants.js";
import { TeamService } from "@envkit/db/encryption";

const initCmd = new Command("init")
  .description("Initialize a new project")
  .action(async () => {
    const WORKING_DIR = process.cwd();
    const token = await requireAuthToken();

    const teams = await dbApi.teams.get(token.userId as unknown as Id<"users">);

    if (teams.length === 0) {
      log.error("You don't have any teams yet. Please create one first.");
      process.exit(1);
    }

    const action = (await select({
      message: "What do you want to do?",
      choices: [
        {
          name: "Create a new project",
          value: "create",
        },
        {
          name: "Link an existing project",
          value: "link",
        },
      ],
    })) as "create" | "link";

    if (action === "link") {
      // TODO: Link existing project
      const team = await select({
        message: "Select team to link project to",
        choices: teams.map((team) => ({
          name: `${team.name} (${team.type})`,
          value: team._id,
        })),
        loop: true,
      });
      const projects = await safeCall(
        async () => await dbApi.projects.list(team)
      )();

      const teamService = new TeamService(
        team,
        token.userId as unknown as Id<"users">
      );

      if ("error" in projects) {
        log.error(projects.error);
        process.exit(1);
      }

      if (projects.length === 0) {
        log.error(
          "You don't have any projects in this team yet. Please create one first."
        );
        process.exit(1);
      }
      const projectToLink = await select({
        message: "What project do you want to link?",
        choices: projects.map((project) => ({
          name: `${project.name} (${project.stage})`,
          value: project._id,
        })),
      }).then((p) => {
        return projects.find((project) => project._id === p);
      });

      if (!projectToLink) {
        log.error("Invalid project ID! Weird huh?");
        log.info("Please try again.");
        process.exit(1);
      }

      const confirmation = await confirm({
        message: `Are you sure you want to link this project in ${WORKING_DIR}?`,
        default: true,
      });

      if (!confirmation) {
        log.info("Aborting...");
        process.exit(1);
      }

      const projectSpinner = log.task("Linking project...").start();
      const variables = await safeCall(
        async () => await dbApi.variables.get(projectToLink._id)
      )();
      if ("error" in variables) {
        projectSpinner.fail(variables.error);
        process.exit(1);
      }

      const decryptedVariables = variables.map((variable) => {
        return {
          name: variable.name,
          value: teamService.decryptVariable(variable.value),
        };
      });

      const envFile = await select({
        message: "What environment file do you want to use?",
        choices: [".env", ".env.local", `.env.${projectToLink.stage}`].map(
          (file) => ({
            name: file,
            value: file,
          })
        ),
        loop: true,
      });

      const envFilePath = path.join(WORKING_DIR, envFile);
      const envFileExists = await fs
        .access(envFilePath)
        .then(() => true)
        .catch(() => false);

      // TODO: Check duplicate variables
      // TODO: Add to .gitignore
      // TODO: Add to local PROJECTS_DIR

      if (!envFileExists) {
        await fs.writeFile(
          envFilePath,
          `\n\n# Injected by envkit for project: ${projectToLink.name} team: ${teams.find((t) => t._id === teamId)?.name}
        \nPROJECT_NAME=${projectToLink.name}\n
        PROJECT_STAGE=${projectToLink.stage}\n
        ${decryptedVariables
          .map((variable) => `${variable.name.toUpperCase()}=${variable.value}`)
          .join("\n")}\n`
        );
      } else {
        await fs.appendFile(
          envFilePath,
          `\n\n# Injected by envkit for project: ${projectToLink.name} team: ${teams.find((t) => t._id === teamId)?.name}
          \nPROJECT_NAME=${projectToLink.name}\n
          PROJECT_STAGE=${projectToLink.stage}\n
          ${decryptedVariables
            .map(
              (variable) => `${variable.name.toUpperCase()}=${variable.value}`
            )
            .join("\n")}\n`
        );
      }

      projectSpinner.succeed("Project linked successfully!");
      log.success(
        `Run ${chalk.bold("envkit sync")} to sync your project's variables with the cloud`
      );
      process.exit(0);
    }

    const projectName = await input({
      message: "What is your project name?",
      default: WORKING_DIR.split("/").pop(),
    });

    const stage = await input({
      message: "What stage is this project in?",
      default: "development",
    });

    const teamId = await select({
      message: "What team do you want to use?",
      choices: teams.map((team) => ({
        name: `${team.name} (${team.type})`,
        value: team._id,
      })),
      loop: true,
    });

    const projectSpinner = log.task("Creating project...").start();
    const newProject = await safeCall(
      async () => await dbApi.projects.create(projectName.trim(), stage, teamId)
    )();

    if (!newProject) {
      projectSpinner.fail("Failed to create project");
      process.exit(1);
    }

    if ("error" in newProject) {
      projectSpinner.fail(newProject.error);
      process.exit(1);
    }

    const envFilePath = path.join(WORKING_DIR, ".env.local");
    const gitIgnorePath = path.join(WORKING_DIR, ".gitignore");

    const gitignoreExists = await fs
      .access(gitIgnorePath)
      .then(() => true)
      .catch(() => false);

    if (gitignoreExists) {
      log.warn(
        `A .gitignore file already exists in this directory. Skipping creation.`
      );
      const envInGitignore = await fs
        .readFile(gitIgnorePath, "utf8")
        .then((data) => data.includes(".env.local"))
        .catch(() => false);
      if (!envInGitignore) {
        await fs.appendFile(gitIgnorePath, "\n.env.local");
      }
    } else {
      await fs.writeFile(gitIgnorePath, "\n.env.local");
    }

    const envFileExists = await fs
      .access(envFilePath)
      .then(() => true)
      .catch(() => false);
    if (envFileExists) {
      log.warn(
        `A .env.local file already exists in this directory. Skipping creation.`
      );
      await fs.appendFile(
        envFilePath,
        `\n\n# Injected by envkit for project: ${projectName} team: ${teams.find((t) => t._id === teamId)?.name}
        \nPROJECT_NAME=${projectName}\n
        PROJECT_STAGE=${stage}\n`
      );
      return;
    } else {
      await fs.writeFile(
        envFilePath,
        `\n\n# Injected by envkit for project: ${projectName} team: ${teams.find((t) => t._id === teamId)?.name}
      \nPROJECT_NAME=${projectName}\n
      PROJECT_STAGE=${stage}\n`
      );
    }

    const projectFile = path.join(PROJECTS_DIR, `project-${newProject._id}`);
    await fs
      .writeFile(
        projectFile,
        JSON.stringify({ ...newProject, linkedAt: Date.now() }),
        {
          encoding: "utf-8",
          mode: "oo6o",
        }
      )
      .catch(() => {});

    projectSpinner.succeed("Project created successfully!");
    log.success(
      `Run ${chalk.bold("envkit push dev")} to push your project's variables to the cloud`
    );

    process.exit(0);
  });

export { initCmd };

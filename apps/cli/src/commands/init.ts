import { type AuthToken, requireAuthToken } from "@/lib/auth.js";
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
import dotenv from "dotenv";
import { recordAudit } from "@/lib/audit.js";
import { ensureEnvLocal } from "./actions.js";
import { getProjectName } from "./projects.js";

export async function loadEnvFile(
  filePath: string
): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return dotenv.parse(data);
  } catch {
    return {};
  }
}

export async function getEnvFileHash(filePath: string): Promise<string> {
  const envVars = await loadEnvFile(filePath);
  if (Object.keys(envVars).length === 0) {
    return "";
  }
  const canonical = Object.entries(envVars)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical)
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

export async function resolveConflicts(
  filePath: string,
  newVars: Record<string, string>
): Promise<Record<string, string>> {
  const existing = await loadEnvFile(filePath);
  const conflicts = Object.keys(newVars).filter((k) => k in existing);

  if (!conflicts.length) {
    return { ...existing, ...newVars };
  }

  log.warn(`Conflicts detected in ${filePath}: ${conflicts.join(", ")}`);

  const resolution = await select({
    message: "How do you want to resolve conflicts?",
    choices: [
      { name: "Override all with new values", value: "override" },
      { name: "Keep all existing values", value: "keep" },
      { name: "Decide individually", value: "ask" },
    ],
  });

  let merged = { ...existing };

  if (resolution === "override") {
    merged = { ...existing, ...newVars };
  } else if (resolution === "keep") {
    // keep all existing, ignore conflicting newVars
    for (const [k, v] of Object.entries(newVars)) {
      if (!(k in existing)) merged[k] = v;
    }
  } else {
    for (const [k, v] of Object.entries(newVars)) {
      if (k in existing) {
        const overwrite = await confirm({
          message: `Variable ${k} already exists (existing: ${existing[k]}). Override?`,
          default: false,
        });
        if (overwrite) merged[k] = v;
      } else {
        merged[k] = v;
      }
    }
  }

  return merged;
}

export async function writeEnvFile(
  filePath: string,
  vars: { name: string; value: string }[]
) {
  const content =
    vars
      .map((v) => {
        const escaped = v.value
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\n/g, "\\n");
        return `${v.name}="${escaped}"`;
      })
      .join("\n") + "\n";
  await fs.writeFile(filePath, content, { encoding: "utf-8" });
}

// TODO: create a writeProjectsDir function ...
const getProject = dbApi.projects.get;
const getTeam = dbApi.teams.get;
export type Team = Awaited<ReturnType<typeof getTeam>>[0];
export type Project = Awaited<ReturnType<typeof getProject>>;
export type LinkedProject = Project & { linkedAt: number; hash: string };

export async function writeProjectsDir(project: Project, hash: string) {
  // sanitize inputs to prevent path traversal or invalid filenames
  const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeStage = project.stage.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = path.join(PROJECTS_DIR, `${safeName}-${safeStage}`);

  const enriched: LinkedProject = {
    ...project,
    linkedAt: Date.now(),
    hash: hash,
  };

  await fs.writeFile(filePath, JSON.stringify(enriched, null, 2), {
    encoding: "utf-8",
    mode: 0o600, // secure owner-only read/write
  });
}

// deleted writeProjectsDir as it resembles writeProjectsDir

// link existing project
async function linkProject(workDir: string, token: AuthToken, teams: Team[]) {
  const team = await select({
    message: "Select team to link project to",
    choices: teams.map((t) => ({
      name: `${t.name} (${t.type})`,
      value: t._id,
    })),
    loop: true,
  });

  const projects = await safeCall(() => dbApi.projects.list(team))();
  if ("error" in projects) throw new Error(projects.error);
  if (!projects.length) throw new Error("No projects in this team");

  const projectToLink = await select({
    message: "What project do you want to link?",
    choices: projects.map((p) => ({
      name: `${p.name} (${p.stage})`,
      value: p._id,
    })),
  }).then((p) => projects.find((proj) => proj._id === p));

  if (!projectToLink) throw new Error("Invalid project selected");

  const confirmLink = await confirm({
    message: `Link project ${projectToLink.name} in ${workDir}?`,
    default: true,
  });
  if (!confirmLink) return log.info("Aborting...");

  const projectSpinner = log.task("Linking project...").start();
  const envFilePath = path.join(workDir, ".env.local");
  const currentHash = await getEnvFileHash(envFilePath);
  const variables = await safeCall(() =>
    dbApi.projects.getVars(projectToLink._id as Id<"projects">, currentHash)
  )();
  if ("error" in variables) throw new Error(variables.error);
  if (!variables.changed) {
    throw new Error("No changes in environment file. Nothing to link.");
  }

  const teamService = new TeamService(team, token.userId);
  const decryptedVariables = variables.vars.map((v) => ({
    name: v.name.toUpperCase(),
    value: teamService.decryptVariable(v.value),
  }));

  const newVars: Record<string, string> = {
    PROJECT_NAME: projectToLink.name,
    PROJECT_STAGE: projectToLink.stage,
    ...Object.fromEntries(decryptedVariables.map((v) => [v.name, v.value])),
  };

  const merged = await resolveConflicts(envFilePath, newVars);
  const vars = Object.entries(merged).map(([k, v]) => ({ name: k, value: v }));
  await writeEnvFile(envFilePath, vars);
  const hash = await getEnvFileHash(envFilePath);
  await writeProjectsDir(projectToLink, hash);
  await recordAudit({
    timestamp: Date.now(),
    project: projectToLink.name,
    file: envFilePath,
    vars: Object.fromEntries(
      Object.entries(newVars).map(([k, v]) => {
        const action = !(k in newVars)
          ? "added"
          : merged[k] === v
            ? "overridden"
            : "kept";
        return [k, { action, value: v }];
      })
    ),
  });

  projectSpinner.succeed("Project linked successfully!");
  log.success(`Run ${chalk.bold("envkit sync")} to sync variables`);
}

// create new project
async function createProject(workDir: string, teams: Team[]) {
  const detectedProjectName = await getProjectName();
  const projectName = await input({
    message: "What is your project name?",
    default: detectedProjectName,
  });

  const stage = await input({
    message: "What stage is this project in?",
    default: "development",
  });

  const teamId = await select({
    message: "What team do you want to use?",
    choices: teams.map((t) => ({
      name: `${t.name} (${t.type})`,
      value: t._id,
    })),
    loop: true,
  });

  const projectSpinner = log.task("Creating project...").start();
  const newProject = await safeCall(() =>
    dbApi.projects.create(projectName.trim(), stage, teamId)
  )();
  if (!newProject || "error" in newProject)
    throw new Error(newProject?.error ?? "Failed");

  // ensure .gitignore protects env
  const gitIgnorePath = path.join(workDir, ".gitignore");
  const gitignoreExists = await fs
    .access(gitIgnorePath)
    .then(() => true)
    .catch(() => false);

  if (gitignoreExists) {
    const data = await fs.readFile(gitIgnorePath, "utf8").catch(() => "");
    if (!data.includes(".env.local")) {
      await fs.appendFile(gitIgnorePath, "\n.env.local");
    }
  } else {
    await fs.writeFile(gitIgnorePath, "\n.env.local");
  }

  const envFilePath = path.join(workDir, ".env.local");
  const newVars: Record<string, string> = {
    PROJECT_NAME: projectName,
    PROJECT_STAGE: stage,
  };

  const merged = await resolveConflicts(envFilePath, newVars);
  const vars = Object.entries(merged).map(([k, v]) => ({ name: k, value: v }));
  await writeEnvFile(envFilePath, vars);
  const hash = await getEnvFileHash(envFilePath);
  await writeProjectsDir(newProject, hash);
  await recordAudit({
    timestamp: Date.now(),
    project: projectName,
    file: envFilePath,
    vars: Object.fromEntries(
      Object.entries(newVars).map(([k, v]) => [
        k,
        { action: "added", value: v },
      ])
    ),
  });

  projectSpinner.succeed("Project created successfully!");
  log.success(`Run ${chalk.bold(`envkit push ${stage}`)} to push variables`);
}

// --- Refactored init ---
export async function runInit(todo?: "link" | "create") {
  const WORKING_DIR = process.cwd();
  const token = await requireAuthToken();
  const teams = await dbApi.teams.get(token.userId);

  if (!teams.length) {
    log.error("You don't have any teams yet. Please create one first.");
    return;
  }

  if (!todo) {
    todo = await select({
      message: "What do you want to do?",
      choices: [
        { name: "Create a new project", value: "create" },
        { name: "Link an existing project", value: "link" },
      ],
    });
  }

  // REVIEW: always migrate to .env.local at init
  await ensureEnvLocal();

  try {
    if (todo === "link") {
      await linkProject(WORKING_DIR, token, teams);
    } else if (todo === "create") {
      await createProject(WORKING_DIR, teams);
    } else {
      throw new Error("Invalid action");
    }
  } catch (err) {
    log.error(
      (err as Error).message.includes("fetch failed")
        ? "Network error"
        : (err as Error).message
    );
    process.exit(1);
  }
}

export const initCmd = new Command("init")
  .description("Initialize a new project")
  .action(runInit);

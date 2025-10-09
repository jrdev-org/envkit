import { LinkedProject, loadEnvFile, type Project } from "@/commands/init.js";
import { METADATA_DIR } from "@/constants.js";
import { TeamService } from "@envkit/db/encryption";
import { Id } from "@envkit/db/types";
import fs from "fs/promises";
import { existsSync, writeFileSync } from "fs";
import path from "path";

export async function addLinkedProject({
  project,
  encryptedVars,
}: {
  project: Project;
  encryptedVars: { key: string; value: string }[];
}) {
  await syncGitignore();
  const exists = await fs.stat(METADATA_DIR).catch(() => null);
  if (!exists) await fs.mkdir(METADATA_DIR, { recursive: true });

  const projectFile = path.join(METADATA_DIR, "project.json");
  // Ensure the directory exists
  const dir = path.dirname(projectFile);
  await fs.mkdir(dir, { recursive: true });
  const enriched = { ...project, linkedAt: Date.now() };
  log.trace("Writing project file");
  await fs.writeFile(projectFile, JSON.stringify(enriched, null, 2), {
    mode: 0o600,
    encoding: "utf-8",
  });
  log.trace("Writing envkit cache");
  await setEnvkitCache({ encryptedVars });
}

export async function getLinkedProject() {
  const projectFile = path.join(METADATA_DIR, "project.json");
  const res = await fs.readFile(projectFile, "utf-8").catch(() => null);
  if (!res) return null;
  return JSON.parse(res) as LinkedProject;
}

export async function checkLinkedProject() {
  const projectFile = path.join(METADATA_DIR, "project.json");
  const fileExists = await fs
    .access(projectFile)
    .then(() => true)
    .catch(() => false);
  if (fileExists) {
    const data = await fs.readFile(projectFile, "utf-8");
    const existing = JSON.parse(data) as LinkedProject;
    const confirmation = await confirm({
      message: `This project was linked to project ${existing.name}. Overwrite?`,
      default: true,
    });
    if (!confirmation) {
      log.error("Aborting...");
      process.exit(0);
    }
  }
  return;
}

export async function writeEnvFile({
  teamId,
  callerId,
  encryptedVars,
}: {
  teamId: Id<"teams">;
  callerId: Id<"users">;
  encryptedVars: { key: string; value: string }[];
}) {
  const envFile = path.join(process.cwd(), ".env.local");
  const existing = existsSync(envFile);

  const decryptedVars = await decryptVariables(teamId, callerId, encryptedVars);

  if (!existing) {
    await fs.writeFile(envFile, "", "utf-8");
  }

  const content = await fs.readFile(envFile, "utf-8");
  const lines = content.split("\n").filter(Boolean);

  // Parse existing env vars
  const existingMap = new Map<string, string>();
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    existingMap.set(key.trim(), rest.join("=").trim());
  }

  const newMap = new Map<string, string>(
    decryptedVars.map((v) => [v.key, v.value])
  );

  const existingKeys = new Set(existingMap.keys());
  const newKeys = new Set(newMap.keys());

  const removed = [...existingKeys].filter((k) => !newKeys.has(k));
  const added = [...newKeys].filter((k) => !existingKeys.has(k));
  const changed = [...existingKeys].filter(
    (k) => newKeys.has(k) && existingMap.get(k) !== newMap.get(k)
  );

  // Confirm with user if changes detected
  if (removed.length || changed.length) {
    console.log("\nDetected environment changes:");
    if (added.length)
      console.log(`${chalk.green("Added")}: ${added.join("\n")}`);
    if (changed.length)
      console.log(`${chalk.yellow("Changed")}: ${changed.join("\n")}`);
    if (removed.length)
      console.log(`${chalk.red("Removed")}: ${removed.join("\n")}`);

    const proceed = await confirm({
      message: "Apply these changes to .env.local?",
      default: true,
    });
    if (!proceed) {
      console.log("Aborted.");
      return;
    }
  }

  // Merge new vars into a final map
  const finalMap = new Map(existingMap);
  for (const [key, value] of newMap.entries()) {
    finalMap.set(key, value);
  }

  // Remove keys that are no longer present
  const deletion = await confirm({
    message: `Delete these variables? ${removed.join("\n")}`,
    default: false,
  });
  if (deletion) {
    for (const key of removed) {
      finalMap.delete(key);
    }
  }

  // Write updated content
  const newContent = [...finalMap.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  await fs.writeFile(envFile, newContent + "\n", "utf-8");
  await setEnvkitCache({ encryptedVars });
}

export async function setEnvkitCache({
  encryptedVars,
}: {
  encryptedVars: { key: string; value: string }[];
}) {
  const varsFile = path.join(METADATA_DIR, "vars.json");
  // Ensure the directory exists
  const dir = path.dirname(varsFile);
  await fs.mkdir(dir, { recursive: true });
  const enriched = { ...encryptedVars, updatedAt: Date.now() };
  await fs.writeFile(varsFile, JSON.stringify(enriched, null, 2), {
    mode: 0o600,
    encoding: "utf-8",
  });
}

/**
 * Compare current .env.local variables with stored encrypted linked vars.
 * Returns a diff summary: { added, removed, changed, unchanged }.
 */
export async function compareToEnvLocal({
  teamId,
  callerId,
}: {
  teamId: Id<"teams">;
  callerId: Id<"users">;
}) {
  const varsFile = path.join(METADATA_DIR, "vars.json");
  const exists = existsSync(varsFile);
  if (!exists) throw new Error("No linked variables found");

  const res = await fs.readFile(varsFile, "utf-8");
  const encryptedLinkedVars = JSON.parse(res) as {
    key: string;
    value: string;
  }[];

  const envVars = await loadEnvFile(".env.local");
  const envVarsArray = Object.entries(envVars).map(([k, v]) => ({
    name: k,
    value: v,
  }));

  const teamService = new TeamService(teamId, callerId);
  const encryptedLocalVars = await Promise.all(
    envVarsArray.map(async (v) => ({
      key: v.name,
      value: await teamService.encryptVariable(v.value),
    }))
  );

  // Build maps for fast comparison
  const linkedMap = new Map(encryptedLinkedVars.map((v) => [v.key, v.value]));
  const localMap = new Map(encryptedLocalVars.map((v) => [v.key, v.value]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  // Detect additions and modifications
  for (const [key, value] of localMap.entries()) {
    if (!linkedMap.has(key)) added.push(key);
    else if (linkedMap.get(key) !== value) changed.push(key);
    else unchanged.push(key);
  }

  // Detect removals
  for (const key of linkedMap.keys()) {
    if (!localMap.has(key)) removed.push(key);
  }

  return { added, removed, changed, unchanged };
}

import { execSync } from "child_process";
import { decryptVariables } from "@/commands/actions.js";
import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { log } from "./logger.js";

export function getGitRoot(cwd: string = process.cwd()): string | null {
  try {
    const root = execSync("git rev-parse --show-toplevel", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return root;
  } catch {
    return null; // not inside a git repo
  }
}

export function getProjectName() {
  let projectName: string | null = null;
  const gitRoot = getGitRoot();
  if (gitRoot) projectName = path.basename(gitRoot);
  else projectName = path.basename(process.cwd());
  return projectName;
}

const GITIGNORE_PATH = path.join(process.cwd(), ".gitignore");
const ENTRIES = [".env", ".env.local", ".env*", ".envkit/"];

/** Ensure .gitignore exists, create if missing */
export async function ensureGitignore(): Promise<void> {
  try {
    await fs.access(GITIGNORE_PATH);
  } catch {
    await fs.writeFile(GITIGNORE_PATH, "", "utf-8");
  }
}

/** Append missing entries to .gitignore */
export async function syncGitignore(): Promise<void> {
  await ensureGitignore();

  const content = await fs.readFile(GITIGNORE_PATH, "utf-8");
  const lines = content.split("\n").map((l) => l.trim());
  const missing = ENTRIES.filter(
    (entry) => !lines.some((line) => line === entry)
  );

  if (missing.length === 0) return;

  const appended = content.trimEnd() + "\n" + missing.join("\n") + "\n";
  await fs.writeFile(GITIGNORE_PATH, appended, "utf-8");
}

/** Check whether all required entries exist */
export async function checkGitignore(): Promise<boolean> {
  try {
    const content = await fs.readFile(GITIGNORE_PATH, "utf-8");
    return ENTRIES.every((entry) =>
      content.split("\n").some((line) => line.trim() === entry)
    );
  } catch {
    return false;
  }
}

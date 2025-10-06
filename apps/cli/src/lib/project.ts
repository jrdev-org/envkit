import { LinkedProject, loadEnvFile, type Project } from "@/commands/init.js";
import { METADATA_DIR } from "@/constants.js";
import { TeamService } from "@envkit/db/encryption";
import { Id } from "@envkit/db/types";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function addLinkedProject({
  project,
  encryptedVars,
}: {
  project: Project;
  encryptedVars: { key: string; value: string }[];
}) {
  const exists = await fs.stat(METADATA_DIR).catch(() => null);
  if (!exists) await fs.mkdir(METADATA_DIR, { recursive: true });

  const projectFile = path.join(METADATA_DIR, "project.json");
  const fileExists = await fs
    .access(projectFile)
    .then(() => true)
    .catch(() => false);
  if (fileExists) throw new Error("Project already linked");

  const enriched = { ...project, linkedAt: Date.now() };
  await fs.writeFile(projectFile, JSON.stringify(enriched, null, 2), {
    mode: 0o600,
    encoding: "utf-8",
  });

  const varsFile = path.join(METADATA_DIR, "vars.json");
  await fs.writeFile(varsFile, JSON.stringify(encryptedVars, null, 2), {
    mode: 0o600,
    encoding: "utf-8",
  });
}

export async function getLinkedProject() {
  const projectFile = path.join(METADATA_DIR, "project.json");
  const res = await fs.readFile(projectFile, "utf-8").catch(() => null);
  if (!res) return null;
  return JSON.parse(res) as LinkedProject;
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

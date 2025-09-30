import { readFile, appendFile, access, writeFile } from "node:fs/promises";
import { log } from "./logger.js";
import path from "node:path";

export async function addToGitignore() {
  const GITIGNORE_FILE = path.join(process.cwd(), ".gitignore");
  const entry =
    "\n# envkit local workspace data (linked project metadata and user env files)\n.envkit/*\n.env.local\n";

  const exists = await access(GITIGNORE_FILE)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    // No .gitignore → create one fresh
    await writeFile(GITIGNORE_FILE, entry, "utf8");
    log.info(`\n  Created new .gitignore and added .envkit/* \n`);
    return;
  }

  // .gitignore exists, read contents
  const gitIgnore = await readFile(GITIGNORE_FILE, "utf8").catch(() => "");

  const hasEnvkit = gitIgnore.includes(".envkit/*");
  const hasEnvLocal = gitIgnore.includes(".env.local");

  if (hasEnvkit && hasEnvLocal) {
    log.info(`\n  .envkit/* and .env.local already exist in .gitignore \n`);
    return;
  }

  // Append missing entries
  let toAppend =
    "\n# envkit local workspace data (linked project metadata and user env files)\n";
  if (!hasEnvkit) toAppend += ".envkit/*\n";
  if (!hasEnvLocal) toAppend += ".env.local\n";

  await appendFile(GITIGNORE_FILE, toAppend, "utf8");
  log.info(`\n  Added missing envkit entries to .gitignore \n`);
  return;
}

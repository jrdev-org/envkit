import fs from "fs/promises";
import os from "os";
import path from "path";

const AUDIT_FILE = path.join(os.homedir(), ".envkit", "history.json");

export interface AuditEntry {
  timestamp: number;
  project?: string;
  file: string;
  vars: {
    [k: string]: { action: "added" | "overridden" | "kept"; value: string };
  };
}

export async function recordAudit(entry: AuditEntry) {
  try {
    const dir = path.dirname(AUDIT_FILE);
    await fs.mkdir(dir, { recursive: true });

    let history: AuditEntry[] = [];
    try {
      const data = await fs.readFile(AUDIT_FILE, "utf8");
      history = JSON.parse(data);
    } catch {
      // no history yet
    }

    history.push(entry);
    await fs.writeFile(AUDIT_FILE, JSON.stringify(history, null, 2), "utf8");
  } catch (err) {
    // do not block CLI on audit log failure
  }
}

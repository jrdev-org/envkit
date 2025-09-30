import fs from "fs/promises";
import os from "os";
import crypto from "crypto";
import { CLI_VERSION, CONFIG_DIR, DEVICE_FILE } from "@/constants.js";

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const deviceId = await fs.readFile(DEVICE_FILE, "utf8");
    return deviceId.trim();
  } catch {
    const deviceId = crypto.randomBytes(16).toString("hex");
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(DEVICE_FILE, deviceId);
    return deviceId;
  }
}

export async function getDeviceInfo() {
  return {
    deviceId: await getOrCreateDeviceId(),
    deviceName: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    username: os.userInfo().username,
    nodeVersion: process.versions.node,
    cliVersion: CLI_VERSION,
  };
}

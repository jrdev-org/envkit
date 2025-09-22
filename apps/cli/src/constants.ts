import path from "path";
import os from "os";

export const CONFIG_DIR = path.join(os.homedir(), ".envkit");
export const DEVICE_FILE = path.join(CONFIG_DIR, "device-info");
export const TOKEN_FILE = path.join(CONFIG_DIR, "auth-token");
export const CLI_VERSION = "0.1.0";
export const PROJECTS_DIR = path.join(CONFIG_DIR, "projects");

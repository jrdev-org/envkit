import os from "node:os";
import path from "node:path";

export const USER_PATHS = {
	ROOT: path.join(os.homedir(), ".envkit"),
	CONFIG: path.join(os.homedir(), ".envkit", "config.json"),
	TOKEN: path.join(os.homedir(), ".envkit", "token.json"),
	DEVICE: path.join(os.homedir(), ".envkit", "device.json"),
	ID: path.join(os.homedir(), ".envkit", "user-id"),
	LOCAL_KEYS: path.join(os.homedir(), ".envkit", "local-keys.json"),
};

export const PROJECT_PATHS = {
	ROOT: path.join(process.cwd(), ".envkit"),
	VARS: path.join(process.cwd(), ".envkit", "vars.json"),
	METADATA: path.join(process.cwd(), ".envkit", "metadata.json"),
};

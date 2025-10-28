import fs from "node:fs/promises";
import { PROJECT_PATHS, USER_PATHS } from "@cli/constants/paths.js";
import { getDeviceInfo } from "./setup-device.js";

/** Ensure directories exist */
async function ensureDir(dir: string) {
	try {
		await fs.mkdir(dir, { recursive: true });
	} catch (err) {
		console.error(`Failed to create directory ${dir}`, err);
		throw err;
	}
}

/** Ensure file exists with optional default content */
async function ensureFile(
	filePath: string,
	defaultContent: string | object = {},
) {
	try {
		await fs.access(filePath);
	} catch {
		await fs.writeFile(
			filePath,
			JSON.stringify(defaultContent, null, 2),
			"utf-8",
		);
	}
}

/** Initialize user-global .envkit folder */
export async function initUserPaths() {
	await ensureDir(USER_PATHS.ROOT);
	await ensureFile(USER_PATHS.CONFIG, { apiBaseUrl: "https://api.envkit.dev" });
	await ensureFile(USER_PATHS.TOKEN, {});
	const device = await getDeviceInfo();
	await ensureFile(USER_PATHS.DEVICE, device);
}

/** Initialize project-local .envkit folder */
export async function initProjectPaths() {
	await ensureDir(PROJECT_PATHS.ROOT);
	await ensureFile(PROJECT_PATHS.METADATA, {
		createdAt: new Date().toISOString(),
	});
	await ensureFile(PROJECT_PATHS.VARS, {}); // TODO: encrypt at rest if needed
}

/** Initialize both at first launch */
export async function initEnvkitFolders() {
	await initUserPaths();
	await initProjectPaths();
	console.log("Envkit folders initialized");
}

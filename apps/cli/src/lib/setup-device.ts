import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import { CONFIG } from "@cli/constants/config.js";
import { USER_PATHS } from "@cli/constants/paths.js";

export async function getDeviceInfo() {
	return {
		deviceId: getOrCreateDeviceId(),
		deviceName: os.hostname(),
		platform: os.platform(),
		arch: os.arch(),
		username: os.userInfo().username,
		nodeVersion: process.versions.node,
		cliVersion: CONFIG.VERSION,
	};
}
export type DeviceInfo = {
	deviceId: string;
	deviceName: string;
	platform: string;
	arch: string;
	username: string;
	nodeVersion: string;
	cliVersion: string;
};

function getOrCreateDeviceId() {
	try {
		const deviceInfo = fs.readFileSync(USER_PATHS.DEVICE, "utf8");
		const device = JSON.parse(deviceInfo) as DeviceInfo;
		return device.deviceId;
	} catch {
		const deviceId = crypto.randomBytes(16).toString("hex");
		fs.mkdirSync(USER_PATHS.ROOT, { recursive: true });
		fs.writeFileSync(USER_PATHS.DEVICE, deviceId);
		return deviceId;
	}
}

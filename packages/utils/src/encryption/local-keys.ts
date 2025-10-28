// encryption/localKeys.ts
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LOCAL_KEYS_PATH = path.join(os.homedir(), ".envkit", "local-keys.json");

export type LocalKeys = {
	teamId: string;
	salt: string;
	pepper: string;
};

export function generateLocalKeys(teamId: string): LocalKeys {
	const salt = crypto.randomBytes(16).toString("hex");
	const pepper = crypto.randomBytes(32).toString("hex");
	const keys: LocalKeys = { teamId, salt, pepper };
	saveLocalKeys(keys);
	return keys;
}

export function getLocalKeys(teamId: string): LocalKeys | null {
	if (!fs.existsSync(LOCAL_KEYS_PATH)) return null;
	const data = JSON.parse(fs.readFileSync(LOCAL_KEYS_PATH, "utf-8"));
	return data[teamId] || null;
}

export function saveLocalKeys(keys: LocalKeys) {
	const existing = fs.existsSync(LOCAL_KEYS_PATH)
		? JSON.parse(fs.readFileSync(LOCAL_KEYS_PATH, "utf-8"))
		: {};
	existing[keys.teamId] = keys;
	fs.writeFileSync(LOCAL_KEYS_PATH, JSON.stringify(existing, null, 2), "utf-8");
}

export function deriveEncryptionKey(
	password: string,
	salt: string,
	pepper: string,
) {
	// Deterministically derive an AES key from user password + pepper
	return crypto.pbkdf2Sync(password + pepper, salt, 100000, 32, "sha256");
}

export function encryptVariable(value: string, key: Buffer): string {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([
		cipher.update(value, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptVariable(encrypted: string, key: Buffer): string {
	const [ivHex, tagHex, dataHex] = encrypted.split(".");
	const decipher = crypto.createDecipheriv(
		"aes-256-gcm",
		key,
		Buffer.from(ivHex, "hex"),
	);
	decipher.setAuthTag(Buffer.from(tagHex, "hex"));
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(dataHex, "hex")),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}

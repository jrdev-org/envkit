import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loadEnvFile, getEnvFileHash } from "../../apps/cli/src/commads/init";
import fs from "fs/promises";
import path from "path";
import os from "os";
import dotenv from "dotenv";

dotenv.config();
describe("init command helpers", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "envkit-test-"));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("loadEnvFile", () => {
    it("should return an empty object for a non-existent file", async () => {
      const result = await loadEnvFile(path.join(tempDir, "non-existent.env"));
      expect(result).toEqual({});
    });

    it("should load variables from a .env file", async () => {
      const filePath = path.join(tempDir, ".env.test");
      await fs.writeFile(filePath, "FOO=bar\nBAZ=qux");
      const result = await loadEnvFile(filePath);
      expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
    });
  });

  describe("getEnvFileHash", () => {
    it("should return an empty string for an empty file", async () => {
      const filePath = path.join(tempDir, ".env.empty");
      await fs.writeFile(filePath, "");
      const hash = await getEnvFileHash(filePath);
      expect(hash).toBe("");
    });

    it("should generate a consistent hash for the same content", async () => {
      const filePath = path.join(tempDir, ".env.hash1");
      await fs.writeFile(filePath, "FOO=bar\nBAZ=qux");
      const hash1 = await getEnvFileHash(filePath);

      const filePath2 = path.join(tempDir, ".env.hash2");
      await fs.writeFile(filePath2, "FOO=bar\nBAZ=qux");
      const hash2 = await getEnvFileHash(filePath2);

      expect(hash1).toBe(hash2);
    });

    it("should generate the same hash regardless of variable order", async () => {
      const filePath1 = path.join(tempDir, ".env.order1");
      await fs.writeFile(filePath1, "FOO=bar\nBAZ=qux");
      const hash1 = await getEnvFileHash(filePath1);

      const filePath2 = path.join(tempDir, ".env.order2");
      await fs.writeFile(filePath2, "BAZ=qux\nFOO=bar");
      const hash2 = await getEnvFileHash(filePath2);

      expect(hash1).toBe(hash2);
    });

    it("should generate a different hash for different content", async () => {
      const filePath1 = path.join(tempDir, ".env.diff1");
      await fs.writeFile(filePath1, "FOO=bar");
      const hash1 = await getEnvFileHash(filePath1);

      const filePath2 = path.join(tempDir, ".env.diff2");
      await fs.writeFile(filePath2, "FOO=baz");
      const hash2 = await getEnvFileHash(filePath2);

      expect(hash1).not.toBe(hash2);
    });
  });
});

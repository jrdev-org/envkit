import * as crypto from "node:crypto";
import { env } from "@/env.js";
import { api } from "../convex/_generated/api.js";
import { convex, Id } from "@/index.js";

export class VariableEncryption {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 12; // 96 bits

  /**
   * Generate a unique salt for a new user
   */
  static generateSalt(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Derive a key from the user's salt
   */
  private static deriveKey(salt: string): Buffer {
    const pepper = env.ENCRYPTION_PEPPER;
    return crypto.pbkdf2Sync(pepper, salt, 100000, this.KEY_LENGTH, "sha256");
  }

  /**
   * Encrypt a variable using the user's salt
   */
  static encryptVariable(variable: string, userSalt: string): string {
    try {
      const key = this.deriveKey(userSalt);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(variable, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      const combined =
        "v1:" +
        iv.toString("hex") +
        ":" +
        authTag.toString("hex") +
        ":" +
        encrypted;
      return combined;
    } catch (error) {
      console.log(`${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Encryption failed`);
    }
  }

  /**
   * Decrypt a variable using the user's salt
   */
  static decryptVariable(encryptedData: string, userSalt: string): string {
    try {
      const parts = encryptedData.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
      }

      const iv = Buffer.from(parts[0], "hex");
      const authTag = Buffer.from(parts[1], "hex");
      const encrypted = parts[2];

      const key = this.deriveKey(userSalt);
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.log(`${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Decryption failed`);
    }
  }
}

export class TeamService {
  private teamId: Id<"teams">;
  private callerId: Id<"users">;

  constructor(teamId: Id<"teams">, callerId: Id<"users">) {
    this.teamId = teamId;
    this.callerId = callerId;
  }

  async getUserAndTeam() {
    const teams = await convex
      .query(api.teams.get, { id: this.callerId })
      .catch((e) => {
        throw new Error(
          `Database error, ${e instanceof Error ? e.message : String(e)}`
        );
      });
    const team = teams.find((t) => t._id === this.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    return { userId: team.ownerId, team };
  }

  async createSalt(): Promise<string> {
    // TODO: add a limit on the number of salts per team
    const { userId, team } = await this.getUserAndTeam();
    const existing = await convex.query(api.salts.get, { teamId: team._id });
    if (existing.length > 0) {
      return existing[0].salt;
    }
    const salt = VariableEncryption.generateSalt();
    await convex.mutation(api.salts.create, {
      teamId: team._id,
      salt,
      callerId: userId,
    });
    return salt;
  }

  async getSalt() {
    const { team } = await this.getUserAndTeam();
    const existing = await convex.query(api.salts.get, { teamId: team._id });
    if (existing.length > 0) {
      return existing[0].salt;
    }
    throw new Error("Salt not found");
  }

  async encryptVariable(value: string) {
    const salt = await this.getSalt();
    return VariableEncryption.encryptVariable(value, salt);
  }

  async decryptVariable(encryptedValue: string) {
    const salt = await this.getSalt();
    return VariableEncryption.decryptVariable(encryptedValue, salt);
  }
}

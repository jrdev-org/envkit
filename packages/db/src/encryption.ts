import * as crypto from "node:crypto";
// import { env } from "./env.js";
import { api } from "../convex/_generated/api.js";
import { convex } from "./index.js";
import { type Id } from "../convex/_generated/dataModel.js";

export class VariableEncryption {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 12; // 96 bits
  private static readonly VERSION = "v1";

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
    const pepper = process.env.ENCRYPTION_PEPPER!;
    // OWASP recommends >=310k iterations for PBKDF2 in 2025, adjust as needed
    return crypto.pbkdf2Sync(pepper, salt, 10000, this.KEY_LENGTH, "sha256");
  }

  /**
   * Encrypt a variable using the user's salt
   */
  static encryptVariable(variable: string, userSalt: string): string {
    try {
      const key = this.deriveKey(userSalt);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let ciphertext = cipher.update(variable, "utf8", "hex");
      ciphertext += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      // Canonical format: JSON → base64
      const payload = {
        v: this.VERSION,
        iv: iv.toString("hex"),
        ct: ciphertext,
        tag: authTag.toString("hex"),
      };

      return Buffer.from(JSON.stringify(payload)).toString("base64");
    } catch (error) {
      console.error(
        `Encryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error("Encryption failed");
    }
  }

  /**
   * Decrypt a variable using the user's salt
   */
  static decryptVariable(encodedData: string, userSalt: string): string {
    try {
      // What went wrong:
      // The `encodedData` can be an empty string if a variable was "deleted"
      // by setting its value to an empty string. An empty string is not valid
      // base64 and will cause Buffer.from to return an empty buffer.
      // JSON.parse('') then throws an "Unexpected end of JSON input" error.
      // The fix is to check for an empty or null `encodedData` and return an
      // empty string, which is the logical value for a deleted or empty variable.
      if (!encodedData) {
        return "";
      }
      const decoded = Buffer.from(encodedData, "base64").toString("utf8");
      const payload = JSON.parse(decoded);

      if (!payload.v || payload.v !== this.VERSION) {
        throw new Error("Unsupported encryption version");
      }

      const iv = Buffer.from(payload.iv, "hex");
      const ciphertext = payload.ct;
      const authTag = Buffer.from(payload.tag, "hex");

      const key = this.deriveKey(userSalt);
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error("Decryption failed");
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
    return this.createSalt();
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

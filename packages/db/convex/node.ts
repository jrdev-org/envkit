"use node";

import { v } from "convex/values";
import { action } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { api } from "./_generated/api.js";
import * as crypto from "node:crypto";

type User = {
  id: string;
  salt: string;
};

export class MessageEncryption {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits

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
    return crypto.pbkdf2Sync(
      salt,
      "static-pepper",
      100000,
      this.KEY_LENGTH,
      "sha256"
    );
  }

  /**
   * Encrypt a message using the user's salt
   */
  static encryptMessage(message: string, userSalt: string): string {
    try {
      const key = this.deriveKey(userSalt);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(message, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      const combined =
        iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
      return combined;
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Decrypt a message using the user's salt
   */
  static decryptMessage(encryptedData: string, userSalt: string): string {
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
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export class UserService {
  private users: Map<string, User> = new Map();

  /**
   * Create a new user with a unique salt
   */
  createUser(userId: string): User {
    const user: User = {
      id: userId,
      salt: MessageEncryption.generateSalt(),
    };

    this.users.set(userId, user);
    return user;
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  /**
   * Encrypt a message for a specific user
   */
  encryptUserMessage(userId: string, message: string): string {
    const user = this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return MessageEncryption.encryptMessage(message, user.salt);
  }

  /**
   * Decrypt a message for a specific user
   */
  decryptUserMessage(userId: string, encryptedMessage: string): string {
    const user = this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return MessageEncryption.decryptMessage(encryptedMessage, user.salt);
  }
}

// Actions that call the mutations
export const createTeam = action({
  args: { name: v.string(), ownerId: v.id("users") },
  handler: async (
    ctx,
    args
  ): Promise<{
    _id: Id<"teams">;
    _creationTime: number;
    deletedAt?: number | undefined;
    lastAction?: string | undefined;
    maxMembers?: number | undefined;
    name: string;
    type: "personal" | "organization";
    updatedAt: number;
    ownerId: Id<"users">;
    state: "active" | "deleted" | "suspended" | "full";
  } | null> => {
    // Generate salt in the action
    const userService = new UserService();
    const tempUser = userService.createUser("temp"); // We just need the salt
    const salt = tempUser.salt;

    // Call the mutation with the generated salt
    return await ctx.runMutation(api.teams.create, {
      name: args.name,
      ownerId: args.ownerId,
      salt: salt,
    });
  },
});

export const createUser = action({
  args: { authId: v.string(), name: v.string(), email: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{
    newUserId: Id<"users">;
    newTeamId: Id<"teams">;
  }> => {
    // Generate salt in the action
    const userService = new UserService();
    const tempUser = userService.createUser("temp"); // We just need the salt
    const salt = tempUser.salt;

    // Call the mutation with the generated salt
    return await ctx.runMutation(api.users.create, {
      authId: args.authId,
      name: args.name,
      email: args.email.trim().toLowerCase(),
      salt: salt,
    });
  },
});

export const createVariable = action({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    value: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    activeVars: {
      _id: Id<"variables">;
      _creationTime: number;
      deletedAt?: number | undefined;
      branch?: string | undefined;
      name: string;
      projectId: Id<"projects">;
      value: string;
    }[];
    snapshotId: Id<"projectSnapshots">;
  }> => {
    const { project, teamSalt } = await ctx.runQuery(
      api.projects.getProjectAndTeamSalt,
      {
        projectId: args.projectId,
      }
    );

    if (!project) throw new Error("Project doesn't exist");
    if (!teamSalt) throw new Error("Team salt not found");

    const encrypted = MessageEncryption.encryptMessage(args.value, teamSalt);

    return await ctx.runMutation(api.variables.create, {
      projectId: args.projectId,
      name: args.name,
      encryptedValue: encrypted,
      branch: args.branch,
    });
  },
});

import * as crypto from "crypto";

interface User {
  id: string;
  salt: string; // Store this securely in your database
}

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
  private static deriveKey(
    salt: string,
    pepper: string = process.env.ENCRYPTION_PEPPER || ""
  ): Buffer {
    if (!pepper) {
      throw new Error("Encryption pepper not configured");
    }
    return crypto.pbkdf2Sync(salt, pepper, 600000, this.KEY_LENGTH, "sha256");
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

// Usage example
export class UserService {
  private users: Map<string, User> = new Map();

  /**
   * Create a new user with a unique salt
   */
  createUser(userId: string): User {
    if (this.users.has(userId)) {
      throw new Error(`User ${userId} already exists`);
    }

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

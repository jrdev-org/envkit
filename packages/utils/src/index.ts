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

// Usage example
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

// Example usage
const userService = new UserService();

// Create users
const user1 = userService.createUser("user123");
const user2 = userService.createUser("user456");

console.log("User 1 salt:", user1.salt);
console.log("User 2 salt:", user2.salt);

// Encrypt messages
const message1 = "Hello, this is a secret message!";
const message2 = "Another confidential message.";

const encrypted1 = userService.encryptUserMessage("user123", message1);
const encrypted2 = userService.encryptUserMessage("user456", message2);

console.log("\nEncrypted messages:");
console.log("User 1:", encrypted1);
console.log("User 2:", encrypted2);

// Decrypt messages
const decrypted1 = userService.decryptUserMessage("user123", encrypted1);
const decrypted2 = userService.decryptUserMessage("user456", encrypted2);

console.log("\nDecrypted messages:");
console.log("User 1:", decrypted1);
console.log("User 2:", decrypted2);

// Verify original messages match
console.log("\nVerification:");
console.log("Message 1 matches:", message1 === decrypted1);
console.log("Message 2 matches:", message2 === decrypted2);

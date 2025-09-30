import { describe, it, expect, beforeAll } from "vitest";
import { VariableEncryption } from "../../packages/db/src/encryption";

describe("VariableEncryption", () => {
  beforeAll(() => {
    // Set a dummy encryption pepper for testing purposes
    process.env.ENCRYPTION_PEPPER = "test-pepper";
  });

  it("should encrypt and decrypt a variable successfully", () => {
    const variable = "my-secret-variable";
    const salt = VariableEncryption.generateSalt();

    const encrypted = VariableEncryption.encryptVariable(variable, salt);
    const decrypted = VariableEncryption.decryptVariable(encrypted, salt);

    expect(decrypted).toBe(variable);
  });

  it("should not decrypt with a different salt", () => {
    const variable = "my-secret-variable";
    const salt1 = VariableEncryption.generateSalt();
    const salt2 = VariableEncryption.generateSalt();

    const encrypted = VariableEncryption.encryptVariable(variable, salt1);

    expect(() => VariableEncryption.decryptVariable(encrypted, salt2)).toThrow(
      "Decryption failed"
    );
  });

  it("should generate a random salt", () => {
    const salt1 = VariableEncryption.generateSalt();
    const salt2 = VariableEncryption.generateSalt();
    expect(salt1).not.toBe(salt2);
  });
});

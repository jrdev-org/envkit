import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from "@aws-sdk/client-kms";
import crypto from "crypto";

const kms = new KMSClient({
  region: "REGION"
}); // uses env/aws config

type StoredSecret = {
  ct: string;                // ciphertext (base64)
  iv: string;                // iv (base64)
  tag: string;               // auth tag (base64)
  encryptedDataKey: string;  // encrypted data key (base64) from KMS
  keyId?: string;            // kms key id used (optional)
  alg: "AES-256-GCM";
  createdAt: string;
};

/** Encrypt plaintext using KMS envelope encryption.
 *  - kmsKeyId: the KMS CMK (key ARN or alias) to generate data key
 *  - plaintext: the secret to encrypt
 */
export async function encryptSecret(kmsKeyId: string, plaintext: string): Promise<StoredSecret> {
  // 1) ask KMS for a data key (plaintext + encrypted)
  const genCmd = new GenerateDataKeyCommand({
    KeyId: kmsKeyId,
    KeySpec: "AES_256",
  });
  const genResp = await kms.send(genCmd);
  if (!genResp.Plaintext || !genResp.CiphertextBlob) {
    throw new Error("KMS GenerateDataKey failed to return data key");
  }

  const dataKey = Buffer.from(genResp.Plaintext); // 32 bytes
  try {
    // 2) local AEAD encrypt with AES-256-GCM
    const iv = crypto.randomBytes(12); // 96-bit recommended for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    // 3) return stored object with encrypted data key from KMS
    return {
      ct: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      encryptedDataKey: Buffer.from(genResp.CiphertextBlob).toString("base64"),
      keyId: genResp.KeyId,
      alg: "AES-256-GCM",
      createdAt: new Date().toISOString(),
    };
  } finally {
    // zero plaintext data key from memory
    dataKey.fill(0);
  }
}

/** Decrypt stored secret using KMS to unwrap data key then AES-GCM to decrypt */
export async function decryptSecret(stored: StoredSecret): Promise<string> {
  if (!stored.encryptedDataKey) throw new Error("stored.encryptedDataKey missing");

  // 1) ask KMS to decrypt the encrypted data key
  const encryptedKeyBuf = Buffer.from(stored.encryptedDataKey, "base64");
  const decCmd = new DecryptCommand({
    CiphertextBlob: encryptedKeyBuf,
    // optional EncryptionContext if you used it in GenerateDataKey
  });
  const decResp = await kms.send(decCmd);
  if (!decResp.Plaintext) throw new Error("KMS Decrypt failed");

  const dataKey = Buffer.from(decResp.Plaintext);
  try {
    // 2) decrypt ciphertext with AES-256-GCM
    const iv = Buffer.from(stored.iv, "base64");
    const tag = Buffer.from(stored.tag, "base64");
    const ciphertext = Buffer.from(stored.ct, "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", dataKey, iv);
    decipher.setAuthTag(tag);
    const plaintextBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const plaintext = plaintextBuf.toString("utf8");

    // optional: zero plaintextBuf before returning (Node may copy though)
    plaintextBuf.fill(0);
    return plaintext;
  } finally {
    // zero data key
    dataKey.fill(0);
  }
}

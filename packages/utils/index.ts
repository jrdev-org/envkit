import { encryptSecret, decryptSecret } from "./envlope-kms";

(async () => {
  const kmsKeyId = "arn:aws:kms:us-east-1:123456789012:key/xxxx" // or "alias/my-key"
  const secretPlain = "super-secret-value";

  const stored = await encryptSecret(kmsKeyId, secretPlain);
  // persist `stored` to your DB
  console.log("encrypted value: ", stored);


  const recovered = await decryptSecret(stored);
  console.log(recovered); // "super-secret-value"
})();

/* Notes and best practices (concise):
 - Use an appropriate KMS CMK with least privilege.
 - Consider EncryptionContext in GenerateDataKey/Decrypt to bind key material to metadata.
 - Rotate by re-encrypting DB entries with a new CMK or generate new data keys as needed.
 - Audit KMS calls and restrict which roles/services can call Decrypt.
 - Avoid logging stored.ct / stored.encryptedDataKey / plaintext.
 - If you need deterministic encryption for indexing, use a separate scheme and accept tradeoffs.
*/

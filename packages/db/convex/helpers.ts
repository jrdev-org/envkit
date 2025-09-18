export async function tokenAndHash() {
  // 32 random bytes, hex-encoded
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const token = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // SHA-256 hash of token
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { token, tokenHash };
}

// If you’re using Web Crypto (browser-safe)
export async function hashSHA256Hex(data: string): Promise<string> {
  const input = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest("SHA-256", input);
  const view = new Uint8Array(digest);
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Compute ETAG asynchronously
export async function computeETag(
  vars: Array<{ name: string; value: string }>
): Promise<string> {
  const sorted = vars
    .map((v) => `${v.name}=${v.value}`)
    .sort()
    .join("&");

  // One-shot hash of the concatenated string
  return await hashSHA256Hex(sorted);
}

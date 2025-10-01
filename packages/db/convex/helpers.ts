export async function tokenAndHash(): Promise<{
  token: string;
  tokenHash: string;
}> {
  // 1. Generate random token (base64url-safe)
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  const token = btoa(String.fromCharCode(...Array.from(randomBytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // 2. Compute token hash
  const tokenHash = await getHashFromToken(token);

  return { token, tokenHash };
}

export async function getHashFromToken(token: string): Promise<string> {
  // 1. Decode the token
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // convert ArrayBuffer -> hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return tokenHash;
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
